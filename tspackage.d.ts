import * as ts from "typescript";

export interface Project {
    build(outputStream: CompileStream): ts.ExitStatus;
}

export declare namespace TsPackage {
    function builder(configFilePath: string, settings?: any, onDone?: (status: ts.ExitStatus) => void): Project;
}
