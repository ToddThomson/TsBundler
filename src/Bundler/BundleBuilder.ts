import * as ts from "typescript"
import * as path from "path"
import { Bundle } from "./Bundle"
import { BundleConfigParser } from "./BundlerConfigParser"
import { BundlePackage } from "./BundlePackage"
import { PackageType } from "./PackageType"
import { ImportCollection } from "./ImportCollection"
import { ImportEqualsCollection } from "./ImportEqualsCollection"
import { BundlerOptions } from "./BundlerOptions"
import { BundleBuildResult } from "./BundleBuildResult"
import { DependencyBuilder } from "./DependencyBuilder"
import { Module } from "./Module"
import { ModuleContainer } from "./ModuleContainer"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"
import { Logger } from "../../../TsToolsCommon/src/Reporting/Logger"
import { BundleConfig } from "./BundleConfig"

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

    private moduleNamespaces: ts.MapLike<ts.ModuleName> = {};

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

        let bundleContainer = dependencyBuilder.getSourceFileDependencies( this.sourceFile );
       
        return this.generateBundleSourceFile( bundleContainer );
    }

    private generateBundleSourceFile( moduleContainer: ModuleContainer ): ts.SourceFile
    {
        var bundleSourceFile = ts.createSourceFile(
            "bundle.ts",
            "",
            this.program.getCompilerOptions().target );

        let containerModuleBlock = ts.createModuleBlock( [ts.createEmptyStatement()] );

        // Create a namespace for the module container.
        let containerNamespace: ts.ModuleDeclaration = this.createNamespaceForModuleContainer( moduleContainer.getUniqueName(), containerModuleBlock );
        let containerName = containerNamespace.name;

        // Now add the individual module namepaces to the container block...
        for ( var module of moduleContainer.getModules() )
        {
            const moduleNamespace = this.convertModuleToNamespace( module, containerName );

            this.moduleNamespaces[module.getSourceFile().fileName] = moduleNamespace.name;

            containerModuleBlock = ts.updateModuleBlock( containerModuleBlock, [...containerModuleBlock.statements, moduleNamespace] );
        }

        containerNamespace = ts.updateModuleDeclaration(
            containerNamespace,
            undefined, undefined,
            containerNamespace.name, containerModuleBlock );

        bundleSourceFile = ts.updateSourceFileNode( bundleSourceFile, [containerNamespace] );

        // Finally, add the entry point module
        let modifiedEntry = this.convertAnyImportOrExport( moduleContainer.getEntryPoint(), containerName );
        bundleSourceFile = ts.updateSourceFileNode( bundleSourceFile, [...bundleSourceFile.statements,...modifiedEntry.statements] );
        
        return bundleSourceFile;
    }

    private convertModuleToNamespace( module: Module, containerName: ts.ModuleName ) : ts.ModuleDeclaration
    {
        let modifiedSourceFile = this.convertAnyImportOrExport( module, containerName );
        let moduleName = this.generateModuleName( module.getDeclaration() );
        
        return this.createNamespaceForModule( moduleName, modifiedSourceFile );
    }

    private convertAnyImportOrExport( module: Module, containerName: ts.ModuleName ): ts.SourceFile
    {
        const visitor: ts.Visitor = ( node: ts.Node ) =>
        {
            if ( Ast.isAnyImportOrExport( node ) )
            {
                switch ( node.kind )
                {
                    case ts.SyntaxKind.ImportDeclaration:
                        return this.replaceImportWithVar( node as ts.ImportDeclaration, containerName );

                    case ts.SyntaxKind.ImportEqualsDeclaration:
                        return this.replaceImportEqualsWithVar( node as ts.ImportEqualsDeclaration, containerName );

                    case ts.SyntaxKind.ExportDeclaration:
                        return undefined;
                }
            }

            return ts.visitEachChild( node, visitor, this.context );
        }

        let sourceFile = ts.getMutableClone( module.getSourceFile() );

        return ts.visitNode( sourceFile, visitor );
    }

    private replaceImportWithVar( node: ts.ImportDeclaration, containerName: ts.ModuleName ): ts.Node | ts.Node[]
    {
        const {
            defaultName,
            namespace,
            namedElements
        } = this.getImportProperties( node );

        let declarationSourceFile = Ast.getSourceFileFromAnyImportExportNode( node, this.typeChecker );

        let variableExpression: ts.Expression;
        if ( declarationSourceFile && declarationSourceFile.isDeclarationFile )
        {
            // For d.ts files the var statement expression is a require("mod") call
            variableExpression = this.createRequireCall(
                ts.createLiteral( ( node.moduleSpecifier as ts.StringLiteral ).text ) );
        }
        else
        {
            // for source code files: var {variableName} = {containerName}.{moduleName} 
            let moduleNamespace = this.moduleNamespaces[declarationSourceFile.fileName] as ts.Identifier;

            variableExpression = this.createContainerModulePropertyAccess(
                containerName as ts.Identifier,
                moduleNamespace );
        }

        if ( defaultName )
        {
            // TODO:
        }

        if ( namespace )
        {
            return this.createVariableStatement(
                namespace,
                variableExpression )
        }

        if ( namedElements.length > 0 )
        {
            let varStatements: ts.VariableStatement[] = [];
            // We have an import of pattern: import { a, b as x } from "mod"
            for ( let element of namedElements )
            {
                varStatements.push( this.createVariableStatement( element.name, variableExpression ) );
            }

            return varStatements;
        }

        return node;
    }

    private replaceImportEqualsWithVar( node: ts.ImportEqualsDeclaration, containerName: ts.ModuleName )
    {
        return node;
    }

    private createVariableForNamedImport( moduleSpecifier: string, namedImports: ts.ImportSpecifier[] ): ts.ImportDeclaration
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

    private createContainerModulePropertyAccess( containerName: ts.Identifier, moduleName: ts.Identifier ): ts.PropertyAccessExpression
    {
        return ts.createPropertyAccess(
            containerName,
            moduleName );
    }

    private createVariableStatement( name: ts.Identifier, expression: ts.Expression ): ts.VariableStatement
    {
        const variableStatement = ts.createVariableStatement(
            undefined /*modifiers*/,
            [ts.createVariableDeclaration(
                name,
                undefined /* type */,
                expression)] )

        return variableStatement;
    }

    private createRequireCall( moduleName: ts.Expression ): ts.Expression
    {
        return ts.createCall( ts.createIdentifier( "require" ), /*typeArguments*/ undefined, [moduleName] );
    }

    private createQualifiedNameForModule( containerName: ts.EntityName, moduleName: ts.Identifier ): ts.EntityName
    {
        return ts.createQualifiedName(
            containerName,
            moduleName );

        //ts.createPropertyAccess( )
    }

    private createNamespaceForModule( moduleName: string, sourceFile: ts.SourceFile ): ts.ModuleDeclaration
    {
        const moduleDeclaration = ts.createModuleDeclaration(
            undefined /*decorators*/,
            [ts.createModifier( ts.SyntaxKind.ExportKeyword )],
            ts.createIdentifier( moduleName ),
            ts.createModuleBlock( [...sourceFile.statements] ) );

        return moduleDeclaration;
    }

    private createNamespaceForModuleContainer( moduleName: string, moduleBlock: ts.ModuleBlock ): ts.ModuleDeclaration
    {
        const moduleDeclaration = ts.createModuleDeclaration(
            undefined /*decorators*/,
            undefined/*modifiers*/,
            ts.createIdentifier( moduleName ),
            moduleBlock );

        return moduleDeclaration;
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

    private generateModuleName( declaration: Ast.AnyImportOrExport ): string
    {
        const moduleNameExpression = Ast.getExternalModuleName( declaration );
        const baseName = path.basename( (moduleNameExpression as ts.StringLiteral).text );

        return baseName; //makeUniqueName()
    }

    private getImportProperties( importDeclaration: ts.ImportDeclaration )
    {
        let defaultName: ts.Identifier = undefined;
        let namespace: ts.Identifier = undefined;
        let namedElements: ts.ImportSpecifier[] = [];

        const { name, namedBindings } = importDeclaration.importClause;

        if ( name )
        {
            defaultName = name;
        }

        if ( namedBindings )
        {
            if ( Ast.isNamespaceImport( namedBindings ) )
            {
                namespace = ( namedBindings as ts.NamespaceImport ).name;
            }
            else
            {
                let elements = ( namedBindings as ts.NamedImports ).elements;

                for ( const element of elements )
                {
                    namedElements.push( element );
                }
            }
        }

        return {
            defaultName,
            namespace,
            namedElements,
        };
    }
    

    //private reportStatistics()
    //{
    //    let statisticsReporter = new StatisticsReporter();

    //    statisticsReporter.reportTime( "Deps gen time", this.dependencyTime );
    //    statisticsReporter.reportTime( "Deps walk time", this.dependencyWalkTime );
    //    statisticsReporter.reportTime( "Source gen time", this.buildTime );
    //}
}