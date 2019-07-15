import * as ts from "typescript"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"
import { Logger } from "../../../TsToolsCommon/src/Reporting/Logger"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { ModuleDescriptor } from "./ModuleDescriptor"
import { BundleContainer } from "./BundleContainer"

export class DependencyBuilder
{
    private typeChecker: ts.TypeChecker;
    private bundleModuleStack: BundleContainer[] = [];

    // The global scope, top-level bundle
    private globalBundle: BundleContainer;

    constructor( program: ts.Program )
    {
        this.typeChecker = program.getTypeChecker();
    }

    /**
     * Builds an ordered array of dependencies from import and exports declarations
     * from source file parameter.
     * 
     * @param entrySourceFile { SourceFile } The input source file used to construct the bundle container.
     * @returns a linked list of module container.
     */
    public getSourceFileDependencies( entrySourceFile: ts.SourceFile ): BundleContainer
    {
        const canonicalSourceFileName = entrySourceFile.fileName;

        // Set the global module container for the input source file.
        this.globalBundle = new BundleContainer( canonicalSourceFileName, entrySourceFile,  /* isBundleNamespace */ false /* no parent container */ );
        this.bundleModuleStack.push( this.globalBundle );

        // Walk the module dependency tree
        this.walkModuleDependencies( entrySourceFile );

        return this.globalBundle;
    }

    private walkModuleDependencies( moduleSourceFile: ts.SourceFile )
    {
        var visitedModulesByContainer: ts.MapLike<boolean>[] = [];
        var visitedModules: ts.MapLike<boolean> = {};
        var moduleDescriptors: ts.MapLike<ModuleDescriptor> = {};

        /**
         * Recursive function used to generate module descriptors for dependencies.
         */
        const visitDependencies = ( moduleSourceFile: ts.SourceFile, dependencyNodes: ts.Node[] ) =>
        {
            Logger.trace( "visiting dependencies for source file: ", moduleSourceFile.fileName );

            // Look for our @bundlemodule annotation which is the start of an
            // internal bundle container.
            var isNextContainer = this.isNextContainer( moduleSourceFile );

            if ( isNextContainer )
            {
                visitedModulesByContainer.push( visitedModules );
                visitedModules = {};
            }

            // Loop through each dependency node and create a module descriptor for each
            dependencyNodes.forEach( dependencyNode =>
            {
                let moduleDescriptor: ModuleDescriptor;

                let dependencySourceFile = Ast.getSourceFileFromAnyImportExportNode( dependencyNode, this.typeChecker );
                let dependencyFileName = dependencySourceFile.fileName;

                if ( !Utils.hasProperty( moduleDescriptors, dependencyFileName ) )
                {
                    Logger.trace( "Creating new module descriptor for: ", dependencyFileName );

                    let moduleDependencyNodes: ts.Node[] = [];
                    let isBundleModule = false;

                    if ( !dependencySourceFile.isDeclarationFile )
                    {
                        moduleDependencyNodes = this.getModuleDependencyNodes( dependencySourceFile );

                        // Look for our @bundlemodule annotation specifying an "internal" bundle module.
                        isBundleModule = this.hasModuleAnnotation( dependencySourceFile );
                    }

                    moduleDescriptor = new ModuleDescriptor( dependencyNode, moduleDependencyNodes, dependencySourceFile, isBundleModule, this.currentContainer() );
                    moduleDescriptors[dependencyFileName] = moduleDescriptor;
                }
                else
                {
                    moduleDescriptor = moduleDescriptors[dependencyFileName];
                }

                // We don't need to walk dependencies within declaration files
                if ( !dependencySourceFile.isDeclarationFile )
                {
                    if ( !Utils.hasProperty( visitedModules, dependencyFileName ) )
                    {
                        visitedModules[dependencyFileName] = true;
                        visitDependencies( dependencySourceFile, moduleDescriptor.getDependencies() );
                    }
                }

                // Update current module container ordered dependencies...                
                if ( dependencySourceFile.isDeclarationFile )
                {
                    // All top-level dependency module descriptors are added to the global scoped, top-level bundle container
                    this.globalBundle.addModule( moduleDescriptor );//, dependencySymbol.name );
                }
                else
                {
                    // Add the module to the current bundle module container.
                    this.currentContainer().addModule( moduleDescriptor );//, dependencySymbol.name );
                }
            } );

            if ( isNextContainer )
            {
                this.restoreContainer();

                visitedModules = visitedModulesByContainer.pop();
            }
        }

        // Start off the dependency building process...
        visitDependencies( moduleSourceFile, this.getModuleDependencyNodes( moduleSourceFile ) );
    }

