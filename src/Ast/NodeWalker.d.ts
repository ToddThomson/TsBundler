import * as ts from "typescript";
export declare abstract class NodeWalker {
    walk(node: ts.Node): void;
    protected visitNode(node: ts.Node): void;
    protected walkChildren(node: ts.Node): void;
}
