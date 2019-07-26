import * as ts from "typescript"
import * as path from "path"
import { Bundle } from "./Bundle"
import { BundleConfig } from "./BundleConfig"
import { BundlerOptions } from "./BundlerOptions"
import { BundleBuildResult } from "./BundleBuildResult"
import { DependencyBuilder } from "./DependencyBuilder"
import { Module } from "./Module"
import { ModuleContainer } from "./ModuleContainer"
import { TsCore } from "../../../TsToolsCommon/src/typescript/core"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"
import { Factory } from "../../../TsToolsCommon/src/Typescript/TransformHelpers"
import { Logger } from "../../../TsToolsCommon/src/Reporting/Logger"

export class BundleBuilder
{
    private bundle: Bundle;
    private bundleConfig: BundleConfig = {};
    private options: BundlerOptions;

    private program: ts.Program;
    private typeChecker: ts.TypeChecker;
    private context: ts.TransformationContext;

    private entrySourceFile: ts.SourceFile;

    private moduleNamespaces: ts.MapLike<ts.ModuleName> = {};

    constructor( program: ts.Program, options?: BundlerOptions )
    {
        this.program = program;
        this.typeChecker = program.getTypeChecker();
        this.options = options;
    }

    public transform( entrySourceFile: ts.SourceFile, context: ts.TransformationContext ): ts.SourceFile
    {
         this.context = context;

        return this.buildBundle( entrySourceFile );
    }

    public build( bundle: Bundle ): BundleBuildResult
    {
        this.bundle = bundle;

        // Construct bundle output file name
        let bundleBaseDir = path.dirname( bundle.name );

        if ( bundle.config.outDir )
        {
            bundleBaseDir = path.join( bundleBaseDir, bundle.config.outDir );
        }

        let bundleFilePath = path.join( bundleBaseDir, path.basename( bundle.name ) );
        bundleFilePath = TsCore.normalizeSlashes( bundleFilePath );

        for ( var filesKey in bundle.entryFileNames )
        {
            let fileName = bundle.entryFileNames[filesKey];

            let bundleSourceFile = this.program.getSourceFile( fileName );

            if ( !bundleSourceFile )
            {
                let diagnostic = TsCore.createDiagnostic( {
                    code: 6060,
                    category: ts.DiagnosticCategory.Error,
                    key: "Bundle_source_file_0_not_found_6060",
                    message: "Bundle source file '{0}' not found."
                }, fileName );

                return new BundleBuildResult( [diagnostic] );
            }

            this.buildBundle( bundleSourceFile );
        }

        var bundleExtension = ".ts";
        var bundleFile = {
            path: bundleFilePath + bundleExtension,
            extension: bundleExtension,
            text: "" /* fixme */
        };

        return new BundleBuildResult( [], bundleFile );
    }

    public buildBundle( entrySourceFile: ts.SourceFile ): ts.SourceFile
    {
        this.entrySourceFile = entrySourceFile;

        const dependencyBuilder = new DependencyBuilder( this.program );

        let bundleContainer = dependencyBuilder.getSourceFileDependencies( this.entrySourceFile );
       
        return this.generateBundleSourceFile( bundleContainer );
    }

    private generateBundleSourceFile( moduleContainer: ModuleContainer ): ts.SourceFile
    {
        const visitor = ( sourceFile: ts.SourceFile ) =>
        {
            //var bundleSourceFile = ts.createSourceFile(
            //    "bundle.ts",
            //    "",
            //    this.program.getCompilerOptions().target );

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

            containerNamespace = ts.createModuleDeclaration(
                undefined, undefined,
                containerNamespace.name, containerModuleBlock );

            let bundleSourceFile = ts.getMutableClone( this.entrySourceFile );
            bundleSourceFile = ts.updateSourceFileNode( bundleSourceFile, [containerNamespace] );

            // Finally, add the entry point module
            let modifiedEntry = this.convertAnyImportOrExport( moduleContainer.getEntryPoint(), containerName );
            bundleSourceFile = ts.updateSourceFileNode( bundleSourceFile, [...bundleSourceFile.statements,...modifiedEntry.statements] );

            return bundleSourceFile;
        }

        return ts.visitNode( this.entrySourceFile, visitor );
    }

    private convertModuleToNamespace( module: Module, containerName: ts.ModuleName ) : ts.ModuleDeclaration
    {
        let modifiedSourceFile = this.convertAnyImportOrExport( module, containerName );
        modifiedSourceFile = ts.updateSourceFileNode( modifiedSourceFile, [...modifiedSourceFile.statements] );
        let moduleName = this.generateModuleName( module.getDeclaration() );

        let namespace = this.createNamespaceForModule( moduleName, modifiedSourceFile );

        return namespace;
    }

    private convertAnyImportOrExport( module: Module, containerName: ts.ModuleName ): ts.SourceFile
    {
        const visitor: ts.Visitor = ( node ) =>
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
                        // TODO:
                        break;
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

    private replaceImportEqualsWithVar( node: ts.ImportEqualsDeclaration, containerName: ts.ModuleName ): ts.Node | ts.Node[]
    {
        return node;
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

    private createNamespaceForModule( moduleName: string, sourceFile: ts.SourceFile ): ts.ModuleDeclaration
    {
        let statementNodes: ts.Statement[] = [];

        for ( let statement of sourceFile.statements )
        {
            let node = Factory.getDeepMutableClone( statement );

            statementNodes.push( node );
        }

        let t = statementNodes && ts.createNodeArray( statementNodes );
        const moduleBlock = ts.createModuleBlock( t );

        const moduleDeclaration = ts.createModuleDeclaration(
            undefined /*decorators*/,
            [ts.createModifier( ts.SyntaxKind.ExportKeyword )],
            ts.createIdentifier( moduleName ),
            moduleBlock ); //ts.createModuleBlock( sourceFile.statements ) );

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
}