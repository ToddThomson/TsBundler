import * as ts from "typescript"
import { Bundle } from "./Bundle"
import { BundleConfigParser } from "./BundlerConfigParser"
import { BundlePackage } from "./BundlePackage"
import { PackageType } from "./PackageType"
import { ImportCollection } from "./ImportCollection"
import { ImportEqualsCollection } from "./ImportEqualsCollection"
import { BundlerOptions } from "./BundlerOptions"
import { BundleBuildResult } from "./BundleBuildResult"
import { DependencyBuilder } from "./DependencyBuilder"
import { BundleContainer } from "./BundleContainer"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers";
import { Logger } from "../../../TsToolsCommon/src/Reporting/Logger"
import { BundleConfig } from "./BundleConfig";

export class BundleBuilder
{
    private bundle: Bundle;
    private bundleConfig: BundleConfig = {};
    private options: BundlerOptions;

    private program: ts.Program;
    private typeChecker: ts.TypeChecker;
    private context: ts.TransformationContext;

    private sourceFile: ts.SourceFile;
    private bundleSourceFile: ts.SourceFile;

    private bundleFilesAdded: ts.MapLike<boolean> = {};
    private bundleSourceFiles: ts.SourceFile[] = [];

    private bundleImports: ImportCollection;
    private bundleImportEquals: ImportEqualsCollection;

    constructor( program: ts.Program, bundlerOptions: BundlerOptions )
    {
        this.program = program;
        this.typeChecker = program.getTypeChecker();
        this.options = bundlerOptions;
        this.bundleImports = new ImportCollection();
        this.bundleImportEquals = new ImportEqualsCollection();
    }

    public transform( entrySourceFile: ts.SourceFile, context: ts.TransformationContext ): ts.SourceFile
    {
        Logger.setLevel( 4 );

        this.sourceFile = entrySourceFile;
        this.context = context;

        return this.buildBundle();
    }

    private buildBundle(): ts.SourceFile
    {
        const dependencyBuilder = new DependencyBuilder( this.program );

        // TJT: Poor naming.
        let bundleContainer = dependencyBuilder.getSourceFileDependencies( this.sourceFile );

        Logger.info( "Traversing dependencies for bundle: ", bundleContainer.getFileName() );
        this.processBundleContainer( bundleContainer );

        for ( var childContainer of bundleContainer.getChildren() )
        {
            this.processBundleContainer( childContainer );
        }

        return this.generateBundleSourceFile();

        //if ( bundle.config.package.getPackageType() === PackageType.Library ) {
        //    // Wrap the bundle in an exported namespace with the bundle name
        //    bundleText += "export namespace " + bundle.config.package.getPackageNamespace() + " {\r\n";
        //    bundleText += this.bundleCodeText;
        //    bundleText += " \r\n}";
        //}

        //var bundleExtension = ".ts"; //isBundleTsx ? ".tsx" : ".ts";
        //var bundleText = ""; // Fixme:
        //var bundleFile = { path: "bundle" + bundleExtension, extension: bundleExtension, text: bundleText };

        //return new BundleBuildResult( [], bundleFile );
    }

    private processBundleContainer( bundleContainer: BundleContainer )
    {
        for ( var moduleDescriptor of bundleContainer.getModules() )
        {
            Logger.info( "Processing dependency module: ", moduleDescriptor.getFileName() )

            var moduleDependencyNode = moduleDescriptor.getNode();
            var moduleSourceFile = moduleDescriptor.getSourceFile();

            if ( !moduleSourceFile.isDeclarationFile )
            {
                let moduleDependencies = moduleDescriptor.getDependencies();

                for ( var dependencyNode of moduleDependencies )
                {
                    var dependencySourceFile = Ast.getSourceFileFromAnyImportExportNode( dependencyNode, this.typeChecker );

                    if ( dependencySourceFile && !dependencySourceFile.isDeclarationFile )
                    {
                        const dependencyFileName = dependencySourceFile.fileName;
                        
                        if ( !Utils.hasProperty( this.bundleFilesAdded, dependencyFileName ) )
                        {
                            this.bundleFilesAdded[dependencyFileName] = true;
                            this.bundleSourceFiles.push( dependencySourceFile );
                        }
                    }
                }
            }
            else
            {
                // The module source file is a DeclarationFile...

                if ( moduleDependencyNode.kind === ts.SyntaxKind.ImportEqualsDeclaration )
                {
                    this.bundleImportEquals.add( moduleDependencyNode as ts.ImportEqualsDeclaration );
                }
                else
                {
                    // Should aways be ImportDeclaration kind..
                    if ( moduleDependencyNode.kind === ts.SyntaxKind.ImportDeclaration )
                    {
                        this.bundleImports.add( <ts.ImportDeclaration>moduleDependencyNode );
                    }
                }
            }
        }

        const isGeneratedNamespace = bundleContainer.isInternal();
        if ( isGeneratedNamespace )
        {
            // TODO: addExportNamespace block

            // The module container was created from the bundle annotation.
            // Wrap the bundle module container in an exported namespace with the bundle name
            //this.bundleCodeText += "export namespace " + bundleContainer.getName() + " {\r\n";
        }
    }

