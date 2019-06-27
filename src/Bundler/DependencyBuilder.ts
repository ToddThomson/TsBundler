import * as ts from "typescript"
import { Ast } from "@TsToolsCommon/Ast/Ast"
import { Logger } from "@TsToolsCommon/Reporting/Logger"
import { Utils } from "@TsToolsCommon/Utils/Utilities"
import { TsCore } from "@TsToolsCommon/Utils/TsCore"
import { ModuleDescriptor } from "./ModuleDescriptor"
import { BundleContainer } from "./ModuleContainer"

export class DependencyBuilder {
    private host: ts.CompilerHost;
    private program: ts.Program;
    private options: ts.CompilerOptions;
    private bundleModuleStack: BundleContainer[] = [];

    // The global scope, top-level bundle
    private globalBundle: BundleContainer;

    constructor( host: ts.CompilerHost, program: ts.Program ) {
        this.host = host;
        this.program = program;
        this.options = this.program.getCompilerOptions();
    }

    /**
     * Returns a chained module container. Each container stores an ordered array of dependencies ( import or exports ) found in the given source file. 
     * @param sourceFile { SourceFile } The input source file used to .
     */
    public getSourceFileDependencies( sourceFile: ts.SourceFile ): BundleContainer {
        const canonicalSourceFileName = this.host.getCanonicalFileName( sourceFile.fileName );

        // Set the initial global ( is this top level ) module container for the input source file.
        this.globalBundle = new BundleContainer( canonicalSourceFileName, sourceFile,  /* isBundleNamespace */ false /* no parent container */ ); 
        this.bundleModuleStack.push( this.globalBundle );
         
        // Walk the module dependency tree
        this.walkModuleDependencies( sourceFile );

        return this.globalBundle;
    }

    private walkModuleDependencies( moduleSourceFile: ts.SourceFile ) {
        var self = this;
        var visitedModulesByContainer: ts.MapLike<boolean>[] = [];
        var visitedModules: ts.MapLike<boolean> = {};
        var moduleDescriptors: ts.MapLike<ModuleDescriptor> = {};

        /**
         * Recursive function used to generate module descriptors for dependencies.
         */
        function visitDependencies( moduleSource: ts.SourceFile, dependencyNodes: ts.Node[] ) {
            
            var isNextContainer = self.isNextContainer( moduleSource );

            if ( isNextContainer ) {
                visitedModulesByContainer.push( visitedModules );
                visitedModules = {};
            }

            // Loop through each dependency node and create a module descriptor for each
            dependencyNodes.forEach( dependencyNode => {
                let dependencySymbol = self.getSymbolFromNode( dependencyNode );
                let dependencySourceFile = self.getSourceFileFromSymbol( dependencySymbol );
                let moduleDescriptor: ModuleDescriptor;

                // TJT: We should look for aliases: import * as alias from moduleSpecifier. Set up a test for this.

                if ( !Utils.hasProperty( moduleDescriptors, dependencySymbol.name ) ) {
                    Logger.trace( "New module descriptor for: ", dependencySymbol.name );
                    let dependencyNodes: ts.Node[] = [];
                    let isBundleModule = false;

                    if ( !dependencySourceFile.isDeclarationFile ) {
                        dependencyNodes = self.getModuleDependencyNodes( dependencySourceFile );

                        // Look for our @bundlemodule annotation specifying an "internal" bundle module.
                        isBundleModule = self.hasModuleAnnotation( dependencySourceFile );
                    }
                    
                    // TJT: Not all args needed. Review before release.
                    moduleDescriptor = new ModuleDescriptor( dependencyNode, dependencyNodes, dependencySourceFile, dependencySymbol, isBundleModule, self.currentContainer() );
                    moduleDescriptors[ dependencySymbol.name ] = moduleDescriptor;
                }
                else {
                    moduleDescriptor = moduleDescriptors[ dependencySymbol.name ];
                }

                // We don't need to walk dependencies within declaration files
                if ( !dependencySourceFile.isDeclarationFile ) {
                    if ( !Utils.hasProperty( visitedModules, dependencySymbol.name ) ) {
                        visitedModules[ dependencySymbol.name ] = true;
                        visitDependencies( dependencySourceFile, moduleDescriptor.getDependencies() );
                    }
                }

                // Update current module container ordered dependencies...                
                if ( dependencySourceFile.isDeclarationFile ) {
                    // All top-level dependency module descriptors are added to the global scoped, top-level bundle container
                    self.globalBundle.addModule( moduleDescriptor, dependencySymbol.name );
                }
                else {
                    // Add the module to the current bundle module container.
                    self.currentContainer().addModule( moduleDescriptor, dependencySymbol.name );
                }
            });

            if ( isNextContainer ) {
                self.restoreContainer();

                visitedModules = visitedModulesByContainer.pop();
            }
        }

        // Start off the dependency building process...
        visitDependencies( moduleSourceFile, this.getModuleDependencyNodes( moduleSourceFile ) );
    }

