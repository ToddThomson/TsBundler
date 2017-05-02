import { StatisticsReporter } from "../Reporting/StatisticsReporter"
import { Logger } from "../Reporting/Logger"
import { Bundle } from "./Bundle"
import { BundleParser } from "./BundleParser"
import { BundlePackage } from "./BundlePackage"
import { PackageType } from "./PackageType"
import { BundlerOptions } from "./BundlerOptions"
import { BundleBuildResult } from "./BundleBuildResult"
import { DependencyBuilder } from "./DependencyBuilder"
import { ModuleDescriptor } from "./ModuleDescriptor"
import { ModuleContainer } from "./ModuleContainer"
import { Glob } from "../Utils/Glob"
import { Utils } from "../Utils/Utilities"
import { TsCore } from "../Utils/TsCore"
import { Ast } from "../Ast/Ast"

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export class BundleBuilder {

    private bundle: Bundle;
    private options: BundlerOptions;

    private host: ts.CompilerHost;
    private program: ts.Program;

    private dependencyTime = 0;
    private dependencyWalkTime = 0;
    private emitTime = 0;
    private buildTime = 0;

    private bundleCodeText: string = "";
    private bundleImportText: string = "";

    private bundleImportedFiles: ts.MapLike<string> = {};
    private bundleModuleImports: ts.MapLike<ts.MapLike<string>> = {};
    private bundleSourceFiles: ts.MapLike<string> = {};

    constructor( host: ts.CompilerHost, program: ts.Program, bundlerOptions: BundlerOptions ) {
        this.host = host
        this.program = program;
        this.options = bundlerOptions;
    }

    public build( bundle: Bundle ): BundleBuildResult {
        this.bundle = bundle;
        this.buildTime = new Date().getTime();

        let dependencyBuilder = new DependencyBuilder( this.host, this.program );

        // Construct bundle output file name
        let bundleBaseDir = path.dirname( bundle.name );

        if ( bundle.config.outDir ) {
            bundleBaseDir = path.join( bundleBaseDir, bundle.config.outDir );
        }

        let bundleFilePath = path.join( bundleBaseDir, path.basename( bundle.name ) );
        bundleFilePath = TsCore.normalizeSlashes( bundleFilePath );

        this.bundleCodeText = "";
        this.bundleImportText = "";

        this.bundleImportedFiles = {};
        this.bundleModuleImports = {};
        this.bundleSourceFiles = {};

        // Look for tsx source files in bundle name or bundle dependencies.
        // Output tsx for bundle extension if typescript react files found.

        var isBundleTsx = false;

        let allDependencies: ModuleDescriptor[] = [];

        for ( var filesKey in bundle.fileNames ) {
            let fileName = bundle.fileNames[filesKey];
            Logger.info( ">>> Processing bundle entry input file:", fileName );

            let bundleSourceFileName = this.host.getCanonicalFileName( TsCore.normalizeSlashes( fileName ) );
            Logger.info( "BundleSourceFileName:", bundleSourceFileName );

            let bundleSourceFile = this.program.getSourceFile( bundleSourceFileName );

            if ( !bundleSourceFile ) {
                let diagnostic = TsCore.createDiagnostic( { code: 6060, category: ts.DiagnosticCategory.Error, key: "Bundle_source_file_0_not_found_6060", message: "Bundle source file '{0}' not found." }, bundleSourceFileName );

                return new BundleBuildResult( [diagnostic] );
            }

            // Check for TSX
            if ( bundleSourceFile.languageVariant == ts.LanguageVariant.JSX ) {
                isBundleTsx = true;
            }
           
            let startTime = new Date().getTime();

            // Get bundle source file module dependencies...
            let bundleModuleContainer = dependencyBuilder.getSourceFileDependencies( bundleSourceFile );
            
            // Create a dependencies lookup map
            //const bundleDependenciesLookup: ts.MapLike<ModuleDescriptor> = {};
                
            //for ( var i = 0, len = bundleModuleContainer.getModules().length; i < len; i++ ) {
            //    bundleDependenciesLookup[ bundleModuleContainer.getModules()[ i ].getFileName() ] = bundleModuleContainer.getModules()[ i ];
            //}

            this.dependencyTime += new Date().getTime() - startTime;

            // Merge current bundle file dependencies into all dependencies
            // TJT: FIXME!

            //for ( var mergeKey in moduleDependencies ) {
            //    if ( !Utils.hasProperty( allDependencies, mergeKey ) ) {
            //        allDependencies[ mergeKey ] = moduleDependencies[ mergeKey ];
            //    }
            //}

            startTime = new Date().getTime();
            
            Logger.info( "Traversing dependencies for bundle: ", bundleSourceFile.fileName );
            
            this.processModuleContainer( bundleModuleContainer );

            for ( var childContainer of bundleModuleContainer.getChildren() ) {
                this.processModuleContainer( childContainer );
            }

            // Finally, add bundle source file
            this.addSourceFile( bundleSourceFile );

            this.dependencyWalkTime += new Date().getTime() - startTime;
        }

        // The text for our bundle is the concatenation of import source file text
        let bundleText = this.bundleImportText;

        if ( bundle.config.package.getPackageType() === PackageType.Library ) {
            // Wrap the bundle in an exported namespace with the bundle name
            bundleText += "export namespace " + bundle.config.package.getPackageNamespace() + " {\r\n";
            bundleText += this.bundleCodeText;
            bundleText += " \r\n}";
        }
        else {
            bundleText += this.bundleCodeText;
        }

        var bundleExtension = isBundleTsx ? ".tsx" : ".ts";
        var bundleFile = { path: bundleFilePath + bundleExtension, extension: bundleExtension, text: bundleText };

        this.buildTime = new Date().getTime() - this.buildTime;

        if ( this.options.verbose ) {
            this.reportStatistics();
        }

        return new BundleBuildResult( [], bundleFile );
    }

    private processModuleContainer( moduleContainer: ModuleContainer ) {
        const isGeneratedNamespace = moduleContainer.isGeneratedNamespace();
        
        if ( isGeneratedNamespace ) {
            // Wrap the bundle module container in an exported namespace with the bundle name
            this.bundleCodeText += "export namespace " + moduleContainer.getName() + " {\r\n";
        }

        var t = moduleContainer.getModules();

        for ( var moduleDescriptor of moduleContainer.getModules() ) {
            Logger.info( "Walking dependency nodes for module: ", moduleDescriptor.getFileName() );

            //var moduleDependencyNodes = moduleDesciptor.getDependencies();

            var moduleDependencyNode = moduleDescriptor.getNode();
            
            //forEach( moduleDependencyNode => {
            //var dependencySymbol = this.getSymbolFromNode( moduleDependencyNode );
                
            var dependencyFile = moduleDescriptor.getSourceFile();// TsCore.getSourceFileFromSymbol( dependencySymbol );

            if ( !dependencyFile.isDeclarationFile ) {
                let dependencyFileName = this.host.getCanonicalFileName( dependencyFile.fileName );
                let dependencyNodes = undefined; //bundleDependenciesLookup[ moduleDependencies.getFileName() ].nodes;

                if ( dependencyNodes ) {
                    this.processModuleDependencies( moduleDependencyNode, dependencyNodes );
                }

                if ( !Utils.hasProperty( this.bundleImportedFiles, dependencyFileName ) ) {
                    this.addSourceFile( dependencyFile );
                }
            }
            else {
                if ( moduleDependencyNode.kind === ts.SyntaxKind.ImportEqualsDeclaration ) {
                    // For ImportEqualsDeclarations we emit the import declaration
                    // if it hasn't already been added to the bundle.

                    // Get the import and module names
                    let importName = ( <ts.ImportEqualsDeclaration>moduleDependencyNode ).name.text;
                    var moduleName = this.getImportModuleName( <ts.ImportEqualsDeclaration>moduleDependencyNode );

                    if ( this.addModuleImport( moduleName, importName ) ) {
                        this.emitModuleImportDeclaration( moduleDependencyNode.getText() );
                    }
                }
                else {
                    // ImportDeclaration kind..
                    if ( moduleDependencyNode.kind === ts.SyntaxKind.ImportDeclaration ) {
                        this.writeImportDeclaration( <ts.ImportDeclaration>moduleDependencyNode );
                    }
                }
            }
            //});
        }

        if ( isGeneratedNamespace ) {
            // Close the bundle module container
            this.bundleCodeText += " \r\n}";
        }
    }

    private processModuleDependencies( moduleDependencyNode: ts.Node, dependencyNodes: ts.Node[] ) {
        for ( var dependencyNode of dependencyNodes ) {
            var dependencySymbol = this.getSymbolFromNode( dependencyNode );
            var dependencyFile = TsCore.getSourceFileFromSymbol( dependencySymbol );

            if ( dependencyFile && !dependencyFile.isDeclarationFile ) {
                let dependencyFileName = this.host.getCanonicalFileName( dependencyFile.fileName );

                if ( dependencyNode.kind === ts.SyntaxKind.ImportDeclaration ) {
                    let dependencyBindings = this.getNamedBindingsFromImport( <ts.ImportDeclaration>dependencyNode );
                
                    if ( this.isInheritedBinding( moduleDependencyNode, dependencyBindings ) ) {
                        // Add the dependency file to the bundle now if it is required for inheritance. 
                        if ( !Utils.hasProperty( this.bundleImportedFiles, dependencyFileName ) ) {
                            this.addSourceFile( dependencyFile );
                        }
                    }
                }
            }
        }
    }

    private isInheritedBinding( dependencyNode: ts.Node, namedBindings: string[] ): boolean {
        const typeChecker = this.program.getTypeChecker();
        
        var dependencySymbol = this.getSymbolFromNode( dependencyNode );

        if ( dependencySymbol ) {
            var exports = typeChecker.getExportsOfModule( dependencySymbol );

            if ( exports ) {
                for ( const exportedSymbol of exports ) {
                    const exportType: ts.Type = typeChecker.getDeclaredTypeOfSymbol( exportedSymbol );

                    if ( exportType && 
                        ( exportType.flags & ts.TypeFlags.Object ) && 
                        ( (<ts.ObjectType>exportType).objectFlags & ( ts.ObjectFlags.Class | ts.ObjectFlags.Interface ) )  ){
                        const baseTypes = typeChecker.getBaseTypes( <ts.InterfaceType>exportType );

                        for ( var baseType of baseTypes ) {
                            var baseTypeName = baseType.symbol.getName();

                            if ( namedBindings.indexOf( baseTypeName ) >= 0 ) {
                                Logger.info( "Base class inheritance found", baseTypeName );
                                return true;
                            }
                        }
                    }
                }
            }
        }

        return false;
    }

    private getImportModuleName( node: ts.ImportEqualsDeclaration ): string {

        if ( node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference ) {
            let moduleReference = ( <ts.ExternalModuleReference>node.moduleReference );
            return ( <ts.LiteralExpression>moduleReference.expression ).text;
        }
        else {
            // TJT: This code should never be hit as we currently do not process dependencies of this kind. 
            return ( <ts.EntityName>node.moduleReference ).getText();
        }
    }

    private addModuleImport( moduleName: string, importName: string ): boolean {

        if ( !Utils.hasProperty( this.bundleModuleImports, moduleName ) ) {
            this.bundleModuleImports[ moduleName ] = {};
        }

        var moduleImports = this.bundleModuleImports[ moduleName ];

        if ( !Utils.hasProperty( moduleImports, importName ) ) {
            moduleImports[ importName ] = importName;

            return true;
        }

        return false;
    }

    private writeImportDeclaration( node: ts.ImportDeclaration ) {

        if ( !node.importClause ) {
            return;
        }

        let moduleName = ( <ts.LiteralExpression>node.moduleSpecifier ).text;

        var importToWrite = "import ";
        var hasDefaultBinding = false;
        var hasNamedBindings = false;

        if ( node.importClause ) {
            if ( node.importClause.name && this.addModuleImport( moduleName, node.importClause.name.text ) ) {
                importToWrite += node.importClause.name.text;
                hasDefaultBinding = true;
            }
        }

        if ( node.importClause.namedBindings ) {
            if ( node.importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport ) {
                if ( this.addModuleImport( moduleName, ( <ts.NamespaceImport>node.importClause.namedBindings ).name.text ) ) {
                    if ( hasDefaultBinding ) {
                        importToWrite += ", ";
                    }

                    importToWrite += "* as ";
                    importToWrite += ( <ts.NamespaceImport>node.importClause.namedBindings ).name.text;

                    hasNamedBindings = true;
                }
            }
            else {
                if ( hasDefaultBinding ) {
                    importToWrite += ", ";
                }

                importToWrite += "{ ";

                Utils.forEach(( <ts.NamedImports>node.importClause.namedBindings ).elements, element => {
                    if ( this.addModuleImport( moduleName, element.name.text ) ) {
                        if ( !hasNamedBindings ) {
                            hasNamedBindings = true;
                        }
                        else {
                            importToWrite += ", ";
                        }

                        let alias = element.propertyName;

                        if ( alias ) {
                            importToWrite += alias.text + " as " + element.name.text;
                        }
                        else {
                            importToWrite += element.name.text;
                        }
                    }
                });

                importToWrite += " }";
            }
        }

        importToWrite += " from ";
        importToWrite += node.moduleSpecifier.getText();
        importToWrite += ";";

        if ( hasDefaultBinding || hasNamedBindings ) {
            this.emitModuleImportDeclaration( importToWrite );
        }
    }

    private processImportExports( file: ts.SourceFile ): string {
        Logger.info( "Processing import statements and export declarations in file: ", file.fileName );
        let editText = file.text;

        ts.forEachChild( file, node => {
            if ( node.kind === ts.SyntaxKind.ImportDeclaration || node.kind === ts.SyntaxKind.ImportEqualsDeclaration || node.kind === ts.SyntaxKind.ExportDeclaration ) {
                let moduleNameExpression = TsCore.getExternalModuleName( node );

                if ( moduleNameExpression && moduleNameExpression.kind === ts.SyntaxKind.StringLiteral ) {

                    let moduleSymbol = this.program.getTypeChecker().getSymbolAtLocation( moduleNameExpression );

                    if ( ( moduleSymbol ) && ( Ast.isSourceCodeModule( moduleSymbol ) || Ast.isAmbientModule ) ) {
                        editText = this.whiteOut( node.pos, node.end, editText );
                    }
                }
            }
            else {
                if ( this.bundle.config.package.getPackageType() === PackageType.Component ) {
                    if ( node.kind === ts.SyntaxKind.ModuleDeclaration ) {

                        let module = <ts.ModuleDeclaration>node;

                        if ( module.name.getText() !== this.bundle.config.package.getPackageNamespace() ) {
                            if ( module.flags & ts.NodeFlags.ExportContext ) {
                                Logger.info( "Component bundle. Module name != package namespace. Removing export modifier." );
                                let nodeModifier = module.modifiers[0];
                                editText = this.whiteOut( nodeModifier.pos, nodeModifier.end, editText );
                            }
                        }
                    }
                    else {
                        if ( node.flags & ts.NodeFlags.ExportContext ) {
                            Logger.info( "Removing export modifier for non module declaration." );
                            let exportModifier = node.modifiers[0];
                            editText = this.whiteOut( exportModifier.pos, exportModifier.end, editText );
                        }
                    }
                }
            }
        });

        return editText;
    }

    private whiteOut( pos: number, end: number, text: string ): string {
        let length = end - pos;
        let whiteSpace = "";

        for ( var i = 0; i < length; i++ ) {
            whiteSpace += " ";
        }

        var prefix = text.substring( 0, pos );
        var suffix = text.substring( end );

        return prefix + whiteSpace + suffix;
    }

    private emitModuleImportDeclaration( moduleBlockText: string ) {
        Logger.info( "Entering emitModuleImportDeclaration()" );

        this.bundleImportText += moduleBlockText + "\n";
    }

    private addSourceFile( file: ts.SourceFile ) {
        Logger.info( "Entering addSourceFile() with: ", file.fileName );

        if ( Ast.isSourceCodeFile( file ) ) {
            // Before adding the source text, we must white out non-external import statements and
            // white out export modifiers where applicable
            let editText = this.processImportExports( file );

            this.bundleCodeText += editText + "\n";

            let sourceFileName = this.host.getCanonicalFileName( file.fileName );
            this.bundleImportedFiles[ sourceFileName ] = sourceFileName;
        }
        else {
            // Add typescript definition files to the build source files context
            if ( !Utils.hasProperty( this.bundleSourceFiles, file.fileName ) ) {
                Logger.info( "Adding definition file to bundle source context: ", file.fileName );
                this.bundleSourceFiles[ file.fileName ] = file.text;
            }
        }
    }

    private hasNamespaceAnnotation( symbol: ts.Symbol ) {
        // Scan through the symbol documentation for our @bundlenamespace annotation
        const comments: ts.SymbolDisplayPart[] = symbol.getDocumentationComment();

        return Utils.forEach( comments, ( comment: ts.SymbolDisplayPart ) => {
            return comment.text.indexOf("@bundlemodule") >= 0;
        });
    }
    
    // TJT: Review duplicate code. Move to TsCore pass program as arg.
    private getSymbolFromNode( node: ts.Node ): ts.Symbol {
        let moduleNameExpr = TsCore.getExternalModuleName( node );

        if ( moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral ) {
            return this.program.getTypeChecker().getSymbolAtLocation( moduleNameExpr );
        }

        return undefined;
    }

    private getNamedBindingsFromImport( node: ts.ImportDeclaration ): string[] {
        
        const bindingNames: string[] = [];

        if ( ( node.kind === ts.SyntaxKind.ImportDeclaration ) && node.importClause.namedBindings ) {
            const namedBindings = node.importClause.namedBindings;

            switch ( namedBindings.kind ) {
                case ts.SyntaxKind.NamespaceImport:
                    break;

                case ts.SyntaxKind.NamedImports:
                    for ( const importBinding of (<ts.NamedImports>namedBindings).elements) {
                        bindingNames.push( importBinding.getText() );
                    }

                    break;
            }
        }

        return bindingNames;
    }

    private reportStatistics() {
        let statisticsReporter = new StatisticsReporter();

        statisticsReporter.reportTime( "Deps gen time", this.dependencyTime );
        statisticsReporter.reportTime( "Deps walk time", this.dependencyWalkTime );
        statisticsReporter.reportTime( "Source gen time", this.buildTime );
    }
}