import * as ts from "typescript"
import * as path from "path"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"
import { Logger } from "../../../TsToolsCommon/src/Reporting/Logger"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { Module } from "./Module"
import { ModuleContainer } from "./ModuleContainer"

export class DependencyBuilder
{
    private typeChecker: ts.TypeChecker;
    private moduleContainerStack: ModuleContainer[] = [];

    // The global scope, top-level module container
    private globalModuleContainer: ModuleContainer;

    constructor( program: ts.Program )
    {
        this.typeChecker = program.getTypeChecker();
    }

    /**
     * Builds an ordered array of dependencies from import and exports declarations
     * from source file parameter.
     * 
     * @param entrySourceFile { SourceFile } The input source file used to construct the module container.
     * @returns a linked list of module container.
     */
    public getSourceFileDependencies( entrySourceFile: ts.SourceFile ): ModuleContainer
    {
        const containerName = path.basename( entrySourceFile.fileName, path.extname( entrySourceFile.fileName ) );

        let entrySourceFileDependencies = this.getDependenciesFromSourceFile( entrySourceFile );
        let entryModule = new Module( entrySourceFile, entrySourceFileDependencies, undefined );

        // Set the global module container for the input source file.
        this.globalModuleContainer = new ModuleContainer( containerName, entryModule,  /* isBundleNamespace */ false /* no parent container */ );
        this.moduleContainerStack.push( this.globalModuleContainer );

        // Walk the module dependency tree...
        this.walkEntryPointDependencies( entryModule);

        return this.globalModuleContainer;
    }

    private walkEntryPointDependencies( entryPoint: Module )
    {
        var visitedModulesByContainer: ts.MapLike<boolean>[] = [];

        var visitedModules: ts.MapLike<boolean> = {};
        var modules: ts.MapLike<Module> = {};

        /**
         * Recursive function used to generate dependencies for any import or export
         * declaration nodes.
         */
        const visitModuleDependencies = ( module: Module) =>
        {
            Logger.trace( "visiting dependencies for module: ", module.getSourceFile().fileName );

            // Look for our @bundlemodule annotation which is the start of an
            // internal module container.
            var isNextContainer = this.isNextContainer( module.getSourceFile() );

            if ( isNextContainer )
            {
                visitedModulesByContainer.push( visitedModules );
                visitedModules = {};
            }
            
            // Loop through each source file dependency node and create a 
            // Module for each new module reference.
            let moduleDependencies = module.getDependencies();

            moduleDependencies.forEach( moduleDependency =>
            {
                let module: Module;
                let dependencySourceFile = Ast.getSourceFileFromAnyImportExportNode( moduleDependency, this.typeChecker );

                if ( dependencySourceFile )
                {
                    let dependencyFileName = dependencySourceFile.fileName;

                    if ( !Utils.hasProperty( modules, dependencyFileName ) )
                    {
                        Logger.trace( "Creating new module for source file: ", dependencyFileName );
                        let dependencyNodes: Ast.AnyImportOrExport[] = [];

                        if ( !dependencySourceFile.isDeclarationFile )
                        {
                            dependencyNodes = this.getDependenciesFromSourceFile( dependencySourceFile );
                        }

                        module = new Module( dependencySourceFile, dependencyNodes, moduleDependency,  );
                        modules[dependencyFileName] = module;
                    }
                    else
                    {
                        module = modules[dependencyFileName];
                    }

                    // We don't walk dependencies within declaration files
                    if ( !dependencySourceFile.isDeclarationFile )
                    {
                        if ( !Utils.hasProperty( visitedModules, dependencyFileName ) )
                        {
                            visitedModules[dependencyFileName] = true;
                            visitModuleDependencies( module );

                            this.currentContainer().addModule( module );
                        }
                    }
                }
            } );

            if ( isNextContainer )
            {
                this.restoreContainer();

                visitedModules = visitedModulesByContainer.pop();
            }
        }

        // Start off the dependency building process...
        visitModuleDependencies( entryPoint );
    }

    /**
     * gets the import and export declarations from the sourceFile parameter.
     * 
     * @param sourceFile The source file to scan
     * @returns An array of AnyImportEport nodes
     */
    private getDependenciesFromSourceFile( sourceFile: ts.SourceFile ): Ast.AnyImportOrExport[]
    {
        // We are only interested in source code files ( not declaration files )
        if ( !Ast.isSourceCodeFile( sourceFile ) )
        {
            return [];
        }

        Logger.trace( "Getting dependency nodes for source file: ", sourceFile.fileName );

        var dependencies: Ast.AnyImportOrExport[] = [];

        // Search the source file or module body for any import or export declarations
        const getModuleDependencies = ( module: ts.SourceFile | ts.ModuleBody ) =>
        {
            ts.forEachChild( module, node =>
            {
                if ( Ast.isAnyImportOrExport( node ) )
                {
                    dependencies.push( node );
                }
            } );
        };

        getModuleDependencies( sourceFile );

        return dependencies;
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

    private currentContainer(): ModuleContainer
    {
        return this.moduleContainerStack[this.moduleContainerStack.length - 1];
    }

    private restoreContainer(): ModuleContainer
    {
        return this.moduleContainerStack.pop();
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

            let entrySourceFileDependencies = this.getDependenciesFromSourceFile( sourceFile );
            let entryModule = new Module( sourceFile, entrySourceFileDependencies, undefined );


            let nextModule = new ModuleContainer( moduleName, entryModule, true, this.currentContainer() );

            // Before changing the current container we must first add the new container to the children of the current container.
            let currentModule = this.currentContainer();

            // Add new container context to the exising current container
            currentModule.addChild( nextModule );

            this.moduleContainerStack.push( nextModule );

            return true;
        }

        return false;
    }
}