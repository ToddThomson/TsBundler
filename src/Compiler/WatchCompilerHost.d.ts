import * as ts from "typescript";
import { CachingCompilerHost } from "./CachingCompilerHost";
/**
 * @description A typescript compiler host that supports watch incremental builds.
 */
export declare class WatchCompilerHost extends CachingCompilerHost {
    private reuseableProgram;
    private onSourceFileChanged;
    constructor(compilerOptions: ts.CompilerOptions, onSourceFileChanged?: (sourceFile: ts.SourceFile, path: string, stats: any) => void);
    setReuseableProgram(program: ts.Program): void;
    getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void) => ts.SourceFile;
}
