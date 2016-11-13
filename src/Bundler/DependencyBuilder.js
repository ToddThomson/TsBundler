"use strict";
var Logger_1 = require("../Reporting/Logger");
var Utilities_1 = require("../Utils/Utilities");
var TsCore_1 = require("../Utils/TsCore");
var ts = require("typescript");
var DependencyBuilder = (function () {
    function DependencyBuilder(host, program) {
        this.moduleImportsByName = {};
        this.host = host;
        this.program = program;
        this.options = this.program.getCompilerOptions();
    }
    DependencyBuilder.prototype.getSourceFileDependencies = function (sourceFile) {
        var self = this;
        var dependencies = {};
        var importWalked = {};
        function walkModuleImports(importNodes) {
            importNodes.forEach(function (importNode) {
                // Get the import symbol for the import node
                var importSymbol = self.getSymbolFromNode(importNode);
                var importSourceFile = self.getSourceFileFromSymbol(importSymbol);
                var canonicalFileName = self.host.getCanonicalFileName(importSourceFile.fileName);
                // Don't walk imports that we've already processed
                if (!Utilities_1.Utils.hasProperty(importWalked, canonicalFileName)) {
                    importWalked[canonicalFileName] = true;
                    // Build dependencies bottom up, left to right by recursively calling walkModuleImports
                    if (!importSourceFile.isDeclarationFile) {
                        Logger_1.Logger.info("Walking Import module: ", canonicalFileName);
                        walkModuleImports(self.getImportsOfModule(importSourceFile));
                    }
                }
                if (!Utilities_1.Utils.hasProperty(dependencies, canonicalFileName)) {
                    Logger_1.Logger.info("Getting and adding imports of module file: ", canonicalFileName);
                    dependencies[canonicalFileName] = self.getImportsOfModule(importSourceFile);
                }
            });
        }
        // Get the top level source file imports
        var sourceFileImports = self.getImportsOfModule(sourceFile);
        // Walk the module import tree
        walkModuleImports(sourceFileImports);
        var canonicalSourceFileName = self.host.getCanonicalFileName(sourceFile.fileName);
        if (!Utilities_1.Utils.hasProperty(dependencies, canonicalSourceFileName)) {
            Logger_1.Logger.info("Adding top level import dependencies for file: ", canonicalSourceFileName);
            dependencies[canonicalSourceFileName] = sourceFileImports;
        }
        return dependencies;
    };
    DependencyBuilder.prototype.getImportsOfModule = function (file) {
        var importNodes = [];
        var self = this;
        function getImports(searchNode) {
            ts.forEachChild(searchNode, function (node) {
                if (node.kind === ts.SyntaxKind.ImportDeclaration || node.kind === ts.SyntaxKind.ImportEqualsDeclaration || node.kind === ts.SyntaxKind.ExportDeclaration) {
                    var moduleNameExpr = TsCore_1.TsCore.getExternalModuleName(node);
                    if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
                        var moduleSymbol = self.program.getTypeChecker().getSymbolAtLocation(moduleNameExpr);
                        if (moduleSymbol) {
                            Logger_1.Logger.info("Adding import node: ", moduleSymbol.name);
                            importNodes.push(node);
                        }
                        else {
                            Logger_1.Logger.warn("Module symbol not found");
                        }
                    }
                }
                else if (node.kind === ts.SyntaxKind.ModuleDeclaration && node.name.kind === ts.SyntaxKind.StringLiteral && (node.flags & ts.NodeFlags.Ambient || file.isDeclarationFile)) {
                    // An AmbientExternalModuleDeclaration declares an external module.
                    var moduleDeclaration = node;
                    Logger_1.Logger.info("Processing ambient module declaration: ", moduleDeclaration.name.text);
                    getImports(node.body);
                }
            });
        }
        ;
        Logger_1.Logger.info("Getting imports for source file: ", file.fileName);
        getImports(file);
        return importNodes;
    };
    DependencyBuilder.prototype.isExternalModuleImportEqualsDeclaration = function (node) {
        return node.kind === ts.SyntaxKind.ImportEqualsDeclaration && node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference;
    };
    DependencyBuilder.prototype.getExternalModuleImportEqualsDeclarationExpression = function (node) {
        return node.moduleReference.expression;
    };
    DependencyBuilder.prototype.getSymbolFromNode = function (node) {
        var moduleNameExpr = TsCore_1.TsCore.getExternalModuleName(node);
        if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
            return this.program.getTypeChecker().getSymbolAtLocation(moduleNameExpr);
        }
    };
    DependencyBuilder.prototype.getSourceFileFromSymbol = function (importSymbol) {
        var declaration = importSymbol.getDeclarations()[0];
        return declaration.getSourceFile();
    };
    return DependencyBuilder;
}());
exports.DependencyBuilder = DependencyBuilder;
