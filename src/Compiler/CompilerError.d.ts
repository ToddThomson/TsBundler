import ts = require("typescript");
export declare class CompilerError {
    private fileName;
    private line;
    private column;
    private name;
    private message;
    constructor(info: ts.Diagnostic);
    toString(): string;
}