    private getModuleDependencyNodes( sourceFile: ts.SourceFile ): ts.Node[] {
        // We are only interested in source code files ( not declaration files )
        if ( !Ast.isSourceCodeFile( sourceFile ) ) {
            return [];
        }

        var dependencyNodes: ts.Node[] = [];
        var self = this;
        
        // Search the source file module/node for dependencies...
        function getNodeDependencies( searchNode: ts.Node ) {
            ts.forEachChild( searchNode, node => {
                if ( node.kind === ts.SyntaxKind.ImportDeclaration || 
                     node.kind === ts.SyntaxKind.ImportEqualsDeclaration || 
                     node.kind === ts.SyntaxKind.ExportDeclaration ) {
                    
                    let moduleNameExpr = TsCore.getExternalModuleName( node );

                    if ( moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral ) {
                        let moduleSymbol = self.program.getTypeChecker().getSymbolAtLocation( moduleNameExpr );

                        if ( moduleSymbol ) {
                            dependencyNodes.push( node );
                        }
                    }
                }
                else if ( node.kind === ts.SyntaxKind.ModuleDeclaration ) {
                    // For a namespace ( or module ), traverse the body to locate ES6 module dependencies.
                    // TJT: This section needs to be reviewed. Should namespace/module syntax kinds be scanned or
                    //      Do we only support ES6 import/export syntax, where dependencies must be declared top level?
                    //
                    // NOTES: We will only support ES6 import/export module syntax
                    
                    const moduleDeclaration: ts.ModuleDeclaration = <ts.ModuleDeclaration>node;
                    
                    if ( ( moduleDeclaration.name.kind === ts.SyntaxKind.StringLiteral ) && 
                         ( Ast.getModifierFlagsNoCache( moduleDeclaration ) & ts.ModifierFlags.Ambient || sourceFile.isDeclarationFile ) ) {
                        // An AmbientExternalModuleDeclaration declares an external module.
                        Logger.info( "Scanning for dependencies within ambient module declaration: ", moduleDeclaration.name.text );
                        
                        getNodeDependencies( moduleDeclaration.body );
                    }
                }
            });
        };

        getNodeDependencies( sourceFile );

        return dependencyNodes;
    }

    private hasModuleAnnotation( sourceFile: ts.SourceFile ): boolean {
        // Look for our bundlemodule annotation.
        const sourceText = sourceFile.getFullText();
        const commentRanges = ts.getLeadingCommentRanges( sourceText, 0 );
        
        return Utils.forEach( commentRanges, commentRange => {
            const comment = sourceText.substring( commentRange.pos, commentRange.end );

            return comment.indexOf( "@bundlemodule" ) >= 0;
        });
    }

    private getModuleAnnotationName( sourceFile: ts.SourceFile ): string {
        const bundleModuleNamespaceRegex = /\{(.*?)\}/;
        const sourceText = sourceFile.getFullText();
        const commentRanges = ts.getLeadingCommentRanges( sourceText, 0 );
        
        for ( const commentRange of commentRanges ) {
            const comment = sourceText.substring( commentRange.pos, commentRange.end );

            if ( comment.indexOf( "@bundlemodule" ) >= 0 ) {
                const namespaceNameMatch = bundleModuleNamespaceRegex.exec( comment );
                
                if ( namespaceNameMatch ) {
                    return namespaceNameMatch[0].replace( "{", "" ).replace( "}", "" ).trim();
                }
            }
        }

        return undefined;
    }

    private currentContainer(): BundleContainer {
        return this.bundleModuleStack[ this.bundleModuleStack.length - 1 ];
    }

    private restoreContainer(): BundleContainer {
        return this.bundleModuleStack.pop();
    }

    private isNextContainer( sourceFile: ts.SourceFile ): boolean {
        if ( this.hasModuleAnnotation( sourceFile ) ) {
            var moduleName = this.getModuleAnnotationName( sourceFile );

            // TODO: How to handle missing module name? 
            // 1) Generate an error?
            // 2) Generate a module name from symbol name?
            if ( !moduleName ) {
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

    private isExternalModuleImportEqualsDeclaration( node: ts.Node ) {
        return node.kind === ts.SyntaxKind.ImportEqualsDeclaration && ( <ts.ImportEqualsDeclaration>node ).moduleReference.kind === ts.SyntaxKind.ExternalModuleReference;
    }

    private getExternalModuleImportEqualsDeclarationExpression( node: ts.Node ) {
        return ( <ts.ExternalModuleReference>( <ts.ImportEqualsDeclaration>node ).moduleReference ).expression;
    }

    private getSymbolFromNode( node: ts.Node ): ts.Symbol {
        let moduleNameExpr = TsCore.getExternalModuleName( node );

        if ( moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral ) {
            return this.program.getTypeChecker().getSymbolAtLocation( moduleNameExpr );
        }

        return undefined;
    }

    private getSourceFileFromSymbol( importSymbol: ts.Symbol ): ts.SourceFile {
        let declaration = importSymbol.getDeclarations()[0];

        return declaration.getSourceFile();
    }
}