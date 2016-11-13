"use strict";
var ts = require("typescript");
var Ast_1 = require("../Ast/Ast");
var Utilities_1 = require("../Utils/Utilities");
var Logger_1 = require("../Reporting/Logger");
var IdentifierInfo = (function () {
    function IdentifierInfo(identifier, symbol, container) {
        this.containers = {};
        this.identifiers = [];
        this.shortenedName = undefined;
        this.identifier = identifier;
        this.symbol = symbol;
        this.identifiers = [identifier];
        this.containers[container.getId().toString()] = container;
    }
    IdentifierInfo.prototype.getSymbol = function () {
        return this.symbol;
    };
    IdentifierInfo.prototype.getName = function () {
        return this.symbol.name;
    };
    IdentifierInfo.prototype.getId = function () {
        var id = this.symbol.id;
        if (id === undefined && this.symbol.valueDeclaration) {
            id = this.symbol.valueDeclaration.symbol.id;
        }
        return id ? id.toString() : undefined;
    };
    IdentifierInfo.prototype.getContainers = function () {
        return this.containers;
    };
    IdentifierInfo.prototype.getIdentifiers = function () {
        return this.identifiers;
    };
    IdentifierInfo.prototype.addRef = function (identifier, container) {
        // Add the identifier (node) reference
        this.identifiers.push(identifier);
        // We only need to keep track of a single reference in a container
        if (!Utilities_1.Utils.hasProperty(this.containers, container.getId().toString())) {
            this.containers[container.getId().toString()] = container;
        }
    };
    IdentifierInfo.prototype.isNamespaceImportAlias = function () {
        if ((this.symbol.flags & ts.SymbolFlags.Alias) > 0) {
            if (this.symbol.declarations[0].kind === ts.SyntaxKind.NamespaceImport) {
                return true;
            }
        }
        return false;
    };
    IdentifierInfo.prototype.isFunctionScopedVariable = function () {
        if ((this.symbol.flags & ts.SymbolFlags.FunctionScopedVariable) > 0) {
            var variableDeclaration = this.getVariableDeclaration();
            if (variableDeclaration) {
                return true;
            }
        }
        return false;
    };
    IdentifierInfo.prototype.isBlockScopedVariable = function () {
        if ((this.symbol.flags & ts.SymbolFlags.BlockScopedVariable) > 0) {
            var variableDeclaration = this.getVariableDeclaration();
            if (variableDeclaration) {
                return ((variableDeclaration.parent.flags & ts.NodeFlags.Let) !== 0) ||
                    ((variableDeclaration.parent.flags & ts.NodeFlags.Const) !== 0);
            }
        }
        return false;
    };
    IdentifierInfo.prototype.isParameter = function () {
        // Note: FunctionScopedVariable also indicates a parameter
        if ((this.symbol.flags & ts.SymbolFlags.FunctionScopedVariable) > 0) {
            // A parameter has a value declaration
            if (this.symbol.valueDeclaration.kind === ts.SyntaxKind.Parameter) {
                return true;
            }
        }
        return false;
    };
    IdentifierInfo.prototype.isInternalClass = function () {
        // TJT: Review - should use the same export "override" logic as in isInternalFunction
        return Ast_1.Ast.isClassInternal(this.symbol);
    };
    IdentifierInfo.prototype.isInternalInterface = function () {
        return Ast_1.Ast.isInterfaceInternal(this.symbol);
    };
    IdentifierInfo.prototype.isInternalFunction = function (packageNamespace) {
        if (this.symbol.flags & ts.SymbolFlags.Function) {
            // A function has a value declaration
            if (this.symbol.valueDeclaration.kind === ts.SyntaxKind.FunctionDeclaration) {
                var flags = this.symbol.valueDeclaration.flags;
                // If The function is from an extern API or ambient then it cannot be considered internal.
                if (Ast_1.Ast.isExportProperty(this.symbol) || Ast_1.Ast.isAmbientProperty(this.symbol)) {
                    return false;
                }
                if (!(flags & ts.NodeFlags.Export)) {
                    return true;
                }
                // Override export flag if function is not in our special package namespace.
                if (packageNamespace) {
                    var node = this.symbol.valueDeclaration;
                    while (node) {
                        if (node.flags & ts.NodeFlags.Namespace) {
                            var nodeNamespaceName = node.name.text;
                            if (nodeNamespaceName !== packageNamespace) {
                                return true;
                            }
                        }
                        node = node.parent;
                    }
                }
            }
        }
        return false;
    };
    IdentifierInfo.prototype.isPrivateMethod = function () {
        if ((this.symbol.flags & ts.SymbolFlags.Method) > 0) {
            // We explicitly check that a method has a value declaration.
            if (this.symbol.valueDeclaration === undefined) {
                return false;
            }
            var flags = this.symbol.valueDeclaration.flags;
            if ((flags & ts.NodeFlags.Private) > 0) {
                return true;
            }
            // Check if the method parent class or interface is "internal" ( non-private methods may be shortened too )
            var parent_1 = this.symbol.parent;
            if (parent_1 && Ast_1.Ast.isClassInternal(parent_1)) {
                // TJT: Review - public methods of abstact classes are not shortened.
                if (!Ast_1.Ast.isClassAbstract(parent_1)) {
                    return true;
                }
            }
            if (parent_1 && Ast_1.Ast.isInterfaceInternal(parent_1)) {
                // TODO: Interfaces methods are always external for now.
                return false;
            }
        }
        return false;
    };
    IdentifierInfo.prototype.isPrivateProperty = function () {
        if ((this.symbol.flags & ts.SymbolFlags.Property) > 0) {
            // A property has a value declaration except when it is the "prototype" property.
            if (this.symbol.valueDeclaration === undefined) {
                return false;
            }
            var flags = this.symbol.valueDeclaration.flags;
            if ((flags & ts.NodeFlags.Private) > 0) {
                return true;
            }
            // Check if the property parent class is "internal" ( non-private properties may be shortened too )
            var parent_2 = this.symbol.parent;
            if (parent_2 && Ast_1.Ast.isClassInternal(parent_2)) {
                // TJT: Review - public properties of abstact classes are not shortened.
                if (!Ast_1.Ast.isClassAbstract(parent_2)) {
                    return true;
                }
            }
        }
        return false;
    };
    IdentifierInfo.prototype.getVariableDeclaration = function () {
        switch (this.identifier.parent.kind) {
            case ts.SyntaxKind.VariableDeclaration:
                return this.identifier.parent;
            case ts.SyntaxKind.VariableDeclarationList:
                Logger_1.Logger.warn("VariableDeclaratioList in getVariableDeclaration() - returning null");
                break;
            case ts.SyntaxKind.VariableStatement:
                Logger_1.Logger.warn("VariableStatement in getVariableDeclaration() - returning null");
                break;
        }
        return null;
    };
    return IdentifierInfo;
}());
exports.IdentifierInfo = IdentifierInfo;