    private checkModuleInheritance( moduleDependencyNode: ts.Node, dependencyNodes: ts.Node[] )
    {
        // TJT: Named bindings of imports must be part of dependency builder!

        for ( var dependencyNode of dependencyNodes )
        {
            var dependencySymbol = this.getSymbolFromNode( dependencyNode );
            var dependencyFile = Ast.getSourceFileFromSymbol( dependencySymbol );

            if ( dependencyFile && !dependencyFile.isDeclarationFile )
            {
                let dependencyFileName = dependencyFile.fileName;

                if ( dependencyNode.kind === ts.SyntaxKind.ImportDeclaration )
                {
                    let dependencyBindings = this.getNamedBindingsFromImport( <ts.ImportDeclaration>dependencyNode );

                    if ( dependencyBindings && this.isInheritedBinding( moduleDependencyNode, dependencyBindings ) )
                    {
                        // Add the dependency file to the bundle now if it is required for inheritance. 
                        if ( !Utils.hasProperty( this.bundleFilesAdded, dependencyFileName ) )
                        {
                            this.bundleFilesAdded[dependencyFileName] = true;
                            this.bundleSourceFiles.push( dependencyFile );
                        }
                    }
                }
            }
        }
    }

    private isInheritedBinding( dependencyNode: ts.Node, namedBindings: string[] ): boolean
    {
        const typeChecker = this.program.getTypeChecker();

        var dependencySymbol = this.getSymbolFromNode( dependencyNode );

        if ( dependencySymbol )
        {
            var exports = typeChecker.getExportsOfModule( dependencySymbol );

            if ( exports )
            {
                for ( const exportedSymbol of exports )
                {
                    const exportType: ts.Type = null;//typeChecker.getDeclaredTypeOfSymbol( exportedSymbol );

                    if ( exportType &&
                        ( exportType.flags & ts.TypeFlags.Object ) &&
                        ( ( <ts.ObjectType>exportType ).objectFlags & ( ts.ObjectFlags.Class | ts.ObjectFlags.Interface ) ) )
                    {
                        const baseTypes = typeChecker.getBaseTypes( <ts.InterfaceType>exportType );

                        for ( var baseType of baseTypes )
                        {
                            var baseTypeName = baseType.symbol.getName();

                            if ( namedBindings.indexOf( baseTypeName ) >= 0 )
                            {
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

    private generateBundleSourceFile(): ts.SourceFile
    {
        this.bundleSourceFile = ts.createSourceFile(
            "bundle.ts",
            "",
            this.program.getCompilerOptions().target );

        const importStatements = this.createImports();

        this.bundleSourceFile = ts.updateSourceFileNode( this.bundleSourceFile, importStatements );

        this.addSourceFiles();

        return this.bundleSourceFile;
    }

    private createImports(): ts.Statement[]
    {
        let importStatements: ts.Statement[] = [];

        // First add import equals imports...
        for ( const moduleReference in this.bundleImportEquals.getModuleReferences() )
        {   
            let imports = this.bundleImportEquals.getModuleReferenceImports( moduleReference );

            for ( let importEquals of imports )
            {
                // Import equals declarationss are simply added to the bundle source file statements
                importStatements.push( importEquals );
            }
        }

        // Next add the import declarations...
        for ( const moduleSpecifier of this.bundleImports.getModuleSpecifiers() )
        {
            const {
                defaultNames,
                namespaces,
                namedElements
            } = this.bundleImports.getModuleSpecifierImportProperties( moduleSpecifier );

            if ( defaultNames.length > 0 )
            {
                // TJT: It doesn't make sense to have multiple default imports for a module specifier
                importStatements.push( this.createDefaultImportDeclaration( moduleSpecifier, defaultNames[0] ) );
            }

            if ( namespaces.length > 0 )
            {
                for ( const namespace of namespaces )
                {
                    importStatements.push( this.createNamespaceImportDeclaration( moduleSpecifier, namespace ) );
                }
            }

            if ( namedElements.length > 0 )
            {
                importStatements.push( this.createNamedImportDeclaration( moduleSpecifier, namedElements ) );
            }
        }

        return importStatements;
    }

    private createDefaultImportDeclaration( moduleSpecifier: string, defaultName: ts.Identifier ): ts.ImportDeclaration
    {
        // produce `import {defaultName} from '{specifier}';
        const defaultImport = ts.createImportDeclaration(
            undefined /*decorators*/,
            undefined /*modifiers*/,
            ts.createImportClause(
                defaultName /*name*/,
                undefined ),
            ts.createLiteral( moduleSpecifier ) );

        return defaultImport;
    }

    private createNamespaceImportDeclaration( moduleSpecifier: string, namespace: ts.Identifier ): ts.ImportDeclaration
    {
        // produce `import * as {namespace} from '{moduleSpecifier}';
        const namespaceImport = ts.createImportDeclaration(
            undefined /*decorators*/,
            undefined /*modifiers*/,
            ts.createImportClause(
                undefined /*name*/,
                ts.createNamespaceImport( namespace ) ),
            ts.createLiteral( moduleSpecifier ) );

        return namespaceImport;
    }

    private createNamedImportDeclaration( moduleSpecifier: string, namedImports: ts.ImportSpecifier[] ): ts.ImportDeclaration
    {
        // produce `import { {namedImports} } from '{moduleSpecifier}';
        const namedImport = ts.createImportDeclaration(
            undefined /*decorators*/,
            undefined /*modifiers*/,
            ts.createImportClause(
                undefined /*name*/,
                ts.createNamedImports( namedImports ) ),
            ts.createLiteral( moduleSpecifier ) );

        return namedImport;
    }

    private addSourceFiles()
    {

    }

    private updateSourceFile( sourceFile: ts.SourceFile ): ts.SourceFile
    {
        const visitor: ts.Visitor = ( node: ts.Node ): ts.Node =>
        {
            if ( Ast.isAnyImportOrExport( node ) )
            {
                // TJT: Review the logic here! 

                let moduleNameExpression = Ast.getExternalModuleName( node );

                if ( moduleNameExpression && moduleNameExpression.kind === ts.SyntaxKind.StringLiteral )
                {
                    let moduleSymbol = this.program.getTypeChecker().getSymbolAtLocation( moduleNameExpression );

                    if ( ( moduleSymbol ) && ( Ast.isSourceCodeModule( moduleSymbol ) || Ast.isAmbientModule( moduleSymbol ) ) )
                    {
                        // Remove node here
                        return undefined;
                    }
                }
            }
            else
            {
                if ( node.kind === ts.SyntaxKind.ModuleDeclaration )
                {
                    let module = <ts.ModuleDeclaration>node;

                    if ( this.bundleConfig.package && this.bundleConfig.package.getPackageType() === PackageType.Component )
                    {
                        if ( module.name.getText() !== this.bundleConfig.package.getPackageNamespace() )
                        {
                            if ( module.flags & ts.NodeFlags.ExportContext )
                            {
                                Logger.info( "Component bundle. Module name != package namespace. Removing export modifier." );
                                let nodeModifier = module.modifiers[0];
                                // FIXME: update node - remove export modifier
                                //editText = this.whiteOut( nodeModifier.pos, nodeModifier.end, editText );
                            }
                        }
                    }
                }
                else
                {
                    if ( Ast.getModifierFlagsNoCache( node ) & ts.ModifierFlags.Export )
                    {
                        Logger.info( "Removing export modifier for non module declaration." );
                        let exportModifier = node.modifiers[0];
                        // FIXME: remove export modifier
                        // editText = this.whiteOut( exportModifier.pos, exportModifier.end, editText );
                    }
                }
            }

            return ts.visitEachChild( node, visitor, this.context );
        }

        return ts.visitNode( sourceFile, visitor );
    }

    private getSymbolFromNode( node: ts.Node ): ts.Symbol
    {
        let moduleNameExpr = Ast.getExternalModuleName( node as Ast.AnyImportOrExport );

        if ( moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral )
        {
            return this.program.getTypeChecker().getSymbolAtLocation( moduleNameExpr );
        }

        return undefined;
    }

    private getNamedBindingsFromImport( node: ts.ImportDeclaration ): string[]
    {
        const bindingNames: string[] = [];

        if ( ( node.kind === ts.SyntaxKind.ImportDeclaration ) && node.importClause.namedBindings )
        {
            const namedBindings = node.importClause.namedBindings;

            switch ( namedBindings.kind )
            {
                case ts.SyntaxKind.NamespaceImport:
                    break;

                case ts.SyntaxKind.NamedImports:
                    for ( const importBinding of ( <ts.NamedImports>namedBindings ).elements )
                    {
                        bindingNames.push( importBinding.getText() );
                    }

                    break;
            }
        }

        return bindingNames;
    }

    //private reportStatistics()
    //{
    //    let statisticsReporter = new StatisticsReporter();

    //    statisticsReporter.reportTime( "Deps gen time", this.dependencyTime );
    //    statisticsReporter.reportTime( "Deps walk time", this.dependencyWalkTime );
    //    statisticsReporter.reportTime( "Source gen time", this.buildTime );
    //}
}