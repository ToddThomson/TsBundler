import { CompilerResult } from "./CompilerResult";
import { CachingCompilerHost } from "./CachingCompilerHost";
import { CompileStream } from "./CompileStream";
import * as ts from "typescript";
export declare class Compiler {
    private compilerHost;
    private program;
    private compileStream;
    private compilerOptions;
    private preEmitTime;
    private emitTime;
    private compileTime;
    constructor(compilerHost: CachingCompilerHost, program: ts.Program, compileStream: CompileStream);
    compile(onError?: (message: string) => void): CompilerResult;
    private reportStatistics();
    private compiledLines();
    private getLineStarts(sourceFile);
}
