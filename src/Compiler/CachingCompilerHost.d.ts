import * as ts from "typescript";
/**
 * @description A typescript compiler host that supports incremental builds and optimizations for file reads and file exists functions. Emit output is saved to memory.
 */
export declare class CachingCompilerHost implements ts.CompilerHost {
    private output;
    private dirExistsCache;
    private dirExistsCacheSize;
    private fileExistsCache;
    private fileExistsCacheSize;
    private fileReadCache;
    protected compilerOptions: any;
    private baseHost;
    constructor(compilerOptions: ts.CompilerOptions);
    getOutput(): ts.MapLike<string>;
    getSourceFileImpl(fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void): ts.SourceFile;
    getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void) => ts.SourceFile;
    writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void): void;
    fileExists: (fileName: string) => boolean;
    readFile(fileName: any): string;
    getDefaultLibFileName(options: ts.CompilerOptions): string;
    getCurrentDirectory(): string;
    getDirectories(path: string): string[];
    getCanonicalFileName(fileName: string): string;
    useCaseSensitiveFileNames(): boolean;
    getNewLine(): string;
    directoryExists(directoryPath: string): boolean;
}
