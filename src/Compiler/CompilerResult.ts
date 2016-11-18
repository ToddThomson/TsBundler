import * as ts from "typescript";
import { ICompileResult } from "./ICompileResult"

export class CompilerResult implements ICompileResult {

    private errors: ts.Diagnostic[];
    private emitSkipped: boolean;
    private emittedFiles?: string[];
    private emittedOutput?: ts.MapLike<string>;

    constructor( emitSkipped: boolean, errors: ts.Diagnostic[], emittedFiles?: string[], emittedOutput?: ts.MapLike<string> ) {
        this.emitSkipped = emitSkipped;
        this.errors = errors;
        this.emittedFiles = emittedFiles;
        this.emittedOutput = emittedOutput;
    }

    public getErrors(): ts.Diagnostic[] {
        return this.errors;
    }

    public getEmitSkipped(): boolean {
        return this.emitSkipped;
    }

    public getEmittedOutput(): ts.MapLike<string> {
        return this.emittedOutput;
    }

    public getEmittedFiles(): string[] {
        return this.emittedFiles;
    }

    public succeeded(): boolean {
        return ( this.errors.length == 0 );
    }
}