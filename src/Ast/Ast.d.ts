import * as ts from "typescript";
export declare namespace Ast {
    const enum ContainerFlags {
        None = 0,
        IsContainer = 1,
        IsBlockScopedContainer = 2,
        IsControlFlowContainer = 4,
        IsFunctionLike = 8,
        IsFunctionExpression = 16,
        HasLocals = 32,
        IsInterface = 64,
        IsObjectLiteralOrClassExpressionMethod = 128,
        IsContainerWithLocals = 33,
    }
    function isPrototypeAccessAssignment(expression: ts.Node): boolean;
    function isFunctionLike(node: ts.Node): boolean;
    function isObjectLiteralOrClassExpressionMethod(node: ts.Node): node is ts.MethodDeclaration;
    function isInterfaceInternal(symbol: ts.Symbol): boolean;
    function isClassInternal(symbol: ts.Symbol): boolean;
    function isClassAbstract(classSymbol: ts.Symbol): boolean;
    function getClassHeritageProperties(classNode: ts.Node, checker: ts.TypeChecker): ts.Symbol[];
    function getClassAbstractProperties(extendsClause: ts.HeritageClause, checker: ts.TypeChecker): ts.Symbol[];
    function getImplementsProperties(implementsClause: ts.HeritageClause, checker: ts.TypeChecker): ts.Symbol[];
    function getIdentifierUID(symbol: ts.Symbol): string;
    function getContainerFlags(node: ts.Node): ContainerFlags;
    function getImplementsClause(node: ts.Node): ts.HeritageClause;
    function getExtendsClause(node: ts.Node): ts.HeritageClause;
    function isKeyword(token: ts.SyntaxKind): boolean;
    function isPuncuation(token: ts.SyntaxKind): boolean;
    function isTrivia(token: ts.SyntaxKind): boolean;
    function isExportProperty(propertySymbol: ts.Symbol): boolean;
    function isAmbientProperty(propertySymbol: ts.Symbol): boolean;
}
