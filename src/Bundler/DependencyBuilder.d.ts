import * as ts from "typescript";
import { BundleContainer } from "./ModuleContainer";
export declare class DependencyBuilder {
    private host;
    private program;
    private options;
    private bundleModuleStack;
    private globalBundle;
    constructor(host: ts.CompilerHost, program: ts.Program);
    /**
     * Returns a chained module container. Each container stores an ordered array of dependencies ( import or exports ) found in the given source file.
     * @param sourceFile { SourceFile } The input source file used to .
     */
    getSourceFileDependencies(sourceFile: ts.SourceFile): BundleContainer;
    private walkModuleDependencies;
    private getModuleDependencyNodes;
    private hasModuleAnnotation;
    private getModuleAnnotationName;
    private currentContainer;
    private restoreContainer;
    private isNextContainer;
    private isExternalModuleImportEqualsDeclaration;
    private getExternalModuleImportEqualsDeclarationExpression;
    private getSymbolFromNode;
    private getSourceFileFromSymbol;
}
