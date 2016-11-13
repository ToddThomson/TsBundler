import * as ts from "typescript";
export declare class CompilerResult {
    private status;
    private errors;
    constructor(status: ts.ExitStatus, errors?: ts.Diagnostic[]);
    getErrors(): ts.Diagnostic[];
    getStatus(): ts.ExitStatus;
    succeeded(): boolean;
}
