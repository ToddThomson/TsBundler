import * as ts from "typescript";
export declare class DependencyBuilder {
    private host;
    private program;
    private options;
    private moduleImportsByName;
    constructor(host: ts.CompilerHost, program: ts.Program);
    getSourceFileDependencies(sourceFile: ts.SourceFile): ts.MapLike<ts.Node[]>;
    getImportsOfModule(file: ts.SourceFile): ts.Node[];
    private isExternalModuleImportEqualsDeclaration(node);
    private getExternalModuleImportEqualsDeclarationExpression(node);
    private getSymbolFromNode(node);
    private getSourceFileFromSymbol(importSymbol);
}