    private getModuleDependencyNodes( sourceFile: ts.SourceFile ): ts.Node[]
    {
        // We are only interested in source code files ( not declaration files )
        if ( !Ast.isSourceCodeFile( sourceFile ) )
        {
            return [];
        }

        Logger.trace( "Getting dependency nodes for source file: ", sourceFile.fileName );

        var dependencyNodes: ts.Node[] = [];

        // Search the source file module/node for import or export dependencies...
        const getModuleDependencies = ( moduleNode: ts.Node ) =>
        {
            ts.forEachChild( moduleNode, node =>
            {
                if ( Ast.isAnyImportOrExport( node ) )
                {
                    // Get the import/export module name.
                    let moduleName = Ast.getExternalModuleName( node );

                    if ( moduleName && moduleName.kind === ts.SyntaxKind.StringLiteral )
                    {
                        // Add dependency node if it references an external module.
                        let moduleSymbol = this.typeChecker.getSymbolAtLocation( moduleName );

                        if ( moduleSymbol )
                        {
                            dependencyNodes.push( node );
                        }
                    }
                }
                else if ( node.kind === ts.SyntaxKind.ModuleDeclaration )
                {
                    // For a namespace ( module declaration ), traverse the body to locate ES6 module dependencies.

                    // TJT: This section needs to be reviewed.
                    
                    // Should namespace / module syntax kinds be scanned or
                    // Do we only support ES6 import/export syntax, where dependencie
                    // must be declared top level?
                    //
                    // NOTES: We will only support ES6 import/export module syntax

                    const moduleDeclaration: ts.ModuleDeclaration = <ts.ModuleDeclaration>node;

                    if ( ( moduleDeclaration.name.kind === ts.SyntaxKind.StringLiteral ) &&
                        ( Ast.getModifierFlagsNoCache( moduleDeclaration ) & ts.ModifierFlags.Ambient || sourceFile.isDeclarationFile ) )
                    {
                        // An AmbientExternalModuleDeclaration declares an external module.
                        Logger.info( "Scanning for dependencies within ambient module declaration: ", moduleDeclaration.name.text );

                        getModuleDependencies( moduleDeclaration.body );
                    }
                }
            } );
        };

        getModuleDependencies( sourceFile );

        return dependencyNodes;
    }

    private hasModuleAnnotation( sourceFile: ts.SourceFile ): boolean
    {
        // Look for our bundlemodule annotation.
        const sourceText = sourceFile.getFullText();
        const commentRanges = ts.getLeadingCommentRanges( sourceText, 0 );

        return Utils.forEach( commentRanges, commentRange =>
        {
            const comment = sourceText.substring( commentRange.pos, commentRange.end );

            return comment.indexOf( "@bundlemodule" ) >= 0;
        } );
    }

    private getModuleAnnotationName( sourceFile: ts.SourceFile ): string
    {
        const bundleModuleNamespaceRegex = /\{(.*?)\}/;
        const sourceText = sourceFile.getFullText();
        const commentRanges = ts.getLeadingCommentRanges( sourceText, 0 );

        for ( const commentRange of commentRanges )
        {
            const comment = sourceText.substring( commentRange.pos, commentRange.end );

            if ( comment.indexOf( "@bundlemodule" ) >= 0 )
            {
                const namespaceNameMatch = bundleModuleNamespaceRegex.exec( comment );

                if ( namespaceNameMatch )
                {
                    return namespaceNameMatch[0].replace( "{", "" ).replace( "}", "" ).trim();
                }
            }
        }

        return undefined;
    }

    private currentContainer(): BundleContainer
    {
        return this.bundleModuleStack[this.bundleModuleStack.length - 1];
    }

    private restoreContainer(): BundleContainer
    {
        return this.bundleModuleStack.pop();
    }

    private isNextContainer( sourceFile: ts.SourceFile ): boolean
    {
        if ( this.hasModuleAnnotation( sourceFile ) )
        {
            var moduleName = this.getModuleAnnotationName( sourceFile );

            // TODO: How to handle missing module name? 
            // 1) Generate an error?
            // 2) Generate a module name from symbol name?
            if ( !moduleName )
            {
                moduleName = "missing_module_name";
            }

            let nextModule = new BundleContainer( moduleName, sourceFile, true, this.currentContainer() );

            // Before changing the current container we must first add the new container to the children of the current container.
            let currentModule = this.currentContainer();

            // Add new container context to the exising current container
            currentModule.addChild( nextModule );

            this.bundleModuleStack.push( nextModule );

            return true;
        }

        return false;
    }
}