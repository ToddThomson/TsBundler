"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var Ast_1 = require("../Ast/Ast");
var Logger_1 = require("../Reporting/Logger");
var Utilities_1 = require("../Utils/Utilities");
var TsCore_1 = require("../Utils/TsCore");
var ModuleDescriptor_1 = require("./ModuleDescriptor");
var ModuleContainer_1 = require("./ModuleContainer");
var DependencyBuilder = /** @class */ (function () {
    function DependencyBuilder(host, program) {
        this.bundleModuleStack = [];
        this.host = host;
        this.program = program;
        this.options = this.program.getCompilerOptions();
    }
    /**
     * Returns a chained module container. Each container stores an ordered array of dependencies ( import or exports ) found in the given source file.
     * @param sourceFile { SourceFile } The input source file used to .
     */
    DependencyBuilder.prototype.getSourceFileDependencies = function (sourceFile) {
        var canonicalSourceFileName = this.host.getCanonicalFileName(sourceFile.fileName);
        // Set the initial global ( is this top level ) module container for the input source file.
        this.globalBundle = new ModuleContainer_1.BundleContainer(canonicalSourceFileName, sourceFile, /* isBundleNamespace */ false /* no parent container */);
        this.bundleModuleStack.push(this.globalBundle);
        // Walk the module dependency tree
        this.walkModuleDependencies(sourceFile);
        return this.globalBundle;
    };
    DependencyBuilder.prototype.walkModuleDependencies = function (moduleSourceFile) {
        var self = this;
        var visitedModulesByContainer = [];
        var visitedModules = {};
        var moduleDescriptors = {};
        /**
         * Recursive function used to generate module descriptors for dependencies.
         */
        function visitDependencies(moduleSource, dependencyNodes) {
            var isNextContainer = self.isNextContainer(moduleSource);
            if (isNextContainer) {
                visitedModulesByContainer.push(visitedModules);
                visitedModules = {};
            }
            // Loop through each dependency node and create a module descriptor for each
            dependencyNodes.forEach(function (dependencyNode) {
                var dependencySymbol = self.getSymbolFromNode(dependencyNode);
                var dependencySourceFile = self.getSourceFileFromSymbol(dependencySymbol);
                var moduleDescriptor;
                // TJT: We should look for aliases: import * as alias from moduleSpecifier. Set up a test for this.
                if (!Utilities_1.Utils.hasProperty(moduleDescriptors, dependencySymbol.name)) {
                    Logger_1.Logger.trace("New module descriptor for: ", dependencySymbol.name);
                    var dependencyNodes_1 = [];
                    var isBundleModule = false;
                    if (!dependencySourceFile.isDeclarationFile) {
                        dependencyNodes_1 = self.getModuleDependencyNodes(dependencySourceFile);
                        // Look for our @bundlemodule annotation specifying an "internal" bundle module.
                        isBundleModule = self.hasModuleAnnotation(dependencySourceFile);
                    }
                    // TJT: Not all args needed. Review before release.
                    moduleDescriptor = new ModuleDescriptor_1.ModuleDescriptor(dependencyNode, dependencyNodes_1, dependencySourceFile, dependencySymbol, isBundleModule, self.currentContainer());
                    moduleDescriptors[dependencySymbol.name] = moduleDescriptor;
                }
                else {
                    moduleDescriptor = moduleDescriptors[dependencySymbol.name];
                }
                // We don't need to walk dependencies within declaration files
                if (!dependencySourceFile.isDeclarationFile) {
                    if (!Utilities_1.Utils.hasProperty(visitedModules, dependencySymbol.name)) {
                        visitedModules[dependencySymbol.name] = true;
                        visitDependencies(dependencySourceFile, moduleDescriptor.getDependencies());
                    }
                }
                // Update current module container ordered dependencies...                
                if (dependencySourceFile.isDeclarationFile) {
                    // All top-level dependency module descriptors are added to the global scoped, top-level bundle container
                    self.globalBundle.addModule(moduleDescriptor, dependencySymbol.name);
                }
                else {
                    // Add the module to the current bundle module container.
                    self.currentContainer().addModule(moduleDescriptor, dependencySymbol.name);
                }
            });
            if (isNextContainer) {
                self.restoreContainer();
                visitedModules = visitedModulesByContainer.pop();
            }
        }
        // Start off the dependency building process...
        visitDependencies(moduleSourceFile, this.getModuleDependencyNodes(moduleSourceFile));
    };
    DependencyBuilder.prototype.getModuleDependencyNodes = function (sourceFile) {
        // We are only interested in source code files ( not declaration files )
        if (!Ast_1.Ast.isSourceCodeFile(sourceFile)) {
            return [];
        }
        var dependencyNodes = [];
        var self = this;
        // Search the source file module/node for dependencies...
        function getNodeDependencies(searchNode) {
            ts.forEachChild(searchNode, function (node) {
                if (node.kind === ts.SyntaxKind.ImportDeclaration ||
                    node.kind === ts.SyntaxKind.ImportEqualsDeclaration ||
                    node.kind === ts.SyntaxKind.ExportDeclaration) {
                    var moduleNameExpr = TsCore_1.TsCore.getExternalModuleName(node);
                    if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
                        var moduleSymbol = self.program.getTypeChecker().getSymbolAtLocation(moduleNameExpr);
                        if (moduleSymbol) {
                            dependencyNodes.push(node);
                        }
                    }
                }
                else if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
                    // For a namespace ( or module ), traverse the body to locate ES6 module dependencies.
                    // TJT: This section needs to be reviewed. Should namespace/module syntax kinds be scanned or
                    //      Do we only support ES6 import/export syntax, where dependencies must be declared top level?
                    //
                    // NOTES: We will only support ES6 import/export module syntax
                    var moduleDeclaration = node;
                    if ((moduleDeclaration.name.kind === ts.SyntaxKind.StringLiteral) &&
                        (Ast_1.Ast.getModifierFlags(moduleDeclaration) & ts.ModifierFlags.Ambient || sourceFile.isDeclarationFile)) {
                        // An AmbientExternalModuleDeclaration declares an external module.
                        Logger_1.Logger.info("Scanning for dependencies within ambient module declaration: ", moduleDeclaration.name.text);
                        getNodeDependencies(moduleDeclaration.body);
                    }
                }
            });
        }
        ;
        getNodeDependencies(sourceFile);
        return dependencyNodes;
    };
    DependencyBuilder.prototype.hasModuleAnnotation = function (sourceFile) {
        // Look for our bundlemodule annotation.
        var sourceText = sourceFile.getFullText();
        var commentRanges = ts.getLeadingCommentRanges(sourceText, 0);
        return Utilities_1.Utils.forEach(commentRanges, function (commentRange) {
            var comment = sourceText.substring(commentRange.pos, commentRange.end);
            return comment.indexOf("@bundlemodule") >= 0;
        });
    };
    DependencyBuilder.prototype.getModuleAnnotationName = function (sourceFile) {
        var bundleModuleNamespaceRegex = /\{(.*?)\}/;
        var sourceText = sourceFile.getFullText();
        var commentRanges = ts.getLeadingCommentRanges(sourceText, 0);
        for (var _i = 0, commentRanges_1 = commentRanges; _i < commentRanges_1.length; _i++) {
            var commentRange = commentRanges_1[_i];
            var comment = sourceText.substring(commentRange.pos, commentRange.end);
            if (comment.indexOf("@bundlemodule") >= 0) {
                var namespaceNameMatch = bundleModuleNamespaceRegex.exec(comment);
                if (namespaceNameMatch) {
                    return namespaceNameMatch[0].replace("{", "").replace("}", "").trim();
                }
            }
        }
        return undefined;
    };
    DependencyBuilder.prototype.currentContainer = function () {
        return this.bundleModuleStack[this.bundleModuleStack.length - 1];
    };
    DependencyBuilder.prototype.restoreContainer = function () {
        return this.bundleModuleStack.pop();
    };
    DependencyBuilder.prototype.isNextContainer = function (sourceFile) {
        if (this.hasModuleAnnotation(sourceFile)) {
            var moduleName = this.getModuleAnnotationName(sourceFile);
            // TODO: How to handle missing module name? 
            // 1) Generate an error?
            // 2) Generate a module name from symbol name?
            if (!moduleName) {
                moduleName = "missing_module_name";
            }
            var nextModule = new ModuleContainer_1.BundleContainer(moduleName, sourceFile, true, this.currentContainer());
            // Before changing the current container we must first add the new container to the children of the current container.
            var currentModule = this.currentContainer();
            // Add new container context to the exising current container
            currentModule.addChild(nextModule);
            this.bundleModuleStack.push(nextModule);
            return true;
        }
        return false;
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
        return undefined;
    };
    DependencyBuilder.prototype.getSourceFileFromSymbol = function (importSymbol) {
        var declaration = importSymbol.getDeclarations()[0];
        return declaration.getSourceFile();
    };
    return DependencyBuilder;
}());
exports.DependencyBuilder = DependencyBuilder;
//# sourceMappingURL=DependencyBuilder.js.map