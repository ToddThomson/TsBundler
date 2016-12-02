"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chalk = require("chalk");
var ts = require("typescript");
var stream = require("stream");
var fs = require("fs");
var path = require("path");
var _ = require("lodash");
var fileGlob = require("glob");
var ts2js = require("ts2js");
var tsMinifier = require("tsminifier");
var File = require("vinyl");
var BundlePackageType;
(function (BundlePackageType) {
    BundlePackageType[BundlePackageType["None"] = 0] = "None";
    BundlePackageType[BundlePackageType["Library"] = 1] = "Library";
    BundlePackageType[BundlePackageType["Component"] = 2] = "Component";
})(BundlePackageType || (BundlePackageType = {}));
var BundlePackage = (function () {
    function BundlePackage(packageType, packageNamespace) {
        this.packageNamespace = undefined;
        this.packageType = packageType;
        this.packageNamespace = packageNamespace;
    }
    BundlePackage.prototype.getPackageType = function () {
        return this.packageType;
    };
    BundlePackage.prototype.getPackageNamespace = function () {
        return this.packageNamespace;
    };
    return BundlePackage;
}());
var level = {
    none: 0,
    error: 1,
    warn: 2,
    trace: 3,
    info: 4
};
var Logger = (function () {
    function Logger() {
    }
    Logger.setLevel = function (level) {
        this.logLevel = level;
    };
    Logger.setName = function (name) {
        this.logName = name;
    };
    Logger.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log.apply(console, [chalk.gray("[" + this.logName + "]")].concat(args));
    };
    Logger.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (this.logLevel < level.info) {
            return;
        }
        console.log.apply(console, [chalk.gray(("[" + this.logName + "]") + chalk.blue(" INFO: "))].concat(args));
    };
    Logger.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (this.logLevel < level.warn) {
            return;
        }
        console.log.apply(console, [("[" + this.logName + "]") + chalk.yellow(" WARNING: ")].concat(args));
    };
    Logger.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (this.logLevel < level.error) {
            return;
        }
        console.log.apply(console, [("[" + this.logName + "]") + chalk.red(" ERROR: ")].concat(args));
    };
    Logger.trace = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        if (this.logLevel < level.error) {
            return;
        }
        console.log.apply(console, [("[" + this.logName + "]") + chalk.gray(" TRACE: ")].concat(args));
    };
    Logger.logLevel = level.none;
    Logger.logName = "logger";
    return Logger;
}());
var Utils;
(function (Utils) {
    function forEach(array, callback) {
        if (array) {
            for (var i = 0, len = array.length; i < len; i++) {
                var result = callback(array[i], i);
                if (result) {
                    return result;
                }
            }
        }
        return undefined;
    }
    Utils.forEach = forEach;
    function contains(array, value) {
        if (array) {
            for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
                var v = array_1[_i];
                if (v === value) {
                    return true;
                }
            }
        }
        return false;
    }
    Utils.contains = contains;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function hasProperty(map, key) {
        return hasOwnProperty.call(map, key);
    }
    Utils.hasProperty = hasProperty;
    function clone(object) {
        var result = {};
        for (var id in object) {
            result[id] = object[id];
        }
        return result;
    }
    Utils.clone = clone;
    function map(array, f) {
        var result;
        if (array) {
            result = [];
            for (var _i = 0, array_2 = array; _i < array_2.length; _i++) {
                var v = array_2[_i];
                result.push(f(v));
            }
        }
        return result;
    }
    Utils.map = map;
    function extend(first, second) {
        var sentinal = 1;
        var result = {};
        for (var id in first) {
            result[id] = first[id];
        }
        for (var id in second) {
            if (!hasProperty(result, id)) {
                result[id] = second[id];
            }
        }
        return result;
    }
    Utils.extend = extend;
    function replaceAt(str, index, character) {
        return str.substr(0, index) + character + str.substr(index + character.length);
    }
    Utils.replaceAt = replaceAt;
})(Utils || (Utils = {}));
var TsCore;
(function (TsCore) {
    function fileExtensionIs(path, extension) {
        var pathLen = path.length;
        var extLen = extension.length;
        return pathLen > extLen && path.substr(pathLen - extLen, extLen) === extension;
    }
    TsCore.fileExtensionIs = fileExtensionIs;
    TsCore.supportedExtensions = [".ts", ".tsx", ".d.ts"];
    TsCore.moduleFileExtensions = TsCore.supportedExtensions;
    function isSupportedSourceFileName(fileName) {
        if (!fileName) {
            return false;
        }
        for (var _i = 0, supportedExtensions_1 = TsCore.supportedExtensions; _i < supportedExtensions_1.length; _i++) {
            var extension = supportedExtensions_1[_i];
            if (fileExtensionIs(fileName, extension)) {
                return true;
            }
        }
        return false;
    }
    TsCore.isSupportedSourceFileName = isSupportedSourceFileName;
    function getSourceFileFromSymbol(symbol) {
        var declarations = symbol.getDeclarations();
        if (declarations && declarations.length > 0) {
            if (declarations[0].kind === ts.SyntaxKind.SourceFile) {
                return declarations[0].getSourceFile();
            }
        }
        return undefined;
    }
    TsCore.getSourceFileFromSymbol = getSourceFileFromSymbol;
    function getExternalModuleName(node) {
        if (node.kind === ts.SyntaxKind.ImportDeclaration) {
            return node.moduleSpecifier;
        }
        if (node.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
            var reference = node.moduleReference;
            if (reference.kind === ts.SyntaxKind.ExternalModuleReference) {
                return reference.expression;
            }
        }
        if (node.kind === ts.SyntaxKind.ExportDeclaration) {
            return node.moduleSpecifier;
        }
        return undefined;
    }
    TsCore.getExternalModuleName = getExternalModuleName;
    function createDiagnostic(message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        // FUTURE: Typescript 1.8.x supports localized diagnostic messages.
        var textUnique123 = message.message;
        if (arguments.length > 1) {
            textUnique123 = formatStringFromArgs(textUnique123, arguments, 1);
        }
        return {
            file: undefined,
            start: undefined,
            length: undefined,
            messageText: textUnique123,
            category: message.category,
            code: message.code
        };
    }
    TsCore.createDiagnostic = createDiagnostic;
    function formatStringFromArgs(text, args, baseIndex) {
        baseIndex = baseIndex || 0;
        return text.replace(/{(\d+)}/g, function (match, index) {
            return args[+index + baseIndex];
        });
    }
    // An alias symbol is created by one of the following declarations:
    // import <symbol> = ...
    // import <symbol> from ...
    // import * as <symbol> from ...
    // import { x as <symbol> } from ...
    // export { x as <symbol> } from ...
    // export = ...
    // export default ...
    function isAliasSymbolDeclaration(node) {
        return node.kind === ts.SyntaxKind.ImportEqualsDeclaration ||
            node.kind === ts.SyntaxKind.ImportClause && !!node.name ||
            node.kind === ts.SyntaxKind.NamespaceImport ||
            node.kind === ts.SyntaxKind.ImportSpecifier ||
            node.kind === ts.SyntaxKind.ExportSpecifier ||
            node.kind === ts.SyntaxKind.ExportAssignment && node.expression.kind === ts.SyntaxKind.Identifier;
    }
    TsCore.isAliasSymbolDeclaration = isAliasSymbolDeclaration;
    function normalizeSlashes(path) {
        return path.replace(/\\/g, "/");
    }
    TsCore.normalizeSlashes = normalizeSlashes;
    function outputExtension(path) {
        return path.replace(/\.ts/, ".js");
    }
    TsCore.outputExtension = outputExtension;
})(TsCore || (TsCore = {}));
var BundleParser = (function () {
    function BundleParser() {
    }
    BundleParser.prototype.parseConfigFile = function (json, basePath) {
        var errors = [];
        return {
            bundles: getBundles(),
            errors: errors
        };
        function getBundles() {
            var bundles = [];
            var jsonBundles = json["bundles"];
            if (jsonBundles) {
                Logger.info(jsonBundles);
                for (var id in jsonBundles) {
                    Logger.info("Bundle Id: ", id, jsonBundles[id]);
                    var jsonBundle = jsonBundles[id];
                    var bundleName;
                    var fileNames = [];
                    var config = {};
                    // Name
                    bundleName = path.join(basePath, id);
                    // Files..
                    if (Utils.hasProperty(jsonBundle, "files")) {
                        if (jsonBundle["files"] instanceof Array) {
                            fileNames = Utils.map(jsonBundle["files"], function (s) { return path.join(basePath, s); });
                            Logger.info("bundle files: ", fileNames);
                        }
                        else {
                            errors.push(TsCore.createDiagnostic({ code: 6063, category: ts.DiagnosticCategory.Error, key: "Bundle_0_files_is_not_an_array_6063", message: "Bundle '{0}' files is not an array." }, id));
                        }
                    }
                    else {
                        errors.push(TsCore.createDiagnostic({ code: 6062, category: ts.DiagnosticCategory.Error, key: "Bundle_0_requires_an_array_of_files_6062", message: "Bundle '{0}' requires an array of files." }, id));
                    }
                    // Config..
                    if (Utils.hasProperty(jsonBundle, "config")) {
                        config = jsonBundle.config;
                    }
                    config.package = parsePackageConfig(config);
                    bundles.push({ name: bundleName, fileNames: fileNames, config: config });
                }
            }
            return bundles;
        }
        function parsePackageConfig(config) {
            // TODO: Add diagnostics for input errors..
            var bundlePackageType = 0 /* None */;
            var bundlePackageNamespace = undefined;
            var packageTypeMap = {
                "none": 0 /* None */,
                "library": 1 /* Library */,
                "component": 2 /* Component */
            };
            if (Utils.hasProperty(config, "package")) {
                var packageType = config["package"];
                if (typeof (packageType) === "string") {
                    if (Utils.hasProperty(packageTypeMap, packageType.toLowerCase())) {
                        bundlePackageType = packageTypeMap[packageType.toLowerCase()];
                    }
                }
            }
            if (Utils.hasProperty(config, "packageNamespace")) {
                var packageNamespace = config["packageNamespace"];
                if (typeof (packageNamespace) === "string") {
                    bundlePackageNamespace = packageNamespace;
                }
            }
            return new BundlePackage(bundlePackageType, bundlePackageNamespace);
        }
    };
    return BundleParser;
}());
var Glob = (function () {
    function Glob() {
    }
    Glob.prototype.hasPattern = function (pattern) {
        var g = new fileGlob.Glob(pattern);
        var minimatchSet = g.minimatch.set;
        if (minimatchSet.length > 1)
            return true;
        for (var j = 0; j < minimatchSet[0].length; j++) {
            if (typeof minimatchSet[0][j] !== 'string')
                return true;
        }
        return false;
    };
    Glob.prototype.expand = function (patterns, root) {
        if (patterns.length === 0) {
            return [];
        }
        var matches = this.processPatterns(patterns, function (pattern) {
            return fileGlob.sync(pattern, { root: root });
        });
        return matches;
    };
    Glob.prototype.processPatterns = function (patterns, fn) {
        var result = [];
        _.flatten(patterns).forEach(function (pattern) {
            var exclusion;
            var matches;
            exclusion = _.isString(pattern) && pattern.indexOf("!") === 0;
            if (exclusion) {
                pattern = pattern.slice(1);
            }
            matches = fn(pattern);
            if (exclusion) {
                return result = _.difference(result, matches);
            }
            else {
                return result = _.union(result, matches);
            }
        });
        return result;
    };
    return Glob;
}());
var StatisticsReporter = (function () {
    function StatisticsReporter() {
    }
    StatisticsReporter.prototype.reportTitle = function (name) {
        Logger.log(name);
    };
    StatisticsReporter.prototype.reportValue = function (name, value) {
        Logger.log(this.padRight(name + ":", 25) + chalk.magenta(this.padLeft(value.toString(), 10)));
    };
    StatisticsReporter.prototype.reportCount = function (name, count) {
        this.reportValue(name, "" + count);
    };
    StatisticsReporter.prototype.reportTime = function (name, time) {
        this.reportValue(name, (time / 1000).toFixed(2) + "s");
    };
    StatisticsReporter.prototype.reportPercentage = function (name, percentage) {
        this.reportValue(name, percentage.toFixed(2) + "%");
    };
    StatisticsReporter.prototype.padLeft = function (s, length) {
        while (s.length < length) {
            s = " " + s;
        }
        return s;
    };
    StatisticsReporter.prototype.padRight = function (s, length) {
        while (s.length < length) {
            s = s + " ";
        }
        return s;
    };
    return StatisticsReporter;
}());
var BundleResult = (function () {
    function BundleResult(errors, bundleSource) {
        this.errors = errors;
        this.bundleSource = bundleSource;
    }
    BundleResult.prototype.getBundleSource = function () {
        return this.bundleSource;
    };
    BundleResult.prototype.getErrors = function () {
        return this.errors;
    };
    BundleResult.prototype.succeeded = function () {
        return (this.errors.length == 0);
    };
    return BundleResult;
}());
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
                if (!Utils.hasProperty(importWalked, canonicalFileName)) {
                    importWalked[canonicalFileName] = true;
                    // Build dependencies bottom up, left to right by recursively calling walkModuleImports
                    if (!importSourceFile.isDeclarationFile) {
                        Logger.info("Walking Import module: ", canonicalFileName);
                        walkModuleImports(self.getImportsOfModule(importSourceFile));
                    }
                }
                if (!Utils.hasProperty(dependencies, canonicalFileName)) {
                    Logger.info("Getting and adding imports of module file: ", canonicalFileName);
                    dependencies[canonicalFileName] = self.getImportsOfModule(importSourceFile);
                }
            });
        }
        // Get the top level source file imports
        var sourceFileImports = self.getImportsOfModule(sourceFile);
        // Walk the module import tree
        walkModuleImports(sourceFileImports);
        var canonicalSourceFileName = self.host.getCanonicalFileName(sourceFile.fileName);
        if (!Utils.hasProperty(dependencies, canonicalSourceFileName)) {
            Logger.info("Adding top level import dependencies for file: ", canonicalSourceFileName);
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
                    var moduleNameExpr = TsCore.getExternalModuleName(node);
                    if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
                        var moduleSymbol = self.program.getTypeChecker().getSymbolAtLocation(moduleNameExpr);
                        if (moduleSymbol) {
                            Logger.info("Adding import node: ", moduleSymbol.name);
                            importNodes.push(node);
                        }
                        else {
                            Logger.warn("Module symbol not found");
                        }
                    }
                }
                else if (node.kind === ts.SyntaxKind.ModuleDeclaration && node.name.kind === ts.SyntaxKind.StringLiteral && (node.flags & ts.NodeFlags.Ambient || file.isDeclarationFile)) {
                    // An AmbientExternalModuleDeclaration declares an external module.
                    var moduleDeclaration = node;
                    Logger.info("Processing ambient module declaration: ", moduleDeclaration.name.text);
                    getImports(node.body);
                }
            });
        }
        ;
        Logger.info("Getting imports for source file: ", file.fileName);
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
        var moduleNameExpr = TsCore.getExternalModuleName(node);
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
var BuildResult = (function () {
    function BuildResult(errors, bundles) {
        this.errors = errors;
        this.bundleOutput = bundles;
    }
    BuildResult.prototype.succeeded = function () {
        return (this.errors.length == 0);
    };
    return BuildResult;
}());
var DiagnosticsReporter = (function () {
    function DiagnosticsReporter() {
    }
    DiagnosticsReporter.reportDiagnostics = function (diagnostics) {
        if (!diagnostics) {
            return;
        }
        for (var i = 0; i < diagnostics.length; i++) {
            this.reportDiagnostic(diagnostics[i]);
        }
    };
    DiagnosticsReporter.reportDiagnostic = function (diagnostic) {
        if (!diagnostic) {
            return;
        }
        var output = "";
        if (diagnostic.file) {
            var loc = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
            output += chalk.gray(diagnostic.file.fileName + "(" + (loc.line + 1) + "," + (loc.character + 1) + "): ");
        }
        var category;
        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Error:
                category = chalk.red(ts.DiagnosticCategory[diagnostic.category].toLowerCase());
                break;
            case ts.DiagnosticCategory.Warning:
                category = chalk.yellow(ts.DiagnosticCategory[diagnostic.category].toLowerCase());
                break;
            default:
                category = chalk.green(ts.DiagnosticCategory[diagnostic.category].toLowerCase());
        }
        output += category + " TS" + chalk.white(diagnostic.code + '') + ": " + chalk.grey(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        Logger.log(output);
    };
    return DiagnosticsReporter;
}());
var BuildStream = (function (_super) {
    __extends(BuildStream, _super);
    function BuildStream(opts) {
        _super.call(this, { objectMode: true });
    }
    BuildStream.prototype._read = function () {
        // Safely do nothing
    };
    return BuildStream;
}(stream.Readable));
var BundleBuilder = (function () {
    function BundleBuilder(host, program) {
        this.dependencyTime = 0;
        this.dependencyWalkTime = 0;
        this.emitTime = 0;
        this.buildTime = 0;
        this.bundleCodeText = "";
        this.bundleImportText = "";
        this.bundleImportedFiles = {};
        this.bundleModuleImports = {};
        this.bundleSourceFiles = {};
        this.host = host;
        this.program = program;
    }
    BundleBuilder.prototype.build = function (bundle) {
        var _this = this;
        this.bundle = bundle;
        this.buildTime = new Date().getTime();
        var dependencyBuilder = new DependencyBuilder(this.host, this.program);
        // Construct bundle output file name
        var bundleBaseDir = path.dirname(bundle.name);
        if (bundle.config.outDir) {
            bundleBaseDir = path.join(bundleBaseDir, bundle.config.outDir);
        }
        var bundleFilePath = path.join(bundleBaseDir, path.basename(bundle.name));
        bundleFilePath = TsCore.normalizeSlashes(bundleFilePath);
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
            Logger.info(">>> Processing bundle file:", fileName);
            var bundleSourceFileName = this_1.host.getCanonicalFileName(TsCore.normalizeSlashes(fileName));
            Logger.info("BundleSourceFileName:", bundleSourceFileName);
            var bundleSourceFile = this_1.program.getSourceFile(bundleSourceFileName);
            if (!bundleSourceFile) {
                var diagnostic = TsCore.createDiagnostic({ code: 6060, category: ts.DiagnosticCategory.Error, key: "Bundle_source_file_0_not_found_6060", message: "Bundle source file '{0}' not found." }, bundleSourceFileName);
                return { value: new BundleResult([diagnostic]) };
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
                if (!Utils.hasProperty(allDependencies, mergeKey)) {
                    allDependencies[mergeKey] = moduleDependencies[mergeKey];
                }
            }
            startTime = new Date().getTime();
            Logger.info("Traversing module dependencies for bundle: ", bundleSourceFile.fileName);
            for (moduleFileName in moduleDependencies) {
                Logger.info("Walking dependency nodes for module: ", moduleFileName);
                moduleDependencyNodes = moduleDependencies[moduleFileName];
                moduleDependencyNodes.forEach(function (moduleDependencyNode) {
                    // Obtain the source file from the dependency node ( usually an import statement )
                    // REVIEW: Combine these.
                    var dependencySymbol = _this.getSymbolFromNode(moduleDependencyNode);
                    var dependencyFile = TsCore.getSourceFileFromSymbol(dependencySymbol);
                    if (dependencyFile && !dependencyFile.isDeclarationFile) {
                        var dependencyFileName = _this.host.getCanonicalFileName(dependencyFile.fileName);
                        var dependencyNodes = moduleDependencies[dependencyFileName];
                        if (dependencyNodes) {
                            _this.processModuleDependencies(moduleDependencyNode, dependencyNodes);
                        }
                        if (!Utils.hasProperty(_this.bundleImportedFiles, dependencyFileName)) {
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
        return new BundleResult([], bundleFile);
    };
    BundleBuilder.prototype.processModuleDependencies = function (moduleDependencyNode, dependencyNodes) {
        for (var _i = 0, dependencyNodes_1 = dependencyNodes; _i < dependencyNodes_1.length; _i++) {
            var dependencyNode = dependencyNodes_1[_i];
            var dependencySymbol = this.getSymbolFromNode(dependencyNode);
            var dependencyFile = TsCore.getSourceFileFromSymbol(dependencySymbol);
            if (dependencyFile && !dependencyFile.isDeclarationFile) {
                var dependencyFileName = this.host.getCanonicalFileName(dependencyFile.fileName);
                var dependencyBindings = this.getNamedBindingsFromImport(dependencyNode);
                if (this.isInheritedBinding(moduleDependencyNode, dependencyBindings)) {
                    // Add the dependency file to the bundle now if it is required for inheritance. 
                    if (!Utils.hasProperty(this.bundleImportedFiles, dependencyFileName)) {
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
                    Logger.info("Base class inheritance found", baseTypeName);
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
        if (!Utils.hasProperty(this.bundleModuleImports, moduleName)) {
            this.bundleModuleImports[moduleName] = {};
        }
        var moduleImports = this.bundleModuleImports[moduleName];
        if (!Utils.hasProperty(moduleImports, importName)) {
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
                Utils.forEach(node.importClause.namedBindings.elements, function (element) {
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
        Logger.info("Processing import statements and export declarations in file: ", file.fileName);
        var editText = file.text;
        ts.forEachChild(file, function (node) {
            if (node.kind === ts.SyntaxKind.ImportDeclaration || node.kind === ts.SyntaxKind.ImportEqualsDeclaration || node.kind === ts.SyntaxKind.ExportDeclaration) {
                Logger.info("processImportStatements() found import");
                var moduleNameExpression = TsCore.getExternalModuleName(node);
                if (moduleNameExpression && moduleNameExpression.kind === ts.SyntaxKind.StringLiteral) {
                    var moduleSymbol = _this.program.getTypeChecker().getSymbolAtLocation(moduleNameExpression);
                    if ((moduleSymbol) && (_this.isSourceCodeModule(moduleSymbol) || _this.isAmbientModule)) {
                        Logger.info("processImportStatements() removing code module symbol.");
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
                                Logger.info("Component namespace not package namespace. Removing export modifier.");
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
        Logger.info("Entering emitModuleImportDeclaration()");
        this.bundleImportText += moduleBlockText + "\n";
    };
    BundleBuilder.prototype.addSourceFile = function (file) {
        Logger.info("Entering addSourceFile() with: ", file.fileName);
        if (this.isSourceCodeFile(file)) {
            // Before adding the source text, we must white out non-external import statements and
            // white out export modifiers where applicable
            var editText = this.processImportExports(file);
            this.bundleCodeText += editText + "\n";
            var sourceFileName = this.host.getCanonicalFileName(file.fileName);
            this.bundleImportedFiles[sourceFileName] = sourceFileName;
        }
        else {
            // Add typescript definition files to the build source files context
            if (!Utils.hasProperty(this.bundleSourceFiles, file.fileName)) {
                Logger.info("Adding definition file to bundle source context: ", file.fileName);
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
        var moduleNameExpr = TsCore.getExternalModuleName(node);
        if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
            return this.program.getTypeChecker().getSymbolAtLocation(moduleNameExpr);
        }
        return undefined;
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
        var statisticsReporter = new StatisticsReporter();
        statisticsReporter.reportTime("Deps gen time", this.dependencyTime);
        statisticsReporter.reportTime("Deps walk time", this.dependencyWalkTime);
        statisticsReporter.reportTime("Source gen time", this.buildTime);
    };
    return BundleBuilder;
}());
var Project = (function () {
    function Project(configFilePath, settings) {
        this.configFilePath = configFilePath;
        this.settings = settings || {};
        this.config = this.parseProjectConfig();
    }
    Project.prototype.getConfig = function () {
        return this.config;
    };
    Project.prototype.parseProjectConfig = function () {
        var _this = this;
        var configFileDir;
        try {
            var isConfigDirectory = fs.lstatSync(this.configFilePath).isDirectory();
        }
        catch (e) {
            var diagnostic = TsCore.createDiagnostic({ code: 6064, category: ts.DiagnosticCategory.Error, key: "Cannot_read_project_path_0_6064", message: "Cannot read project path '{0}'." }, this.configFilePath);
            return { success: false, errors: [diagnostic] };
        }
        if (isConfigDirectory) {
            configFileDir = this.configFilePath;
            this.configFileName = path.join(this.configFilePath, "tsconfig.json");
        }
        else {
            configFileDir = path.dirname(this.configFilePath);
            this.configFileName = this.configFilePath;
        }
        Logger.info("Reading config file:", this.configFileName);
        var readConfigResult = ts.readConfigFile(this.configFileName, this.readConfigFile);
        if (readConfigResult.error) {
            return { success: false, configFile: this.configFileName, errors: [readConfigResult.error] };
        }
        var configObject = readConfigResult.config;
        // Parse standard project configuration objects: compilerOptions, files.
        Logger.info("Parsing config file...");
        var configParseResult = ts.parseJsonConfigFileContent(configObject, ts.sys, configFileDir);
        if (configParseResult.errors.length > 0) {
            return { success: false, configFile: this.configFileName, errors: configParseResult.errors };
        }
        // The returned "Files" list may contain file glob patterns. 
        configParseResult.fileNames = this.expandFileNames(configParseResult.fileNames, configFileDir);
        // Parse "bundle" project configuration objects: compilerOptions, files.
        var bundleParser = new BundleParser();
        var bundlesParseResult = bundleParser.parseConfigFile(configObject, configFileDir);
        if (bundlesParseResult.errors.length > 0) {
            return { success: false, configFile: this.configFileName, errors: bundlesParseResult.errors };
        }
        // The returned bundles "Files" list may contain file glob patterns. 
        bundlesParseResult.bundles.forEach(function (bundle) {
            bundle.fileNames = _this.expandFileNames(bundle.fileNames, configFileDir);
        });
        // Parse the command line args to override project file compiler options
        var settingsCompilerOptions = this.getSettingsCompilerOptions(this.settings, configFileDir);
        // Check for any errors due to command line parsing
        if (settingsCompilerOptions.errors.length > 0) {
            return { success: false, configFile: this.configFileName, errors: settingsCompilerOptions.errors };
        }
        var compilerOptions = Utils.extend(settingsCompilerOptions.options, configParseResult.options);
        return {
            success: true,
            configFile: this.configFileName,
            bundlerOptions: this.settings,
            compilerOptions: compilerOptions,
            fileNames: configParseResult.fileNames,
            bundles: bundlesParseResult.bundles
        };
    };
    Project.prototype.readConfigFile = function (fileName) {
        return ts.sys.readFile(fileName);
    };
    Project.prototype.getSettingsCompilerOptions = function (jsonSettings, configDirPath) {
        // Parse the json settings from the TsProject src() API
        var parsedResult = ts.parseJsonConfigFileContent(jsonSettings, ts.sys, configDirPath);
        // Check for compiler options that are not relevent/supported.
        // Not supported: --project, --init
        // Ignored: --help, --version
        if (parsedResult.options.project) {
            var diagnostic = TsCore.createDiagnostic({ code: 5099, category: ts.DiagnosticCategory.Error, key: "The_compiler_option_0_is_not_supported_in_this_context_5099", message: "The compiler option '{0}' is not supported in this context." }, "--project");
            parsedResult.errors.push(diagnostic);
        }
        // FIXME: Perhaps no longer needed?
        //if ( parsedResult.options.init ) {
        //    let diagnostic = TsCore.createDiagnostic( { code: 5099, category: ts.DiagnosticCategory.Error, key: "The_compiler_option_0_is_not_supported_in_this_context_5099", message: "The compiler option '{0}' is not supported in this context." }, "--init" );
        //    parsedResult.errors.push( diagnostic );
        //}
        return parsedResult;
    };
    Project.prototype.expandFileNames = function (files, configDirPath) {
        // The parameter files may contain a mix of glob patterns and filenames.
        // glob.expand() will only return a list of all expanded "found" files. 
        // For filenames without glob patterns, we add them to the list of files as we will want to know
        // if any filenames are not found during bundle processing.
        var glob = new Glob();
        var nonglobFiles = [];
        Utils.forEach(files, function (file) {
            if (!glob.hasPattern(file)) {
                nonglobFiles.push(path.normalize(file));
            }
        });
        // Get the list of expanded glob files
        var globFiles = glob.expand(files, configDirPath);
        var normalizedGlobFiles = [];
        // Normalize file paths for matching
        Utils.forEach(globFiles, function (file) {
            normalizedGlobFiles.push(path.normalize(file));
        });
        // The overall file list is the union of both non-glob and glob files
        return _.union(normalizedGlobFiles, nonglobFiles);
    };
    Project.prototype.convertProjectFileNames = function (fileNames, configDirPath) {
        var configFileText = "";
        try {
            configFileText = fs.readFileSync(this.configFileName, 'utf8');
            if (configFileText !== undefined) {
                var jsonConfigObject = JSON.parse(configFileText);
                var relativeFileNames_1 = [];
                fileNames.forEach(function (fileName) {
                    relativeFileNames_1.push(path.relative(configDirPath, fileName).replace(/\\/g, "/"));
                });
                jsonConfigObject["files"] = relativeFileNames_1;
                fs.writeFileSync(this.configFileName, JSON.stringify(jsonConfigObject, undefined, 4));
            }
        }
        catch (e) {
            if (this.config.bundlerOptions.verbose) {
                Logger.log(chalk.yellow("Converting project files failed."));
            }
        }
    };
    return Project;
}());
var ProjectBuilder = (function () {
    function ProjectBuilder(project) {
        // TODO: move to BuildStatistics
        this.totalBuildTime = 0;
        this.totalCompileTime = 0;
        this.totalPreBuildTime = 0;
        this.totalBundleTime = 0;
        this.project = project;
        this.config = project.getConfig();
    }
    ProjectBuilder.prototype.build = function (buildCompleted) {
        var _this = this;
        if (!this.config.success) {
            DiagnosticsReporter.reportDiagnostics(this.config.errors);
            return buildCompleted(new BuildResult(this.config.errors));
        }
        // Perform the build..
        this.buildWorker(function (result) {
            // onBuildCompleted...
            _this.reportBuildStatus(result);
            return buildCompleted(result);
        });
    };
    ProjectBuilder.prototype.src = function () {
        if (!this.config.success && this.config.bundlerOptions.verbose) {
            DiagnosticsReporter.reportDiagnostics(this.config.errors);
            throw new Error("Invalid typescript configuration file" + this.config.configFile ? " " + this.config.configFile : "");
        }
        var outputStream = new BuildStream();
        // Perform the build..
        this.buildWorker(function (buildResult) {
            // onBuildCompleted..
            if (buildResult.succeeded) {
                buildResult.bundleOutput.forEach(function (compileResult) {
                    if (!compileResult.emitSkipped) {
                        compileResult.emitOutput.forEach(function (emit) {
                            if (!emit.emitSkipped) {
                                var vinylFile;
                                if (emit.codeFile) {
                                    vinylFile = new File({ path: emit.codeFile.fileName, contents: new Buffer(emit.codeFile.data) });
                                    outputStream.push(vinylFile);
                                }
                                if (emit.dtsFile) {
                                    vinylFile = new File({ path: emit.dtsFile.fileName, contents: new Buffer(emit.dtsFile.data) });
                                    outputStream.push(vinylFile);
                                }
                                if (emit.mapFile) {
                                    vinylFile = new File({ path: emit.mapFile.fileName, contents: new Buffer(emit.mapFile.data) });
                                    outputStream.push(vinylFile);
                                }
                            }
                        });
                    }
                });
            }
            outputStream.push(null);
        });
        return outputStream;
    };
    ProjectBuilder.prototype.buildWorker = function (buildCompleted) {
        var config = this.project.getConfig();
        if (config.bundlerOptions.verbose) {
            Logger.log("Building project with: " + chalk.magenta("" + config.configFile));
            Logger.log("TypeScript compiler version: ", ts.version);
        }
        this.totalBuildTime = this.totalPreBuildTime = new Date().getTime();
        var fileNames = config.fileNames;
        var bundles = config.bundles;
        var compilerOptions = config.compilerOptions;
        this.totalPreBuildTime = new Date().getTime() - this.totalPreBuildTime;
        // Compile the project...
        var compiler = new ts2js.Compiler(compilerOptions);
        if (this.config.bundlerOptions.verbose) {
            Logger.log("Compiling project files...");
        }
        this.totalCompileTime = new Date().getTime();
        var projectCompileResult = compiler.compile(fileNames);
        this.totalCompileTime = new Date().getTime() - this.totalCompileTime;
        if (projectCompileResult.diagnostics.length > 0) {
            DiagnosticsReporter.reportDiagnostics(projectCompileResult.diagnostics);
            return buildCompleted(new BuildResult(projectCompileResult.diagnostics));
        }
        var allDiagnostics = [];
        var bundleCompileResults = [];
        var bundlingResults = [];
        this.totalBundleTime = new Date().getTime();
        // Create a bundle builder to build bundles..
        var bundleBuilder = new BundleBuilder(compiler.getHost(), compiler.getProgram());
        for (var i = 0, len = bundles.length; i < len; i++) {
            if (this.config.bundlerOptions.verbose) {
                Logger.log("Building bundle: ", chalk.cyan(bundles[i].name));
            }
            var bundleResult = bundleBuilder.build(bundles[i]);
            bundlingResults.push(bundleResult);
            if (!bundleResult.succeeded()) {
                DiagnosticsReporter.reportDiagnostics(bundleResult.getErrors());
                allDiagnostics.concat(bundleResult.getErrors());
                continue;
            }
            var bundleSource = bundleResult.getBundleSource();
            var compileResult;
            if (bundles[i].config.minify) {
                compileResult = tsMinifier.minifyModule(bundleSource.text, bundleSource.path, compilerOptions, { mangleIdentifiers: true, removeWhitespace: true });
            }
            else {
                compileResult = ts2js.compileModule(bundleSource.text, bundleSource.path, compilerOptions);
            }
            bundleCompileResults.push(compileResult);
            if (this.config.bundlerOptions.verbose && (compileResult.diagnostics.length > 0)) {
                DiagnosticsReporter.reportDiagnostics(compileResult.diagnostics);
                allDiagnostics.concat(compileResult.diagnostics);
            }
        }
        this.totalBundleTime = new Date().getTime() - this.totalBundleTime;
        this.totalBuildTime = new Date().getTime() - this.totalBuildTime;
        if (compilerOptions.diagnostics) {
            this.reportStatistics();
        }
        return buildCompleted(new BuildResult(allDiagnostics, bundleCompileResults));
    };
    ProjectBuilder.prototype.reportBuildStatus = function (buildResult) {
        if (this.config.bundlerOptions.verbose) {
            if (buildResult.succeeded()) {
                Logger.log(chalk.green("Project build completed successfully."));
            }
            else {
                Logger.log(chalk.red("Build completed with errors."));
            }
        }
    };
    ProjectBuilder.prototype.reportStatistics = function () {
        if (this.config.bundlerOptions.verbose) {
            var statisticsReporter = new StatisticsReporter();
            statisticsReporter.reportTitle("Total build times...");
            statisticsReporter.reportTime("Pre-build time", this.totalPreBuildTime);
            statisticsReporter.reportTime("Compiling time", this.totalCompileTime);
            statisticsReporter.reportTime("Bundling time", this.totalBundleTime);
            statisticsReporter.reportTime("Build time", this.totalBuildTime);
        }
    };
    return ProjectBuilder;
}());
// Interface Types...
;
var TsBundler;
(function (TsBundler) {
    ;
    function builder(configFilePath, bundlerOptions, buildCompleted) {
        if (configFilePath === undefined && typeof configFilePath !== 'string') {
            throw new Error("Provide a valid directory or file path to the Typescript project configuration json file.");
        }
        bundlerOptions = bundlerOptions || {};
        bundlerOptions.logLevel = bundlerOptions.logLevel || 0;
        Logger.setLevel(bundlerOptions.logLevel);
        Logger.setName("TsBundler");
        var projectBuilder = new ProjectBuilder(new Project(configFilePath, bundlerOptions));
        if (buildCompleted) {
            projectBuilder.build(buildCompleted);
        }
        return projectBuilder;
    }
    TsBundler.builder = builder;
})(TsBundler = exports.TsBundler || (exports.TsBundler = {}));
// TJT: Comment out when testing locally
module.exports = TsBundler;
//# sourceMappingURL=tsbundler.js.map