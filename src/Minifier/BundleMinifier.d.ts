import * as ts from "typescript";
import { BundleConfig } from "../Bundler/BundleParser";
import { NodeWalker } from "../Ast/NodeWalker";
import { AstTransform } from "../Ast/AstTransform";
import { Container } from "./ContainerContext";
export declare class BundleMinifier extends NodeWalker implements AstTransform {
    private bundleSourceFile;
    private program;
    private checker;
    private compilerOptions;
    private bundleConfig;
    private containerStack;
    private classifiableContainers;
    private allIdentifierInfos;
    private sourceFileContainer;
    private nameGenerator;
    private whiteSpaceBefore;
    private whiteSpaceAfter;
    private whiteSpaceTime;
    private transformTime;
    private identifierCount;
    private shortenedIdentifierCount;
    constructor(program: ts.Program, compilerOptions: ts.CompilerOptions, bundleConfig: BundleConfig);
    transform(bundleSourceFile: ts.SourceFile): ts.SourceFile;
    removeWhitespace(jsContents: string): string;
    protected visitNode(node: ts.Node): void;
    private getSymbolFromPrototypeFunction(identifier);
    private minify(sourceFile);
    private shortenIdentifiers();
    private shortenContainerIdentifiers(container);
    private processIdentifierInfo(identifierInfo, container);
    private canShortenIdentifier(identifierInfo);
    private getShortenedIdentifierName(container, identifierInfo);
    private setIdentifierText(identifier, text);
    private processContainerLocals(locals, container);
    private processClassMembers(members, container);
    excludeNames(container: Container): void;
    private getContainerExcludedIdentifiers(container);
    private excludeNamesForIdentifier(identifierInfo, container);
    private currentContainer();
    private restoreContainer();
    private isNextContainer(node);
    private reportWhitespaceStatistics();
    private reportMinifyStatistics();
}
