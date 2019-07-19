import * as ts from "typescript"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"
import { Module } from "./Module"

/**
 * Any import or export declaration node. 
 */
export class Dependency
{
    private node: Ast.AnyImportOrExport;
    private module: Module;

    constructor( node: Ast.AnyImportOrExport, module: Module )
    {
        this.node = node;
        this.module = module;
    }

    public getNode(): Ast.AnyImportOrExport
    {
        return this.node;
    }

    public getModule(): Module
    {
        return this.module;
    }
}