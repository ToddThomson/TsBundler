"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk_1 = require("chalk");
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var PackageType;
(function (PackageType) {
    /** Default. No special processing. */
    PackageType[PackageType["None"] = 0] = "None";
    /** Wraps the bundle in an exported namespace with the bundle name.  */
    PackageType[PackageType["Library"] = 1] = "Library";
    /** For removing module export modifier. */
    PackageType[PackageType["Component"] = 2] = "Component";
})(PackageType || (PackageType = {}));
exports.PackageType = PackageType;
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
exports.BundlePackage = BundlePackage;
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
            args[_i] = arguments[_i];
        }
        console.log.apply(console, [chalk_1.default.gray("[" + this.logName + "]")].concat(args));
    };
    Logger.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.logLevel < level.info) {
            return;
        }
        console.log.apply(console, [chalk_1.default.gray("[" + this.logName + "]" + chalk_1.default.blue(" INFO: "))].concat(args));
    };
    Logger.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.logLevel < level.warn) {
            return;
        }
        console.log.apply(console, ["[" + this.logName + "]" + chalk_1.default.yellow(" WARNING: ")].concat(args));
    };
    Logger.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.logLevel < level.error) {
            return;
        }
        console.log.apply(console, ["[" + this.logName + "]" + chalk_1.default.red(" ERROR: ")].concat(args));
    };
    Logger.trace = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (this.logLevel < level.error) {
            return;
        }
        console.log.apply(console, ["[" + this.logName + "]" + chalk_1.default.gray(" TRACE: ")].concat(args));
    };
    return Logger;
}());
Logger.logLevel = level.none;
Logger.logName = "logger";
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
    function normalizeSlashes(path) {
        return path.replace(/\\/g, "/");
    }
    TsCore.normalizeSlashes = normalizeSlashes;
    function outputExtension(path) {
        return path.replace(/\.ts/, ".js");
    }
    TsCore.outputExtension = outputExtension;
    /**
     * Parse standard project configuration objects: compilerOptions, files.
     * @param configFilePath
     */
    function getProjectConfig(configFilePath) {
        var configFileDir;
        var configFileName;
        try {
            var isConfigDirectory = fs.lstatSync(configFilePath).isDirectory();
        }
        catch (e) {
            var diagnostic = TsCore.createDiagnostic({ code: 6064, category: ts.DiagnosticCategory.Error, key: "Cannot_read_project_path_0_6064", message: "Cannot read project path '{0}'." }, configFilePath);
            return {
                options: undefined,
                fileNames: [],
                errors: [diagnostic]
            };
        }
        if (isConfigDirectory) {
            configFileDir = configFilePath;
            configFileName = path.join(configFilePath, "tsconfig.json");
        }
        else {
            configFileDir = path.dirname(configFilePath);
            configFileName = configFilePath;
        }
        var readConfigResult = ts.readConfigFile(configFileName, function (fileName) {
            return ts.sys.readFile(fileName);
        });
        if (readConfigResult.error) {
            return {
                options: undefined,
                fileNames: [],
                errors: [readConfigResult.error]
            };
        }
        var configObject = readConfigResult.config;
        return ts.parseJsonConfigFileContent(configObject, ts.sys, configFileDir);
    }
    TsCore.getProjectConfig = getProjectConfig;
})(TsCore || (TsCore = {}));
var Ast;
(function (Ast) {
    ;
    var ContainerFlags;
    (function (ContainerFlags) {
        // The current node is not a container, and no container manipulation should happen before
        // recursing into it.
        ContainerFlags[ContainerFlags["None"] = 0] = "None";
        // The current node is a container.  It should be set as the current container (and block-
        // container) before recursing into it.  The current node does not have locals.  Examples:
        //
        //      Classes, ObjectLiterals, TypeLiterals, Interfaces...
        ContainerFlags[ContainerFlags["IsContainer"] = 1] = "IsContainer";
        // The current node is a block-scoped-container.  It should be set as the current block-
        // container before recursing into it.  Examples:
        //
        //      Blocks (when not parented by functions), Catch clauses, For/For-in/For-of statements...
        ContainerFlags[ContainerFlags["IsBlockScopedContainer"] = 2] = "IsBlockScopedContainer";
        // The current node is the container of a control flow path. The current control flow should
        // be saved and restored, and a new control flow initialized within the container.
        ContainerFlags[ContainerFlags["IsControlFlowContainer"] = 4] = "IsControlFlowContainer";
        ContainerFlags[ContainerFlags["IsFunctionLike"] = 8] = "IsFunctionLike";
        ContainerFlags[ContainerFlags["IsFunctionExpression"] = 16] = "IsFunctionExpression";
        ContainerFlags[ContainerFlags["HasLocals"] = 32] = "HasLocals";
        ContainerFlags[ContainerFlags["IsInterface"] = 64] = "IsInterface";
        ContainerFlags[ContainerFlags["IsObjectLiteralOrClassExpressionMethod"] = 128] = "IsObjectLiteralOrClassExpressionMethod";
    })(ContainerFlags = Ast.ContainerFlags || (Ast.ContainerFlags = {}));
    function modifierToFlag(token) {
        switch (token) {
            case ts.SyntaxKind.StaticKeyword: return ts.ModifierFlags.Static;
            case ts.SyntaxKind.PublicKeyword: return ts.ModifierFlags.Public;
            case ts.SyntaxKind.ProtectedKeyword: return ts.ModifierFlags.Protected;
            case ts.SyntaxKind.PrivateKeyword: return ts.ModifierFlags.Private;
            case ts.SyntaxKind.AbstractKeyword: return ts.ModifierFlags.Abstract;
            case ts.SyntaxKind.ExportKeyword: return ts.ModifierFlags.Export;
            case ts.SyntaxKind.DeclareKeyword: return ts.ModifierFlags.Ambient;
            case ts.SyntaxKind.ConstKeyword: return ts.ModifierFlags.Const;
            case ts.SyntaxKind.DefaultKeyword: return ts.ModifierFlags.Default;
            case ts.SyntaxKind.AsyncKeyword: return ts.ModifierFlags.Async;
            case ts.SyntaxKind.ReadonlyKeyword: return ts.ModifierFlags.Readonly;
        }
        return ts.ModifierFlags.None;
    }
    Ast.modifierToFlag = modifierToFlag;
    function getExternalModuleName(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
            case ts.SyntaxKind.ExportDeclaration:
                return node.moduleSpecifier;
            case ts.SyntaxKind.ImportEqualsDeclaration:
                return node.moduleReference.kind === ts.SyntaxKind.ExternalModuleReference ? node.moduleReference.expression : undefined;
            default:
                return undefined;
        }
    }
    Ast.getExternalModuleName = getExternalModuleName;
    function getModifierFlagsNoCache(node) {
        var flags = ts.ModifierFlags.None;
        if (node.modifiers) {
            for (var _i = 0, _a = node.modifiers; _i < _a.length; _i++) {
                var modifier = _a[_i];
                flags |= modifierToFlag(modifier.kind);
            }
        }
        if (node.flags & ts.NodeFlags.NestedNamespace || (node.kind === ts.SyntaxKind.Identifier && node.isInJSDocNamespace)) {
            flags |= ts.ModifierFlags.Export;
        }
        return flags;
    }
    Ast.getModifierFlagsNoCache = getModifierFlagsNoCache;
    function getIdentifierFromSymbol(symbol) {
        var decls = symbol.getDeclarations();
        for (var _i = 0, decls_1 = decls; _i < decls_1.length; _i++) {
            var decl = decls_1[_i];
            var identifier = decl.name;
            if (identifier) {
                return identifier;
            }
        }
        return undefined;
    }
    Ast.getIdentifierFromSymbol = getIdentifierFromSymbol;
    function getSourceFileFromAnyImportExportNode(node, checker) {
        var moduleName = Ast.getExternalModuleName(node);
        if (moduleName && moduleName.kind === ts.SyntaxKind.StringLiteral) {
            var symbol = checker.getSymbolAtLocation(moduleName);
            if (symbol && symbol.declarations && symbol.declarations[0]) {
                return symbol.declarations[0].getSourceFile();
            }
        }
        return undefined;
    }
    Ast.getSourceFileFromAnyImportExportNode = getSourceFileFromAnyImportExportNode;
    function getSourceFileOfNode(node) {
        while (node && node.kind !== ts.SyntaxKind.SourceFile) {
            node = node.parent;
        }
        return node;
    }
    Ast.getSourceFileOfNode = getSourceFileOfNode;
    function getSourceFileFromSymbol(symbol) {
        var declarations = symbol.getDeclarations();
        if (declarations && declarations.length > 0) {
            if (declarations[0].kind === ts.SyntaxKind.SourceFile) {
                return declarations[0].getSourceFile();
            }
        }
        return undefined;
    }
    Ast.getSourceFileFromSymbol = getSourceFileFromSymbol;
    function getClassHeritageProperties(classNodeU, checker) {
        var classExportProperties = [];
        function getHeritageExportProperties(heritageClause, checker) {
            var inheritedTypeNodes = heritageClause.types;
            if (inheritedTypeNodes) {
                for (var _i = 0, inheritedTypeNodes_1 = inheritedTypeNodes; _i < inheritedTypeNodes_1.length; _i++) {
                    var typeRefNode = inheritedTypeNodes_1[_i];
                    // The "properties" of inheritedType includes all the base class/interface properties
                    var inheritedType = checker.getTypeAtLocation(typeRefNode);
                    var inheritedTypeDeclaration = inheritedType.symbol.valueDeclaration;
                    if (inheritedTypeDeclaration) {
                        var inheritedTypeHeritageClauses = inheritedTypeDeclaration.heritageClauses;
                        if (inheritedTypeHeritageClauses) {
                            for (var _a = 0, inheritedTypeHeritageClauses_1 = inheritedTypeHeritageClauses; _a < inheritedTypeHeritageClauses_1.length; _a++) {
                                var inheritedTypeHeritageClause = inheritedTypeHeritageClauses_1[_a];
                                getHeritageExportProperties(inheritedTypeHeritageClause, checker);
                            }
                        }
                    }
                    var inheritedTypeProperties = inheritedType.getProperties();
                    for (var _b = 0, inheritedTypeProperties_1 = inheritedTypeProperties; _b < inheritedTypeProperties_1.length; _b++) {
                        var propertySymbol = inheritedTypeProperties_1[_b];
                        if (Ast.isExportContext(propertySymbol)) {
                            classExportProperties.push(propertySymbol);
                        }
                    }
                }
            }
        }
        var heritageClauses = classNodeU.heritageClauses;
        if (heritageClauses) {
            for (var _i = 0, heritageClauses_1 = heritageClauses; _i < heritageClauses_1.length; _i++) {
                var heritageClause = heritageClauses_1[_i];
                getHeritageExportProperties(heritageClause, checker);
            }
        }
        return classExportProperties;
    }
    Ast.getClassHeritageProperties = getClassHeritageProperties;
    function getClassAbstractProperties(extendsClause, checker) {
        var abstractProperties = [];
        var abstractTypeNodes = extendsClause.types;
        for (var _i = 0, abstractTypeNodes_1 = abstractTypeNodes; _i < abstractTypeNodes_1.length; _i++) {
            var abstractTypeNode = abstractTypeNodes_1[_i];
            var abstractType = checker.getTypeAtLocation(abstractTypeNode);
            var abstractTypeSymbol = abstractType.getSymbol();
            if (abstractTypeSymbol.valueDeclaration) {
                if (getModifierFlagsNoCache(abstractTypeSymbol.valueDeclaration) & ts.ModifierFlags.Abstract) {
                    var props = abstractType.getProperties();
                    for (var _a = 0, props_1 = props; _a < props_1.length; _a++) {
                        var prop = props_1[_a];
                        abstractProperties.push(prop);
                    }
                }
            }
        }
        return abstractProperties;
    }
    Ast.getClassAbstractProperties = getClassAbstractProperties;
    function getImplementsProperties(implementsClause, checker) {
        var implementsProperties = [];
        var typeNodes = implementsClause.types;
        for (var _i = 0, typeNodes_1 = typeNodes; _i < typeNodes_1.length; _i++) {
            var typeNode = typeNodes_1[_i];
            var type = checker.getTypeAtLocation(typeNode);
            var props = type.getProperties();
            for (var _a = 0, props_2 = props; _a < props_2.length; _a++) {
                var prop = props_2[_a];
                implementsProperties.push(prop);
            }
        }
        return implementsProperties;
    }
    Ast.getImplementsProperties = getImplementsProperties;
    function getIdentifierUID(symbol) {
        if (!symbol) {
            return undefined;
        }
        var id = symbol.id;
        // Try to get the symbol id from the identifier value declaration
        if (id === undefined && symbol.valueDeclaration) {
            id = symbol.valueDeclaration.symbol.id;
        }
        return id ? id.toString() : undefined;
    }
    Ast.getIdentifierUID = getIdentifierUID;
    function getContainerFlags(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ClassExpression:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.ObjectLiteralExpression:
            case ts.SyntaxKind.TypeLiteral:
            case ts.SyntaxKind.JSDocTypeLiteral:
            case ts.SyntaxKind.JsxAttributes:
                return 1 /* IsContainer */;
            case ts.SyntaxKind.InterfaceDeclaration:
                return 1 /* IsContainer */ | 64 /* IsInterface */;
            case ts.SyntaxKind.ModuleDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.MappedType:
                return 1 /* IsContainer */ | 32 /* HasLocals */;
            case ts.SyntaxKind.SourceFile:
                return 1 /* IsContainer */ | 4 /* IsControlFlowContainer */ | 32 /* HasLocals */;
            case ts.SyntaxKind.MethodDeclaration:
                if (isObjectLiteralOrClassExpressionMethod(node)) {
                    return 1 /* IsContainer */ | 4 /* IsControlFlowContainer */ | 32 /* HasLocals */ | 8 /* IsFunctionLike */ | 128 /* IsObjectLiteralOrClassExpressionMethod */;
                }
            // falls through
            case ts.SyntaxKind.Constructor:
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.CallSignature:
            case ts.SyntaxKind.JSDocFunctionType:
            case ts.SyntaxKind.FunctionType:
            case ts.SyntaxKind.ConstructSignature:
            case ts.SyntaxKind.IndexSignature:
            case ts.SyntaxKind.ConstructorType:
                return 1 /* IsContainer */ | 4 /* IsControlFlowContainer */ | 32 /* HasLocals */ | 8 /* IsFunctionLike */;
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction:
                return 1 /* IsContainer */ | 4 /* IsControlFlowContainer */ | 32 /* HasLocals */ | 8 /* IsFunctionLike */ | 16 /* IsFunctionExpression */;
            case ts.SyntaxKind.ModuleBlock:
                return 4 /* IsControlFlowContainer */;
            case ts.SyntaxKind.PropertyDeclaration:
                return node.initializer ? 4 /* IsControlFlowContainer */ : 0;
            case ts.SyntaxKind.CatchClause:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.CaseBlock:
                return 2 /* IsBlockScopedContainer */;
            case ts.SyntaxKind.Block:
                // do not treat blocks directly inside a function as a block-scoped-container.
                // Locals that reside in this block should go to the function locals. Otherwise 'x'
                // would not appear to be a redeclaration of a block scoped local in the following
                // example:
                //
                //      function foo() {
                //          var x;
                //          let x;
                //      }
                //
                // If we placed 'var x' into the function locals and 'let x' into the locals of
                // the block, then there would be no collision.
                //
                // By not creating a new block-scoped-container here, we ensure that both 'var x'
                // and 'let x' go into the Function-container's locals, and we do get a collision
                // conflict.
                return isFunctionLike(node.parent) ? 0 /* None */ : 2 /* IsBlockScopedContainer */;
        }
        return 0 /* None */;
    }
    Ast.getContainerFlags = getContainerFlags;
    function getImplementsClause(node) {
        if (node) {
            var heritageClauses = node.heritageClauses;
            if (heritageClauses) {
                for (var _i = 0, heritageClauses_2 = heritageClauses; _i < heritageClauses_2.length; _i++) {
                    var clause = heritageClauses_2[_i];
                    if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                        return clause;
                    }
                }
            }
        }
        return undefined;
    }
    Ast.getImplementsClause = getImplementsClause;
    function getExtendsClause(node) {
        if (node) {
            var heritageClauses = node.heritageClauses;
            if (heritageClauses) {
                for (var _i = 0, heritageClauses_3 = heritageClauses; _i < heritageClauses_3.length; _i++) {
                    var clause = heritageClauses_3[_i];
                    if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                        return clause;
                    }
                }
            }
        }
        return undefined;
    }
    Ast.getExtendsClause = getExtendsClause;
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
    Ast.isAliasSymbolDeclaration = isAliasSymbolDeclaration;
    function isIdentifier(node) {
        return (node.kind === ts.SyntaxKind.Identifier);
    }
    Ast.isIdentifier = isIdentifier;
    function isPrototypeAccessAssignment(expression) {
        if (expression.kind !== ts.SyntaxKind.BinaryExpression) {
            return false;
        }
        var expr = expression;
        if (expr.operatorToken.kind !== ts.SyntaxKind.EqualsToken || expr.left.kind !== ts.SyntaxKind.PropertyAccessExpression) {
            return false;
        }
        var lhs = expr.left;
        if (lhs.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
            // chained dot, e.g. x.y.z = expr; this var is the 'x.y' part
            var innerPropertyAccess = lhs.expression;
            if (innerPropertyAccess.expression.kind === ts.SyntaxKind.Identifier && innerPropertyAccess.name.text === "prototype") {
                return true;
            }
        }
        return false;
    }
    Ast.isPrototypeAccessAssignment = isPrototypeAccessAssignment;
    function isFunctionLike(node) {
        return node && isFunctionLikeKind(node.kind);
    }
    Ast.isFunctionLike = isFunctionLike;
    function isFunctionLikeDeclarationKind(kind) {
        switch (kind) {
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.MethodDeclaration:
            case ts.SyntaxKind.Constructor:
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction:
                return true;
            default:
                return false;
        }
    }
    Ast.isFunctionLikeDeclarationKind = isFunctionLikeDeclarationKind;
    function isFunctionLikeKind(kind) {
        switch (kind) {
            case ts.SyntaxKind.MethodSignature:
            case ts.SyntaxKind.CallSignature:
            case ts.SyntaxKind.ConstructSignature:
            case ts.SyntaxKind.IndexSignature:
            case ts.SyntaxKind.FunctionType:
            case ts.SyntaxKind.JSDocFunctionType:
            case ts.SyntaxKind.ConstructorType:
                return true;
            default:
                return isFunctionLikeDeclarationKind(kind);
        }
    }
    Ast.isFunctionLikeKind = isFunctionLikeKind;
    function isObjectLiteralOrClassExpressionMethod(node) {
        return node.kind === ts.SyntaxKind.MethodDeclaration &&
            (node.parent.kind === ts.SyntaxKind.ObjectLiteralExpression ||
                node.parent.kind === ts.SyntaxKind.ClassExpression);
    }
    Ast.isObjectLiteralOrClassExpressionMethod = isObjectLiteralOrClassExpressionMethod;
    function isInterfaceInternal(symbol) {
        if (symbol && (symbol.flags & ts.SymbolFlags.Interface)) {
            if (symbol.valueDeclaration) {
                var flags = getModifierFlagsNoCache(symbol.valueDeclaration);
                //if ( !( flags & ts.ModifierFlags.Export ) ) {
                //    return true;
                //}
                // FUTURE: How to make interfaces internal by convention?
                return false;
            }
        }
        return false;
    }
    Ast.isInterfaceInternal = isInterfaceInternal;
    function isClassInternal(symbol) {
        if (symbol && (symbol.flags & ts.SymbolFlags.Class)) {
            // If the class is from an extern API or ambient then it cannot be considered internal.
            if (Ast.isExportContext(symbol) || Ast.isAmbientContext(symbol)) {
                return false;
            }
            // A class always has a value declaration
            var flags = getModifierFlagsNoCache(symbol.valueDeclaration);
            // By convention, "Internal" classes are ones that are not exported.
            if (!(flags & ts.ModifierFlags.Export)) {
                return true;
            }
        }
        return false;
    }
    Ast.isClassInternal = isClassInternal;
    function isClassAbstract(classSymbol) {
        if (classSymbol && classSymbol.valueDeclaration) {
            if (getModifierFlagsNoCache(classSymbol.valueDeclaration) & ts.ModifierFlags.Abstract) {
                return true;
            }
        }
        return false;
    }
    Ast.isClassAbstract = isClassAbstract;
    function isKeyword(token) {
        return ts.SyntaxKind.FirstKeyword <= token && token <= ts.SyntaxKind.LastKeyword;
    }
    Ast.isKeyword = isKeyword;
    function isNamespaceImport(node) {
        return node.kind === ts.SyntaxKind.NamespaceImport;
    }
    Ast.isNamespaceImport = isNamespaceImport;
    function isPuncuation(token) {
        return ts.SyntaxKind.FirstPunctuation <= token && token <= ts.SyntaxKind.LastPunctuation;
    }
    Ast.isPuncuation = isPuncuation;
    function isTrivia(token) {
        return ts.SyntaxKind.FirstTriviaToken <= token && token <= ts.SyntaxKind.LastTriviaToken;
    }
    Ast.isTrivia = isTrivia;
    function isExportProperty(propertySymbol) {
        var node = propertySymbol.valueDeclaration;
        while (node) {
            if (getModifierFlagsNoCache(node) & ts.ModifierFlags.Export) {
                return true;
            }
            node = node.parent;
        }
        return false;
    }
    Ast.isExportProperty = isExportProperty;
    function isExportContext(propertySymbol) {
        var node = propertySymbol.valueDeclaration;
        while (node) {
            if (node.flags & ts.NodeFlags.ExportContext) {
                return true;
            }
            node = node.parent;
        }
        return false;
    }
    Ast.isExportContext = isExportContext;
    function isAmbientContext(propertySymbol) {
        var node = propertySymbol.valueDeclaration;
        while (node) {
            if (getModifierFlagsNoCache(node) & ts.ModifierFlags.Ambient) {
                return true;
            }
            node = node.parent;
        }
        return false;
    }
    Ast.isAmbientContext = isAmbientContext;
    function isAmbientModule(symbol) {
        var declarations = symbol.getDeclarations();
        if (declarations && declarations.length > 0) {
            var declaration = symbol.getDeclarations()[0];
            if (declaration.kind === ts.SyntaxKind.ModuleDeclaration) {
                if (declaration.modifiers) {
                    for (var _i = 0, _a = declaration.modifiers; _i < _a.length; _i++) {
                        var modifier = _a[_i];
                        if (modifier.kind === ts.SyntaxKind.DeclareKeyword) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    Ast.isAmbientModule = isAmbientModule;
    function isSourceCodeFile(file) {
        return (file.kind === ts.SyntaxKind.SourceFile && !file.isDeclarationFile);
    }
    Ast.isSourceCodeFile = isSourceCodeFile;
    function isSourceCodeModule(symbol) {
        var declarations = symbol.getDeclarations();
        if (declarations && declarations.length > 0) {
            var declaration = symbol.getDeclarations()[0];
            return ((declaration.kind === ts.SyntaxKind.SourceFile) && !(declaration.isDeclarationFile));
        }
        return false;
    }
    Ast.isSourceCodeModule = isSourceCodeModule;
    function isAnyImportOrExport(node) {
        switch (node.kind) {
            case ts.SyntaxKind.ImportDeclaration:
            case ts.SyntaxKind.ImportEqualsDeclaration:
                return true;
            case ts.SyntaxKind.ExportDeclaration:
                return true;
            default:
                return false;
        }
    }
    Ast.isAnyImportOrExport = isAnyImportOrExport;
})(Ast || (Ast = {}));
var IdGenerator = (function () {
    function IdGenerator() {
    }
    IdGenerator.getNextId = function () {
        return this.nextId++;
    };
    return IdGenerator;
}());
IdGenerator.nextId = 1;
var BundleContainer = (function () {
    function BundleContainer(name, sourceFile, isBundleModule, parent) {
        this.parent = undefined;
        this.children = [];
        this.modules = [];
        this.moduleByFileName = {};
        this.name = name;
        this.entrysourceFile = sourceFile;
        this.isInternalBundle = isBundleModule;
        this.parent = parent;
        this.id = IdGenerator.getNextId();
    }
    BundleContainer.prototype.addModule = function (module) {
        var fileName = module.getFileName();
        if (!Utils.hasProperty(this.moduleByFileName, fileName)) {
            this.modules.push(module);
            this.moduleByFileName[fileName] = module;
        }
    };
    BundleContainer.prototype.isInternal = function () {
        return this.isInternalBundle;
    };
    BundleContainer.prototype.getModule = function (moduleFileName) {
        return this.moduleByFileName[moduleFileName];
    };
    BundleContainer.prototype.getModules = function () {
        return this.modules;
    };
    BundleContainer.prototype.addChild = function (container) {
        this.children.push(container);
    };
    BundleContainer.prototype.getChildren = function () {
        return this.children;
    };
    BundleContainer.prototype.getParent = function () {
        return this.parent;
    };
    BundleContainer.prototype.getName = function () {
        return this.name;
    };
    BundleContainer.prototype.getFileName = function () {
        return this.entrysourceFile.fileName;
    };
    BundleContainer.prototype.getId = function () {
        return this.id;
    };
    return BundleContainer;
}());
var ModuleDescriptor = (function () {
    function ModuleDescriptor(node, dependencies, sourceFile, isBundleModule, container) {
        // Map of container ids that this module has been referenced in.
        this.containers = {};
        // TJT: Why isn't this an array of ModuleDescriptors? Array of external dependencies
        this.dependencies = [];
        this.node = node;
        this.dependencies = dependencies;
        this.sourceFile = sourceFile;
        this.isBundleModule = isBundleModule;
        // TJT: Add the container that this module has been found in?
        this.containers[container.getId().toString()] = container;
    }
    ModuleDescriptor.prototype.getNode = function () {
        return this.node;
    };
    ModuleDescriptor.prototype.getDependencies = function () {
        return this.dependencies;
    };
    ModuleDescriptor.prototype.getContainers = function () {
        return this.containers;
    };
    ModuleDescriptor.prototype.getFileName = function () {
        return this.sourceFile.fileName;
    };
    ModuleDescriptor.prototype.getSourceFile = function () {
        return this.sourceFile;
    };
    ModuleDescriptor.prototype.isContainer = function () {
        return this.isBundleModule;
    };
    ModuleDescriptor.prototype.isExternalModule = function () {
        return (this.sourceFile.externalModuleIndicator != undefined);
    };
    return ModuleDescriptor;
}());
var BundleConfigParser = (function () {
    function BundleConfigParser() {
    }
    BundleConfigParser.prototype.parseConfigFile = function (json, basePath) {
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
            var bundlePackageType = PackageType.None;
            var bundlePackageNamespace = undefined;
            var packageTypeMap = {
                "none": PackageType.None,
                "library": PackageType.Library,
                "component": PackageType.Component
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
    return BundleConfigParser;
}());
exports.BundleConfigParser = BundleConfigParser;
var ImportCollection = (function () {
    function ImportCollection() {
        // For an ImportDeclaration ImportClause:
        //
        // import d from "mod" => name = d, namedBinding = undefined
        //
        // import * as ns from "mod" => name = undefined, namedBinding: NamespaceImport = { name: ns }
        // import d, * as ns from "mod" => name = d, namedBinding: NamespaceImport = { name: ns }
        //
        // import { a, b as x } from "mod" => name = undefined, namedBinding: NamedImports = { elements: [{ name: a }, { name: x, propertyName: b}]}
        // import d, { a, b as x } from "mod" => name = d, namedBinding: NamedImports = { elements: [{ name: a }, { name: x, propertyName: b}]}
        //
        // Note: NamedImportBindings = NamespaceImport | NamedImports;
        this.imports = {};
    }
    ImportCollection.prototype.add = function (importDeclaration) {
        // The moduleSpecifier for an ImportDeclaration is always a StringLiteral
        var moduleSpecifier = importDeclaration.moduleSpecifier.text;
        if (!Utils.hasProperty(this.imports, moduleSpecifier)) {
            this.imports[moduleSpecifier] = [importDeclaration];
        }
        else {
            // TJT: Avoid duplicates?
            this.imports[moduleSpecifier].push(importDeclaration);
        }
    };
    ImportCollection.prototype.getModuleSpecifierImportProperties = function (moduleSpecifier) {
        var indexOfIdentifier = function (identifiers, identifier) {
            for (var i = 0; i < identifiers.length; i++) {
                if (identifiers[i].escapedText === identifier.escapedText) {
                    return i;
                }
            }
            return -1;
        };
        var indexOfSpecifier = function (specifiers, specifier) {
            for (var i = 0; i < specifiers.length; i++) {
                if (specifiers[i].name.escapedText === specifier.name.escapedText) {
                    if (!specifiers[i].propertyName && !specifier.propertyName) {
                        return i;
                    }
                    if (specifier.propertyName) {
                        if ((specifiers[i].propertyName) &&
                            (specifiers[i].propertyName.escapedText === specifier.name.escapedText)) {
                            return i;
                        }
                    }
                }
            }
            return -1;
        };
        var defaultNames = [];
        var namespaces = [];
        var namedElements = [];
        for (var _i = 0, _a = this.imports[moduleSpecifier]; _i < _a.length; _i++) {
            var importDeclaration = _a[_i];
            var _b = importDeclaration.importClause, name_1 = _b.name, namedBindings = _b.namedBindings;
            if (name_1) {
                if (indexOfIdentifier(defaultNames, name_1) < 0) {
                    defaultNames.push(name_1);
                }
            }
            if (namedBindings) {
                if (Ast.isNamespaceImport(namedBindings)) {
                    var namespaceName = namedBindings.name;
                    if (indexOfIdentifier(namespaces, namespaceName) < 0) {
                        namespaces.push(namespaceName);
                    }
                }
                else {
                    var elements = namedBindings.elements;
                    for (var _c = 0, elements_1 = elements; _c < elements_1.length; _c++) {
                        var element = elements_1[_c];
                        if (indexOfSpecifier(namedElements, element) < 0) {
                            namedElements.push(element);
                        }
                    }
                }
            }
        }
        return {
            defaultNames: defaultNames,
            namespaces: namespaces,
            namedElements: namedElements,
        };
    };
    ImportCollection.prototype.getModuleSpecifiers = function () {
        var keys = [];
        for (var key in this.imports) {
            keys.push(key);
        }
        return keys;
    };
    return ImportCollection;
}());
var ImportEqualsCollection = (function () {
    function ImportEqualsCollection() {
        // One of:
        // import x = require( "mod" );
        // import x = M.x;
        this.imports = {};
    }
    ImportEqualsCollection.prototype.add = function (importDeclaration) {
        var moduleReferenceName = ts.getNameOfDeclaration(importDeclaration);
        if (!Utils.hasProperty(this.imports, moduleReferenceName.getText())) {
            this.imports[moduleReferenceName.getText()] = [importDeclaration];
        }
        else {
            this.imports[moduleReferenceName.getText()].push(importDeclaration);
        }
    };
    ImportEqualsCollection.prototype.getModuleReferenceImports = function (moduleReference) {
        return this.imports[moduleReference];
    };
    ImportEqualsCollection.prototype.getModuleReferences = function () {
        var keys = [];
        for (var key in this.imports) {
            keys.push(key);
        }
        return keys;
    };
    return ImportEqualsCollection;
}());
var BundleBuildResult = (function () {
    function BundleBuildResult(errors, bundleSource) {
        this.errors = errors;
        this.bundleSource = bundleSource;
    }
    BundleBuildResult.prototype.getBundleSource = function () {
        return this.bundleSource;
    };
    BundleBuildResult.prototype.getErrors = function () {
        return this.errors;
    };
    BundleBuildResult.prototype.succeeded = function () {
        return (this.errors.length == 0);
    };
    return BundleBuildResult;
}());
var DependencyBuilder = (function () {
    function DependencyBuilder(program) {
        this.bundleModuleStack = [];
        this.typeChecker = program.getTypeChecker();
    }
    /**
     * Builds an ordered array of dependencies from import and exports declarations
     * from source file parameter.
     *
     * @param entrySourceFile { SourceFile } The input source file used to construct the bundle container.
     * @returns a linked list of module container.
     */
    DependencyBuilder.prototype.getSourceFileDependencies = function (entrySourceFile) {
        var canonicalSourceFileName = entrySourceFile.fileName;
        // Set the global module container for the input source file.
        this.globalBundle = new BundleContainer(canonicalSourceFileName, entrySourceFile, /* isBundleNamespace */ false /* no parent container */);
        this.bundleModuleStack.push(this.globalBundle);
        // Walk the module dependency tree
        this.walkModuleDependencies(entrySourceFile);
        return this.globalBundle;
    };
    DependencyBuilder.prototype.walkModuleDependencies = function (moduleSourceFile) {
        var _this = this;
        var visitedModulesByContainer = [];
        var visitedModules = {};
        var moduleDescriptors = {};
        /**
         * Recursive function used to generate module descriptors for dependencies.
         */
        var visitDependencies = function (moduleSourceFile, dependencyNodes) {
            Logger.trace("visiting dependencies for source file: ", moduleSourceFile.fileName);
            // Look for our @bundlemodule annotation which is the start of an
            // internal bundle container.
            var isNextContainer = _this.isNextContainer(moduleSourceFile);
            if (isNextContainer) {
                visitedModulesByContainer.push(visitedModules);
                visitedModules = {};
            }
            // Loop through each dependency node and create a module descriptor for each
            dependencyNodes.forEach(function (dependencyNode) {
                var moduleDescriptor;
                var dependencySourceFile = Ast.getSourceFileFromAnyImportExportNode(dependencyNode, _this.typeChecker);
                var dependencyFileName = dependencySourceFile.fileName;
                if (!Utils.hasProperty(moduleDescriptors, dependencyFileName)) {
                    Logger.trace("Creating new module descriptor for: ", dependencyFileName);
                    var moduleDependencyNodes = [];
                    var isBundleModule = false;
                    if (!dependencySourceFile.isDeclarationFile) {
                        moduleDependencyNodes = _this.getModuleDependencyNodes(dependencySourceFile);
                        // Look for our @bundlemodule annotation specifying an "internal" bundle module.
                        isBundleModule = _this.hasModuleAnnotation(dependencySourceFile);
                    }
                    moduleDescriptor = new ModuleDescriptor(dependencyNode, moduleDependencyNodes, dependencySourceFile, isBundleModule, _this.currentContainer());
                    moduleDescriptors[dependencyFileName] = moduleDescriptor;
                }
                else {
                    moduleDescriptor = moduleDescriptors[dependencyFileName];
                }
                // We don't need to walk dependencies within declaration files
                if (!dependencySourceFile.isDeclarationFile) {
                    if (!Utils.hasProperty(visitedModules, dependencyFileName)) {
                        visitedModules[dependencyFileName] = true;
                        visitDependencies(dependencySourceFile, moduleDescriptor.getDependencies());
                    }
                }
                // Update current module container ordered dependencies...                
                if (dependencySourceFile.isDeclarationFile) {
                    // All top-level dependency module descriptors are added to the global scoped, top-level bundle container
                    _this.globalBundle.addModule(moduleDescriptor); //, dependencySymbol.name );
                }
                else {
                    // Add the module to the current bundle module container.
                    _this.currentContainer().addModule(moduleDescriptor); //, dependencySymbol.name );
                }
            });
            if (isNextContainer) {
                _this.restoreContainer();
                visitedModules = visitedModulesByContainer.pop();
            }
        };
        // Start off the dependency building process...
        visitDependencies(moduleSourceFile, this.getModuleDependencyNodes(moduleSourceFile));
    };
    DependencyBuilder.prototype.getModuleDependencyNodes = function (sourceFile) {
        var _this = this;
        // We are only interested in source code files ( not declaration files )
        if (!Ast.isSourceCodeFile(sourceFile)) {
            return [];
        }
        Logger.trace("Getting dependency nodes for source file: ", sourceFile.fileName);
        var dependencyNodes = [];
        // Search the source file module/node for import or export dependencies...
        var getModuleDependencies = function (moduleNode) {
            ts.forEachChild(moduleNode, function (node) {
                if (Ast.isAnyImportOrExport(node)) {
                    // Get the import/export module name.
                    var moduleName = Ast.getExternalModuleName(node);
                    if (moduleName && moduleName.kind === ts.SyntaxKind.StringLiteral) {
                        // Add dependency node if it references an external module.
                        var moduleSymbol = _this.typeChecker.getSymbolAtLocation(moduleName);
                        if (moduleSymbol) {
                            dependencyNodes.push(node);
                        }
                    }
                }
                else if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
                    // For a namespace ( module declaration ), traverse the body to locate ES6 module dependencies.
                    // TJT: This section needs to be reviewed.
                    // Should namespace / module syntax kinds be scanned or
                    // Do we only support ES6 import/export syntax, where dependencie
                    // must be declared top level?
                    //
                    // NOTES: We will only support ES6 import/export module syntax
                    var moduleDeclaration = node;
                    if ((moduleDeclaration.name.kind === ts.SyntaxKind.StringLiteral) &&
                        (Ast.getModifierFlagsNoCache(moduleDeclaration) & ts.ModifierFlags.Ambient || sourceFile.isDeclarationFile)) {
                        // An AmbientExternalModuleDeclaration declares an external module.
                        Logger.info("Scanning for dependencies within ambient module declaration: ", moduleDeclaration.name.text);
                        getModuleDependencies(moduleDeclaration.body);
                    }
                }
            });
        };
        getModuleDependencies(sourceFile);
        return dependencyNodes;
    };
    DependencyBuilder.prototype.hasModuleAnnotation = function (sourceFile) {
        // Look for our bundlemodule annotation.
        var sourceText = sourceFile.getFullText();
        var commentRanges = ts.getLeadingCommentRanges(sourceText, 0);
        return Utils.forEach(commentRanges, function (commentRange) {
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
            var nextModule = new BundleContainer(moduleName, sourceFile, true, this.currentContainer());
            // Before changing the current container we must first add the new container to the children of the current container.
            var currentModule = this.currentContainer();
            // Add new container context to the exising current container
            currentModule.addChild(nextModule);
            this.bundleModuleStack.push(nextModule);
            return true;
        }
        return false;
    };
    return DependencyBuilder;
}());
var BundleBuilder = (function () {
    function BundleBuilder(program, bundlerOptions) {
        this.bundleConfig = {};
        this.bundleFilesAdded = {};
        this.bundleSourceFiles = [];
        this.program = program;
        this.typeChecker = program.getTypeChecker();
        this.options = bundlerOptions;
        this.bundleImports = new ImportCollection();
        this.bundleImportEquals = new ImportEqualsCollection();
    }
    BundleBuilder.prototype.transform = function (entrySourceFile, context) {
        Logger.setLevel(4);
        this.sourceFile = entrySourceFile;
        this.context = context;
        return this.buildBundle();
    };
    BundleBuilder.prototype.buildBundle = function () {
        var dependencyBuilder = new DependencyBuilder(this.program);
        // TJT: Poor naming.
        var bundleContainer = dependencyBuilder.getSourceFileDependencies(this.sourceFile);
        Logger.info("Traversing dependencies for bundle: ", bundleContainer.getFileName());
        this.processBundleContainer(bundleContainer);
        for (var _i = 0, _a = bundleContainer.getChildren(); _i < _a.length; _i++) {
            var childContainer = _a[_i];
            this.processBundleContainer(childContainer);
        }
        return this.generateBundleSourceFile();
        //if ( bundle.config.package.getPackageType() === PackageType.Library ) {
        //    // Wrap the bundle in an exported namespace with the bundle name
        //    bundleText += "export namespace " + bundle.config.package.getPackageNamespace() + " {\r\n";
        //    bundleText += this.bundleCodeText;
        //    bundleText += " \r\n}";
        //}
        //var bundleExtension = ".ts"; //isBundleTsx ? ".tsx" : ".ts";
        //var bundleText = ""; // Fixme:
        //var bundleFile = { path: "bundle" + bundleExtension, extension: bundleExtension, text: bundleText };
        //return new BundleBuildResult( [], bundleFile );
    };
    BundleBuilder.prototype.processBundleContainer = function (bundleContainer) {
        for (var _i = 0, _a = bundleContainer.getModules(); _i < _a.length; _i++) {
            var moduleDescriptor = _a[_i];
            Logger.info("Processing dependency module: ", moduleDescriptor.getFileName());
            var moduleDependencyNode = moduleDescriptor.getNode();
            var moduleSourceFile = moduleDescriptor.getSourceFile();
            if (!moduleSourceFile.isDeclarationFile) {
                var moduleDependencies = moduleDescriptor.getDependencies();
                for (var _b = 0, moduleDependencies_1 = moduleDependencies; _b < moduleDependencies_1.length; _b++) {
                    var dependencyNode = moduleDependencies_1[_b];
                    var dependencySourceFile = Ast.getSourceFileFromAnyImportExportNode(dependencyNode, this.typeChecker);
                    if (dependencySourceFile && !dependencySourceFile.isDeclarationFile) {
                        var dependencyFileName = dependencySourceFile.fileName;
                        if (!Utils.hasProperty(this.bundleFilesAdded, dependencyFileName)) {
                            this.bundleFilesAdded[dependencyFileName] = true;
                            this.bundleSourceFiles.push(dependencySourceFile);
                        }
                    }
                }
            }
            else {
                // The module source file is a DeclarationFile...
                if (moduleDependencyNode.kind === ts.SyntaxKind.ImportEqualsDeclaration) {
                    this.bundleImportEquals.add(moduleDependencyNode);
                }
                else {
                    // Should aways be ImportDeclaration kind..
                    if (moduleDependencyNode.kind === ts.SyntaxKind.ImportDeclaration) {
                        this.bundleImports.add(moduleDependencyNode);
                    }
                }
            }
        }
        var isGeneratedNamespace = bundleContainer.isInternal();
        if (isGeneratedNamespace) {
            // TODO: addExportNamespace block
            // The module container was created from the bundle annotation.
            // Wrap the bundle module container in an exported namespace with the bundle name
            //this.bundleCodeText += "export namespace " + bundleContainer.getName() + " {\r\n";
        }
    };
    BundleBuilder.prototype.checkModuleInheritance = function (moduleDependencyNode, dependencyNodes) {
        // TJT: Named bindings of imports must be part of dependency builder!
        for (var _i = 0, dependencyNodes_1 = dependencyNodes; _i < dependencyNodes_1.length; _i++) {
            var dependencyNode = dependencyNodes_1[_i];
            var dependencySymbol = this.getSymbolFromNode(dependencyNode);
            var dependencyFile = Ast.getSourceFileFromSymbol(dependencySymbol);
            if (dependencyFile && !dependencyFile.isDeclarationFile) {
                var dependencyFileName = dependencyFile.fileName;
                if (dependencyNode.kind === ts.SyntaxKind.ImportDeclaration) {
                    var dependencyBindings = this.getNamedBindingsFromImport(dependencyNode);
                    if (dependencyBindings && this.isInheritedBinding(moduleDependencyNode, dependencyBindings)) {
                        // Add the dependency file to the bundle now if it is required for inheritance. 
                        if (!Utils.hasProperty(this.bundleFilesAdded, dependencyFileName)) {
                            this.bundleFilesAdded[dependencyFileName] = true;
                            this.bundleSourceFiles.push(dependencyFile);
                        }
                    }
                }
            }
        }
    };
    BundleBuilder.prototype.isInheritedBinding = function (dependencyNode, namedBindings) {
        var typeChecker = this.program.getTypeChecker();
        var dependencySymbol = this.getSymbolFromNode(dependencyNode);
        if (dependencySymbol) {
            var exports = typeChecker.getExportsOfModule(dependencySymbol);
            if (exports) {
                for (var _i = 0, exports_1 = exports; _i < exports_1.length; _i++) {
                    var exportedSymbol = exports_1[_i];
                    var exportType = null; //typeChecker.getDeclaredTypeOfSymbol( exportedSymbol );
                    if (exportType &&
                        (exportType.flags & ts.TypeFlags.Object) &&
                        (exportType.objectFlags & (ts.ObjectFlags.Class | ts.ObjectFlags.Interface))) {
                        var baseTypes = typeChecker.getBaseTypes(exportType);
                        for (var _a = 0, baseTypes_1 = baseTypes; _a < baseTypes_1.length; _a++) {
                            var baseType = baseTypes_1[_a];
                            var baseTypeName = baseType.symbol.getName();
                            if (namedBindings.indexOf(baseTypeName) >= 0) {
                                Logger.info("Base class inheritance found", baseTypeName);
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    };
    BundleBuilder.prototype.generateBundleSourceFile = function () {
        this.bundleSourceFile = ts.createSourceFile("bundle.ts", "", this.program.getCompilerOptions().target);
        var importStatements = this.createImports();
        this.bundleSourceFile = ts.updateSourceFileNode(this.bundleSourceFile, importStatements);
        this.addSourceFiles();
        return this.bundleSourceFile;
    };
    BundleBuilder.prototype.createImports = function () {
        var importStatements = [];
        // First add import equals imports...
        for (var moduleReference in this.bundleImportEquals.getModuleReferences()) {
            var imports = this.bundleImportEquals.getModuleReferenceImports(moduleReference);
            for (var _i = 0, imports_1 = imports; _i < imports_1.length; _i++) {
                var importEquals = imports_1[_i];
                // Import equals declarationss are simply added to the bundle source file statements
                importStatements.push(importEquals);
            }
        }
        // Next add the import declarations...
        for (var _a = 0, _b = this.bundleImports.getModuleSpecifiers(); _a < _b.length; _a++) {
            var moduleSpecifier = _b[_a];
            var _c = this.bundleImports.getModuleSpecifierImportProperties(moduleSpecifier), defaultNames = _c.defaultNames, namespaces = _c.namespaces, namedElements = _c.namedElements;
            if (defaultNames.length > 0) {
                // TJT: It doesn't make sense to have multiple default imports for a module specifier
                importStatements.push(this.createDefaultImportDeclaration(moduleSpecifier, defaultNames[0]));
            }
            if (namespaces.length > 0) {
                for (var _d = 0, namespaces_1 = namespaces; _d < namespaces_1.length; _d++) {
                    var namespace = namespaces_1[_d];
                    importStatements.push(this.createNamespaceImportDeclaration(moduleSpecifier, namespace));
                }
            }
            if (namedElements.length > 0) {
                importStatements.push(this.createNamedImportDeclaration(moduleSpecifier, namedElements));
            }
        }
        return importStatements;
    };
    BundleBuilder.prototype.createDefaultImportDeclaration = function (moduleSpecifier, defaultName) {
        // produce `import {defaultName} from '{specifier}';
        var defaultImport = ts.createImportDeclaration(undefined /*decorators*/, undefined /*modifiers*/, ts.createImportClause(defaultName /*name*/, undefined), ts.createLiteral(moduleSpecifier));
        return defaultImport;
    };
    BundleBuilder.prototype.createNamespaceImportDeclaration = function (moduleSpecifier, namespace) {
        // produce `import * as {namespace} from '{moduleSpecifier}';
        var namespaceImport = ts.createImportDeclaration(undefined /*decorators*/, undefined /*modifiers*/, ts.createImportClause(undefined /*name*/, ts.createNamespaceImport(namespace)), ts.createLiteral(moduleSpecifier));
        return namespaceImport;
    };
    BundleBuilder.prototype.createNamedImportDeclaration = function (moduleSpecifier, namedImports) {
        // produce `import { {namedImports} } from '{moduleSpecifier}';
        var namedImport = ts.createImportDeclaration(undefined /*decorators*/, undefined /*modifiers*/, ts.createImportClause(undefined /*name*/, ts.createNamedImports(namedImports)), ts.createLiteral(moduleSpecifier));
        return namedImport;
    };
    BundleBuilder.prototype.addSourceFiles = function () {
    };
    BundleBuilder.prototype.updateSourceFile = function (sourceFile) {
        var _this = this;
        var visitor = function (node) {
            if (Ast.isAnyImportOrExport(node)) {
                // TJT: Review the logic here! 
                var moduleNameExpression = Ast.getExternalModuleName(node);
                if (moduleNameExpression && moduleNameExpression.kind === ts.SyntaxKind.StringLiteral) {
                    var moduleSymbol = _this.program.getTypeChecker().getSymbolAtLocation(moduleNameExpression);
                    if ((moduleSymbol) && (Ast.isSourceCodeModule(moduleSymbol) || Ast.isAmbientModule(moduleSymbol))) {
                        // Remove node here
                        return undefined;
                    }
                }
            }
            else {
                if (node.kind === ts.SyntaxKind.ModuleDeclaration) {
                    var module_1 = node;
                    if (_this.bundleConfig.package && _this.bundleConfig.package.getPackageType() === PackageType.Component) {
                        if (module_1.name.getText() !== _this.bundleConfig.package.getPackageNamespace()) {
                            if (module_1.flags & ts.NodeFlags.ExportContext) {
                                Logger.info("Component bundle. Module name != package namespace. Removing export modifier.");
                                var nodeModifier = module_1.modifiers[0];
                                // FIXME: update node - remove export modifier
                                //editText = this.whiteOut( nodeModifier.pos, nodeModifier.end, editText );
                            }
                        }
                    }
                }
                else {
                    if (Ast.getModifierFlagsNoCache(node) & ts.ModifierFlags.Export) {
                        Logger.info("Removing export modifier for non module declaration.");
                        var exportModifier = node.modifiers[0];
                        // FIXME: remove export modifier
                        // editText = this.whiteOut( exportModifier.pos, exportModifier.end, editText );
                    }
                }
            }
            return ts.visitEachChild(node, visitor, _this.context);
        };
        return ts.visitNode(sourceFile, visitor);
    };
    BundleBuilder.prototype.getSymbolFromNode = function (node) {
        var moduleNameExpr = Ast.getExternalModuleName(node);
        if (moduleNameExpr && moduleNameExpr.kind === ts.SyntaxKind.StringLiteral) {
            return this.program.getTypeChecker().getSymbolAtLocation(moduleNameExpr);
        }
        return undefined;
    };
    BundleBuilder.prototype.getNamedBindingsFromImport = function (node) {
        var bindingNames = [];
        if ((node.kind === ts.SyntaxKind.ImportDeclaration) && node.importClause.namedBindings) {
            var namedBindings = node.importClause.namedBindings;
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
    return BundleBuilder;
}());
var BundlerTransform = (function () {
    function BundlerTransform(options) {
        var _this = this;
        this.transformSourceFile = function (sourceFile) {
            _this.bundler = new BundleBuilder(_this.program, _this.bundlerOptions);
            return _this.bundler.transform(sourceFile, _this.context);
        };
        this.bundlerOptions = options || {};
    }
    BundlerTransform.prototype.transform = function (program, context) {
        this.compilerOptions = context.getCompilerOptions();
        this.program = program;
        this.context = context;
        return this.transformSourceFile;
    };
    return BundlerTransform;
}());
var TsBundler;
(function (TsBundler) {
    /**
     * Gets the TsBundler transformation callback function used to bundle a source
     * file node's dependencies into a single file source module.
     *
     * @param program Optional
     * @param options Optional bundler options.
     * @returns The bundler transform factory callback function.
     */
    function getBundlerTransform(program, options) {
        var bundlerTransform = new BundlerTransform(options);
        return function (context) { return bundlerTransform.transform(program, context); };
    }
    TsBundler.getBundlerTransform = getBundlerTransform;
})(TsBundler = exports.TsBundler || (exports.TsBundler = {}));
//# sourceMappingURL=tsbundler.js.map