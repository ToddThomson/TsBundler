/// <reference types="node" />
/// <reference types="chokidar" />
import * as ts from "typescript";
import * as fs from "fs";
export declare namespace TsCore {
    interface WatchedSourceFile extends ts.SourceFile {
        fileWatcher?: fs.FSWatcher;
    }
    function fileExtensionIs(path: string, extension: string): boolean;
    const supportedExtensions: string[];
    const moduleFileExtensions: string[];
    function isSupportedSourceFileName(fileName: string): boolean;
    function getSourceFileFromSymbol(symbol: ts.Symbol): ts.SourceFile;
    function getExternalModuleName(node: ts.Node): ts.Expression;
    function createDiagnostic(message: ts.DiagnosticMessage, ...args: any[]): ts.Diagnostic;
    function isAliasSymbolDeclaration(node: ts.Node): boolean;
    function normalizeSlashes(path: string): string;
    function outputExtension(path: string): string;
}
