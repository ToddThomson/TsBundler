"use strict";
var StatisticsReporter_1 = require("../Reporting/StatisticsReporter");
var Logger_1 = require("../Reporting/Logger");
var BundleResult_1 = require("./BundleResult");
var DependencyBuilder_1 = require("./DependencyBuilder");
var Utilities_1 = require("../Utils/Utilities");
var TsCore_1 = require("../Utils/TsCore");
var ts = require("typescript");
var path = require("path");
var BundleBuilder = (function () {
    function BundleBuilder(compilerHost, program) {
        this.dependencyTime = 0;
        this.dependencyWalkTime = 0;
        this.emitTime = 0;
        this.buildTime = 0;
        this.bundleCodeText = "";
        this.bundleImportText = "";
        this.bundleImportedFiles = {};
        this.bundleModuleImports = {};
        this.bundleSourceFiles = {};
        this.compilerHost = compilerHost;
        this.program = program;
    }
    BundleBuilder.prototype.build = function (bundle) {
        var _this = this;
        this.bundle = bundle;
        this.buildTime = new Date().getTime();
        var dependencyBuilder = new DependencyBuilder_1.DependencyBuilder(this.compilerHost, this.program);
        // Construct bundle output file name
        var bundleBaseDir = path.dirname(bundle.name);
        if (bundle.config.outDir) {
            bundleBaseDir = path.join(bundleBaseDir, bundle.config.outDir);
        }
        var bundleFilePath = path.join(bundleBaseDir, path.basename(bundle.name));
        bundleFilePath = TsCore_1.TsCore.normalizeSlashes(bundleFilePath);
        this.bundleCodeText = "";
        this.bundleImportText = "";
        this.bundleImportedFiles = {};
        this.bundleModuleImports = {};
        this.bundleSourceFiles = {};
        // Look for tsx source files in bundle name or bundle dependencies.
        // Output tsx for bundle extension if typescript react files found.
        var isBundleTsx = false;
        var allDependencies = {};
        var _loop_1 = function() {
            var fileName = bundle.fileNames[filesKey];
            Logger_1.Logger.info(">>> Processing bundle file:", fileName);
            var bundleSourceFileName = this_1.compilerHost.getCanonicalFileName(TsCore_1.TsCore.normalizeSlashes(fileName));
            Logger_1.Logger.info("BundleSourceFileName:", bundleSourceFileName);
            var bundleSourceFile = this_1.program.getSourceFile(bundleSourceFileName);
            if (!bundleSourceFile) {
                var diagnostic = TsCore_1.TsCore.createDiagnostic({ code: 6060, category: ts.DiagnosticCategory.Error, key: "Bundle_source_file_0_not_found_6060", message: "Bundle source file '{0}' not found." }, bundleSourceFileName);
                return { value: new BundleResult_1.BundleResult(ts.ExitStatus.DiagnosticsPresent_OutputsSkipped, [diagnostic]) };
            }
            // Check for TSX
            if (bundleSourceFile.languageVariant == ts.LanguageVariant.JSX) {
                isBundleTsx = true;
            }
            var startTime = new Date().getTime();
            // Get bundle source file module dependencies...
            var moduleDependencies = dependencyBuilder.getSourceFileDependencies(bundleSourceFile);
            this_1.dependencyTime += new Date().getTime() - startTime;
            // Merge current bundle file dependencies into all dependencies
            for (mergeKey in moduleDependencies) {
                if (!Utilities_1.Utils.hasProperty(allDependencies, mergeKey)) {
                    allDependencies[mergeKey] = moduleDependencies[mergeKey];
                }
            }
            startTime = new Date().getTime();
            Logger_1.Logger.info("Traversing module dependencies for bundle: ", bundleSourceFile.fileName);
            for (moduleFileName in moduleDependencies) {
                Logger_1.Logger.info("Walking dependency nodes for module: ", moduleFileName);
                moduleDependencyNodes = moduleDependencies[moduleFileName];
                moduleDependencyNodes.forEach(function (moduleDependencyNode) {
                    // Obtain the source file from the dependency node ( usually an import statement )
                    // REVIEW: Combine these.
                    var dependencySymbol = _this.getSymbolFromNode(moduleDependencyNode);
                    var dependencyFile = TsCore_1.TsCore.getSourceFileFromSymbol(dependencySymbol);
                    if (dependencyFile && !dependencyFile.isDeclarationFile) {
                        var dependencyFileName = _this.compilerHost.getCanonicalFileName(dependencyFile.fileName);
                        var dependencyNodes = moduleDependencies[dependencyFileName];
                        if (dependencyNodes) {
                            _this.processModuleDependencies(moduleDependencyNode, dependencyNodes);
                        }
                        if (!Utilities_1.Utils.hasProperty(_this.bundleImportedFiles, dependencyFileName)) {
                            _this.addSourceFile(dependencyFile);
                        }
                    }
                    else {
                        if (moduleDependencyNode.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
                            // For ImportEqualsDeclarations we emit the import declaration
                            // if it hasn't already been added to the bundle.
                            // Get the import and module names
                            var importName = moduleDependencyNode.name.text;
                            var moduleName = _this.getImportModuleName(moduleDependencyNode);
                            if (_this.addModuleImport(moduleName, importName)) {
                                _this.emitModuleImportDeclaration(moduleDependencyNode.getText());
                            }
                        }
                        else {
                            // ImportDeclaration kind..
                            if (moduleDependencyNode.kind === ts.SyntaxKind.ImportDeclaration) {
                                _this.writeImportDeclaration(moduleDependencyNode);
                            }
                        }
                    }
                });
            }
            // Finally, add bundle source file
            this_1.addSourceFile(bundleSourceFile);
            this_1.dependencyWalkTime += new Date().getTime() - startTime;
        };
        var this_1 = this;
        var mergeKey, moduleFileName, moduleDependencyNodes;
        for (var filesKey in bundle.fileNames) {
            var state_1 = _loop_1();
            if (typeof state_1 === "object") return state_1.value;
        }
        // The text for our bundle is the concatenation of import statements and source code
        var bundleText = this.bundleImportText;
        if (bundle.config.package.getPackageType() === 1 /* Library */) {
            // Wrap the bundle in an exported namespace with the bundle name
            bundleText += "export namespace " + bundle.config.package.getPackageNamespace() + " {\r\n";
            bundleText += this.bundleCodeText;
            bundleText += " \r\n}";
        }
        else {
            bundleText += this.bundleCodeText;
        }
        var bundleExtension = isBundleTsx ? ".tsx" : ".ts";
        var bundleFile = { path: bundleFilePath + bundleExtension, extension: bundleExtension, text: bundleText };
        this.buildTime = new Date().getTime() - this.buildTime;
        if (this.program.getCompilerOptions().diagnostics) {
            this.reportStatistics();
        }
        return new BundleResult_1.BundleResult(ts.ExitStatus.Success, undefined, bundleFile);
    };
    BundleBuilder.prototype.processModuleDependencies = function (moduleDependencyNode, dependencyNodes) {
        for (var _i = 0, dependencyNodes_1 = dependencyNodes; _i < dependencyNodes_1.length; _i++) {
            var dependencyNode = dependencyNodes_1[_i];
            var dependencySymbol = this.getSymbolFromNode(dependencyNode);
            var dependencyFile = TsCore_1.TsCore.getSourceFileFromSymbol(dependencySymbol);
            if (dependencyFile && !dependencyFile.isDeclarationFile) {
                var dependencyFileName = this.compilerHost.getCanonicalFileName(dependencyFile.fileName);
                var dependencyBindings = this.getNamedBindingsFromImport(dependencyNode);
                if (this.isInheritedBinding(moduleDependencyNode, dependencyBindings)) {
                    // Add the dependency file to the bundle now if it is required for inheritance. 
                    if (!Utilities_1.Utils.hasProperty(this.bundleImportedFiles, dependencyFileName)) {
                        this.addSourceFile(dependencyFile);
                    }
                }
            }
        }
    };
    BundleBuilder.prototype.isInheritedBinding = function (dependencyNode, namedBindings) {
        var dependencySymbol = this.getSymbolFromNode(dependencyNode);
        var exports = this.program.getTypeChecker().getExportsOfModule(dependencySymbol);
        for (var _i = 0, exports_1 = exports; _i < exports_1.length; _i++) {
            var exportedSymbol = exports_1[_i];
            var exportType = this.program.getTypeChecker().getDeclaredTypeOfSymbol(exportedSymbol);
            var baseTypes = this.program.getTypeChecker().getBaseTypes(exportType);
            for (var _a = 0, baseTypes_1 = baseTypes; _a < baseTypes_1.length; _a++) {
                var baseType = baseTypes_1[_a];
                var baseTypeName = baseType.symbol.getName();
                if (namedBindings.indexOf(baseTypeName) >= 0) {
                    Logger_1.Logger.info("Base class inheritance found", baseTypeName);
                    return true;
                }
            }
        }
        return false;
    };
    BundleBuilder.prototype.getImportModuleName = function (node) {
        if (node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference) {
            var moduleReference = node.moduleReference;
            return moduleReference.expression.text;
        }
        else {
            // TJT: This code should never be hit as we currently do not process dependencies of this kind. 
            return node.moduleReference.getText();
        }
    };
    BundleBuilder.prototype.addModuleImport = function (moduleName, importName) {
        if (!Utilities_1.Utils.hasProperty(this.bundleModuleImports, moduleName)) {
            this.bundleModuleImports[moduleName] = {};
        }
        var moduleImports = this.bundleModuleImports[moduleName];
        if (!Utilities_1.Utils.hasProperty(moduleImports, importName)) {
            moduleImports[importName] = importName;
            return true;
        }
        return false;
    };
    BundleBuilder.prototype.writeImportDeclaration = function (node) {
        var _this = this;
        if (!node.importClause) {
            return;
        }
        var moduleName = node.moduleSpecifier.text;
        var importToWrite = "import ";
        var hasDefaultBinding = false;
        var hasNamedBindings = false;
        if (node.importClause) {
            if (node.importClause.name && this.addModuleImport(moduleName, node.importClause.name.text)) {
                importToWrite += node.importClause.name.text;
                hasDefaultBinding = true;
            }
        }
        if (node.importClause.namedBindings) {
            if (node.importClause.namedBindings.kind === ts.SyntaxKind.NamespaceImport) {
                if (this.addModuleImport(moduleName, node.importClause.namedBindings.name.text)) {
                    if (hasDefaultBinding) {
                        importToWrite += ", ";
                    }
                    importToWrite += "* as ";
                    importToWrite += node.importClause.namedBindings.name.text;
                    hasNamedBindings = true;
                }
            }
            else {
                if (hasDefaultBinding) {
                    importToWrite += ", ";
                }
                importToWrite += "{ ";
                Utilities_1.Utils.forEach(node.importClause.namedBindings.elements, function (element) {
                    if (_this.addModuleImport(moduleName, element.name.text)) {
                        if (!hasNamedBindings) {
                            hasNamedBindings = true;
                        }
                        else {
                            importToWrite += ", ";
                        }
                        var alias = element.propertyName;
                        if (alias) {
                            importToWrite += alias.text + " as " + element.name.text;
                        }
                        else {
                            importToWrite += element.name.text;
                        }
                    }
                });
                importToWrite += " }";
            }
        }
        importToWrite += " from ";
        importToWrite += node.moduleSpecifier.getText();
        importToWrite += ";";
        if (hasDefaultBinding || hasNamedBindings) {
            this.emitModuleImportDeclaration(importToWrite);
        }
    };
    BundleBuilder.prototype.processImportExports = function (file) {
        var _this = this;
        Logger_1.Logger.info("Processing import statements and export declarations in file: ", file.fileName);
        var editText = file.text;
        ts.forEachChild(file, function (node) {
            if (node.kind === ts.SyntaxKind.ImportDeclaration || node.kind === ts.SyntaxKind.ImportEqualsDeclaration || node.kind === ts.SyntaxKind.ExportDeclaration) {
                Logger_1.Logger.info("processImportStatements() found import");
                var moduleNameExpression = TsCore_1.TsCore.getExternalModuleName(node);
                if (moduleNameExpression && moduleNameExpression.kind === ts.SyntaxKind.StringLiteral) {
                    var moduleSymbol = _this.program.getTypeChecker().getSymbolAtLocation(moduleNameExpression);
                    if ((moduleSymbol) && (_this.isSourceCodeModule(moduleSymbol) || _this.isAmbientModule)) {
                        Logger_1.Logger.info("processImportStatements() removing code module symbol.");
                        editText = _this.whiteOut(node.pos, node.end, editText);
                    }
                }
            }
            else {
                if (_this.bundle.config.package.getPackageType() === 2 /* Component */) {
                    if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
                        var module_1 = node;
                        if (module_1.name.getText() !== _this.bundle.config.package.getPackageNamespace()) {
                            if (module_1.flags & ts.NodeFlags.Export) {
                                Logger_1.Logger.info("Component namespace not package namespace. Removing export modifier.");
                                var nodeModifier = module_1.modifiers[0];
                                editText = _this.whiteOut(nodeModifier.pos, nodeModifier.end, editText);
                            }
                        }
                    }
                    else {
                        if (node.flags & ts.NodeFlags.Export) {
                            var exportModifier = node.modifiers[0];
                            editText = _this.whiteOut(exportModifier.pos, exportModifier.end, editText);
                        }
                    }
                }
            }
        });
        return editText;
    };
    BundleBuilder.prototype.whiteOut = function (pos, end, text) {
        var length = end - pos;
        var whiteSpace = "";
        for (var i = 0; i < length; i++) {
            whiteSpace += " ";
        }
        var prefix = text.substring(0, pos);
        var suffix = text.substring(end);
        return prefix + whiteSpace + suffix;
    };
    BundleBuilder.prototype.emitModuleImportDeclaration = function (moduleBlockText) {
        Logger_1.Logger.info("Entering emitModuleImportDeclaration()");
        this.bundleImportText += moduleBlockText + "\n";
    };
    BundleBuilder.prototype.addSourceFile = function (file) {
        Logger_1.Logger.info("Entering addSourceFile() with: ", file.fileName);
        if (this.isSourceCodeFile(file)) {
            // Before adding the source text, we must white out non-external import statements and
            // white out export modifiers where applicable
            var editText = this.processImportExports(file);
            this.bundleCodeText += editText + "\n";
            var sourceFileName = this.compilerHost.getCanonicalFileName(file.fileName);
            this.bundleImportedFiles[sourceFileName] = sourceFileName;
        }
        else {
            // Add typescript definition files to the build source files context
            if (!Utilities_1.Utils.hasProperty(this.bundleSourceFiles, file.fileName)) {
                Logger_1.Logger.info("Adding definition file to bundle source context: ", file.fileName);
                this.bundleSourceFiles[file.fileName] = file.text;
            }
        }
    };
    BundleBuilder.prototype.isSourceCodeFile = function (file) {
        return (file.kind === ts.SyntaxKind.SourceFile && !file.isDeclarationFile);
    };
    BundleBuilder.prototype.isSourceCodeModule = function (importSymbol) {
        var declaration = importSymbol.getDeclarations()[0];
        return ((declaration.kind === ts.SyntaxKind.SourceFile) && !(declaration.isDeclarationFile));
    };
    BundleBuilder.prototype.isAmbientModule = function (importSymbol) {
        var declaration = importSymbol.getDeclarations()[0];
        return ((declaration.kind === ts.SyntaxKind.ModuleDeclaration) && ((declaration.flags & ts.NodeFlags.Ambient) > 0));
    };
    // TJT: Review duplicate code. Move to TsCore pass program as arg.
    BundleBuilder.prototype.getSymbolFromNode = function (node) {
        var moduleNameExpr = TsCore_1.TsCore.getExternalModuleName(node);
        if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
            return this.program.getTypeChecker().getSymbolAtLocation(moduleNameExpr);
        }
    };
    BundleBuilder.prototype.getNamedBindingsFromImport = function (node) {
        var bindingNames = [];
        var namedBindings = node.importClause.namedBindings;
        if (namedBindings) {
            switch (namedBindings.kind) {
                case ts.SyntaxKind.NamespaceImport:
                    break;
                case ts.SyntaxKind.NamedImports:
                    for (var _i = 0, _a = namedBindings.elements; _i < _a.length; _i++) {
                        var importBinding = _a[_i];
                        bindingNames.push(importBinding.getText());
                    }
                    break;
            }
        }
        return bindingNames;
    };
    BundleBuilder.prototype.reportStatistics = function () {
        var statisticsReporter = new StatisticsReporter_1.StatisticsReporter();
        statisticsReporter.reportTime("Deps gen time", this.dependencyTime);
        statisticsReporter.reportTime("Deps walk time", this.dependencyWalkTime);
        statisticsReporter.reportTime("Source gen time", this.buildTime);
    };
    return BundleBuilder;
}());
exports.BundleBuilder = BundleBuilder;
