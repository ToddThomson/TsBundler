import * as ts from "typescript";
import { Container } from "./ContainerContext";
export declare class IdentifierInfo {
    private identifier;
    private symbol;
    private containers;
    private identifiers;
    shortenedName: string;
    constructor(identifier: ts.Identifier, symbol: ts.Symbol, container: Container);
    getSymbol(): ts.Symbol;
    getName(): string;
    getId(): string;
    getContainers(): ts.MapLike<Container>;
    getIdentifiers(): ts.Identifier[];
    addRef(identifier: ts.Identifier, container: Container): void;
    isNamespaceImportAlias(): boolean;
    isFunctionScopedVariable(): boolean;
    isBlockScopedVariable(): boolean;
    isParameter(): boolean;
    isInternalClass(): boolean;
    isInternalInterface(): boolean;
    isInternalFunction(packageNamespace: string): boolean;
    isPrivateMethod(): boolean;
    isPrivateProperty(): boolean;
    private getVariableDeclaration();
}
