import * as ts from "typescript"
import * as path from "path"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"

/**
 * An external module descriptor. 
 */
export class Module
{
    private sourceFile: ts.SourceFile;
    private dependencies: Ast.AnyImportOrExport[] = [];
    private declaration: Ast.AnyImportOrExport | undefined;

    constructor( sourceFile: ts.SourceFile, dependencies: Ast.AnyImportOrExport[], declarationReference?: Ast.AnyImportOrExport )
    {
        this.sourceFile = sourceFile;
        this.dependencies = dependencies;
        this.declaration = declarationReference;
    }

    public getDeclaration(): Ast.AnyImportOrExport | undefined
    {
        return this.declaration;
    }

    public getDependencies(): Ast.AnyImportOrExport[]
    {
        return this.dependencies;
    }

    public getSourceFile(): ts.SourceFile
    {
        return this.sourceFile;
    }

    //public getName(): string
    //{
    //    const moduleNameExpression = Ast.getExternalModuleName( this.declaration );
    //    const baseName = path.basename( ( moduleNameExpression as ts.StringLiteral ).text );

    //    return baseName; //makeUniqueName()
    //}
}