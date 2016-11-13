import { CompilerResult } from "../Compiler/CompilerResult";
import { WatchCompilerHost } from "../Compiler/WatchCompilerHost";
import { CompileStream } from "../Compiler/CompileStream";
import { BundleConfig } from "../Bundler/BundleParser";
import { BundleFile } from "../Bundler/BundleResult";
import * as ts from "typescript";
export declare class BundleCompiler {
    private compilerHost;
    private program;
    private outputStream;
    private compilerOptions;
    private emitTime;
    private compileTime;
    private preEmitTime;
    private bundleSourceFiles;
    constructor(compilerHost: WatchCompilerHost, program: ts.Program, outputStream: CompileStream);
    compile(bundleFile: BundleFile, bundleConfig: BundleConfig): CompilerResult;
    private reportStatistics();
}
