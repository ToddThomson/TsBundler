import * as ts from "typescript";

export interface ICompileResult {
    getErrors(): ts.Diagnostic[];
    getEmitSkipped(): boolean;
    getEmittedOutput(): ts.MapLike<string>;
    getEmittedFiles(): string[];
    succeeded(): boolean;
}