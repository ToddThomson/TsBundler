"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ts = require("typescript");
var NodeWalker_1 = require("../Ast/NodeWalker");
var Ast_1 = require("../Ast/Ast");
var StatisticsReporter_1 = require("../Reporting/StatisticsReporter");
var Logger_1 = require("../Reporting/Logger");
var NameGenerator_1 = require("./NameGenerator");
var ContainerContext_1 = require("./ContainerContext");
var IdentifierSymbolInfo_1 = require("./IdentifierSymbolInfo");
var Debug_1 = require("../Utils/Debug");
var Utilities_1 = require("../Utils/Utilities");
var BundleMinifier = (function (_super) {
    __extends(BundleMinifier, _super);
    function BundleMinifier(program, compilerOptions, bundleConfig) {
        _super.call(this);
        this.containerStack = [];
        this.classifiableContainers = {};
        this.allIdentifierInfos = {};
        this.identifierCount = 0;
        this.shortenedIdentifierCount = 0;
        this.program = program;
        this.checker = program.getTypeChecker();
        this.compilerOptions = compilerOptions;
        this.bundleConfig = bundleConfig;
        this.containerStack = [];
        this.nameGenerator = new NameGenerator_1.NameGenerator();
    }
    BundleMinifier.prototype.transform = function (bundleSourceFile) {
        this.bundleSourceFile = bundleSourceFile;
        return this.minify(bundleSourceFile);
    };
    BundleMinifier.prototype.removeWhitespace = function (jsContents) {
        // ES6 whitespace rules..
        // Special Cases..
        // break, continue, function: space right if next token is [Expression]
        // return, yield: space if next token is not a semicolon
        // else:
        // Space to left and right of keyword..
        // extends, in, instanceof : space left and right
        // Space to the right of the keyword..
        // case, class, const, delete, do, export, get, import, let, new, set, static, throw, typeof, var, void
        // Space not required..
        // catch, debugger, default, finally, for, if, super, switch, this, try, while, with
        // Notes..
        // export: Not supported yet? For now add space
        // default: When used with export?
        this.whiteSpaceTime = new Date().getTime();
        this.whiteSpaceBefore = jsContents.length;
        var output = "";
        var lastNonTriviaToken = ts.SyntaxKind.Unknown;
        var isTrivia = false;
        var token;
        var scanner = ts.createScanner(ts.ScriptTarget.ES5, /* skipTrivia */ false, ts.LanguageVariant.Standard, jsContents);
        while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
            isTrivia = false;
            if (Ast_1.Ast.isTrivia(token)) {
                // TJT: Uncomment to add new line trivia to output for testing purposes
                //if ( token === ts.SyntaxKind.NewLineTrivia ) {
                //    output += scanner.getTokenText();
                //}
                isTrivia = true;
            }
            if (!isTrivia) {
                // Process the last non trivia token
                switch (lastNonTriviaToken) {
                    case ts.SyntaxKind.FunctionKeyword:
                        // Space required after function keyword if next token is an identifier
                        if (token === ts.SyntaxKind.Identifier) {
                            output += " ";
                        }
                        break;
                    case ts.SyntaxKind.BreakKeyword:
                    case ts.SyntaxKind.ContinueKeyword:
                    case ts.SyntaxKind.ReturnKeyword:
                    case ts.SyntaxKind.YieldKeyword:
                        // Space not required after return keyword if the current token is a semicolon
                        if (token !== ts.SyntaxKind.SemicolonToken) {
                            output += " ";
                        }
                        break;
                    case ts.SyntaxKind.ElseKeyword:
                        // Space not required after return keyword if the current token is a punctuation
                        if (token !== ts.SyntaxKind.OpenBraceToken) {
                            output += " ";
                        }
                        break;
                }
                // Process the current token..
                switch (token) {
                    // Keywords that require a right space
                    case ts.SyntaxKind.CaseKeyword:
                    case ts.SyntaxKind.ClassKeyword:
                    case ts.SyntaxKind.ConstKeyword:
                    case ts.SyntaxKind.DeleteKeyword:
                    case ts.SyntaxKind.DoKeyword:
                    case ts.SyntaxKind.ExportKeyword: // TJT: Add a space just to be sure right now 
                    case ts.SyntaxKind.GetKeyword:
                    case ts.SyntaxKind.ImportKeyword:
                    case ts.SyntaxKind.LetKeyword:
                    case ts.SyntaxKind.NewKeyword:
                    case ts.SyntaxKind.SetKeyword:
                    case ts.SyntaxKind.StaticKeyword:
                    case ts.SyntaxKind.ThrowKeyword:
                    case ts.SyntaxKind.TypeOfKeyword:
                    case ts.SyntaxKind.VarKeyword:
                    case ts.SyntaxKind.VoidKeyword:
                        output += scanner.getTokenText() + " ";
                        break;
                    // Keywords that require space left and right..
                    case ts.SyntaxKind.ExtendsKeyword:
                    case ts.SyntaxKind.InKeyword:
                    case ts.SyntaxKind.InstanceOfKeyword:
                        output += " " + scanner.getTokenText() + " ";
                        break;
                    // Avoid concatenations of ++, + and --, - operators
                    case ts.SyntaxKind.PlusToken:
                    case ts.SyntaxKind.PlusPlusToken:
                        if ((lastNonTriviaToken === ts.SyntaxKind.PlusToken) ||
                            (lastNonTriviaToken === ts.SyntaxKind.PlusPlusToken)) {
                            output += " ";
                        }
                        output += scanner.getTokenText();
                        break;
                    case ts.SyntaxKind.MinusToken:
                    case ts.SyntaxKind.MinusMinusToken:
                        if ((lastNonTriviaToken === ts.SyntaxKind.MinusToken) ||
                            (lastNonTriviaToken === ts.SyntaxKind.MinusMinusToken)) {
                            output += " ";
                        }
                        output += scanner.getTokenText();
                        break;
                    default:
                        // All other tokens can be output. Keywords that do not require whitespace.
                        output += scanner.getTokenText();
                        break;
                }
            }
            if (!isTrivia) {
                lastNonTriviaToken = token;
            }
        }
        this.whiteSpaceAfter = output.length;
        this.whiteSpaceTime = new Date().getTime() - this.whiteSpaceTime;
        if (this.compilerOptions.diagnostics)
            this.reportWhitespaceStatistics();
        return output;
    };
    BundleMinifier.prototype.visitNode = function (node) {
        // Traverse nodes to build containers and process all identifiers nodes.
        if (this.isNextContainer(node)) {
            _super.prototype.visitNode.call(this, node);
            this.restoreContainer();
        }
        else {
            switch (node.kind) {
                case ts.SyntaxKind.Identifier:
                    var identifier = node;
                    var identifierSymbol = this.checker.getSymbolAtLocation(identifier);
                    // The identifierSymbol may be null when an identifier is accessed within a function that
                    // has been assigned to the prototype property of an object. We check for this here.
                    if (!identifierSymbol) {
                        identifierSymbol = this.getSymbolFromPrototypeFunction(identifier);
                    }
                    if (identifierSymbol) {
                        var identifierUID = Ast_1.Ast.getIdentifierUID(identifierSymbol);
                        if (identifierUID === undefined) {
                            if (identifierSymbol.flags & ts.SymbolFlags.Transient) {
                                // TJT: Can we ignore all transient symbols?
                                Logger_1.Logger.trace("Ignoring transient symbol: ", identifierSymbol.name);
                                break;
                            }
                            else {
                                identifierUID = ts.getSymbolId(identifierSymbol).toString();
                                Logger_1.Logger.trace("Generated symbol id for: ", identifierSymbol.name, identifierUID);
                            }
                        }
                        // Check to see if we've seen this identifer symbol before
                        if (Utilities_1.Utils.hasProperty(this.allIdentifierInfos, identifierUID)) {
                            Logger_1.Logger.info("Identifier already added: ", identifierSymbol.name, identifierUID);
                            // If we have, then add it to the identifier info references 
                            var prevAddedIdentifier = this.allIdentifierInfos[identifierUID];
                            this.allIdentifierInfos[identifierUID].addRef(identifier, this.currentContainer());
                            // If the previously added identifier is not in the current container's local identifier table then
                            // it must be excluded so that it's shortened name will not be used in this container.
                            if (!Utilities_1.Utils.hasProperty(this.currentContainer().localIdentifiers, identifierUID)) {
                                this.currentContainer().excludedIdentifiers[identifierUID] = prevAddedIdentifier;
                            }
                        }
                        else {
                            var identifierInfo = new IdentifierSymbolInfo_1.IdentifierInfo(identifier, identifierSymbol, this.currentContainer());
                            Logger_1.Logger.info("Adding new identifier: ", identifierInfo.getName(), identifierInfo.getId());
                            // Add the new identifier info to both the container and the all list
                            this.currentContainer().localIdentifiers[identifierUID] = identifierInfo;
                            this.allIdentifierInfos[identifierUID] = identifierInfo;
                            // We can't shorten identifier names that are 1 character in length AND
                            // we can't risk the chance that an identifier name will be replaced with a 2 char
                            // shortened name due to the constraint that the names are changed in place
                            var identifierName = identifierSymbol.getName();
                            if (identifierName.length === 1) {
                                identifierInfo.shortenedName = identifierName;
                                this.currentContainer().excludedIdentifiers[identifierUID] = identifierInfo;
                            }
                            this.identifierCount++;
                        }
                    }
                    else {
                        Logger_1.Logger.warn("Identifier does not have a symbol: ", identifier.text);
                    }
                    break;
            }
            _super.prototype.visitNode.call(this, node);
        }
    };
    BundleMinifier.prototype.getSymbolFromPrototypeFunction = function (identifier) {
        var containerNode = this.currentContainer().getNode();
        if (containerNode.kind === ts.SyntaxKind.FunctionExpression) {
            if (Ast_1.Ast.isPrototypeAccessAssignment(containerNode.parent)) {
                // Get the 'x' of 'x.prototype.y = f' (here, 'f' is 'container')
                var className = containerNode.parent // x.prototype.y = f
                    .left // x.prototype.y
                    .expression // x.prototype
                    .expression; // x
                var classSymbol = this.checker.getSymbolAtLocation(className);
                if (classSymbol && classSymbol.members) {
                    if (Utilities_1.Utils.hasProperty(classSymbol.members, identifier.text)) {
                        Logger_1.Logger.info("Symbol obtained from prototype function: ", identifier.text);
                        return classSymbol.members[identifier.text];
                    }
                }
            }
        }
        return undefined;
    };
    BundleMinifier.prototype.minify = function (sourceFile) {
        this.transformTime = new Date().getTime();
        // Walk the sourceFile to build containers and the identifiers within. 
        this.walk(sourceFile);
        this.shortenIdentifiers();
        this.transformTime = new Date().getTime() - this.transformTime;
        if (this.compilerOptions.diagnostics)
            this.reportMinifyStatistics();
        return sourceFile;
    };
    BundleMinifier.prototype.shortenIdentifiers = function () {
        // NOTE: Once identifier names are shortened, the typescript checker cannot be used. 
        // We first need to process all the class containers to determine which properties cannot be shortened 
        // ( if they are declared externally ).
        for (var classContainerKey in this.classifiableContainers) {
            var classContainer = this.classifiableContainers[classContainerKey];
            var abstractProperties = [];
            var heritageProperties = [];
            var implementsProperties = [];
            var extendsClause = Ast_1.Ast.getExtendsClause(classContainer.getNode());
            if (extendsClause) {
                // Check for abstract properties...
                // TODO: Abstract properties are currently not shortened, but they could possibly be.
                //       The child class that implements a parent class property would need to have the same shortened name.
                abstractProperties = Ast_1.Ast.getClassAbstractProperties(extendsClause, this.checker);
            }
            var implementsClause = Ast_1.Ast.getImplementsClause(classContainer.getNode());
            if (implementsClause) {
                implementsProperties = Ast_1.Ast.getImplementsProperties(implementsClause, this.checker);
            }
            heritageProperties = Ast_1.Ast.getClassHeritageProperties(classContainer.getNode(), this.checker);
            // Join the abstract and implements properties
            var excludedProperties = heritageProperties.concat(abstractProperties, implementsProperties);
            classContainer.excludedProperties = excludedProperties;
        }
        // Recursively process the container identifiers starting at the source file container...
        this.shortenContainerIdentifiers(this.sourceFileContainer);
    };
    BundleMinifier.prototype.shortenContainerIdentifiers = function (container) {
        // If this container extends a base/parent class then we must make sure we have processed the base/parent class members
        var baseClass = container.getBaseClass();
        if (baseClass) {
            // We need to get the container for the parent/base class
            var baseClassContainer = this.classifiableContainers[baseClass.name];
            if (baseClassContainer) {
                var baseClassMembers = baseClassContainer.getMembers();
                if (baseClassMembers) {
                    this.processClassMembers(baseClassMembers, baseClassContainer);
                }
            }
        }
        // Determine the names which cannot be used as shortened names in this container.
        this.excludeNames(container);
        // Process container members..
        var containerClassMembers = container.getMembers();
        if (containerClassMembers) {
            this.processClassMembers(containerClassMembers, container);
        }
        // Process container locals..
        var containerLocals = container.getLocals();
        if (containerLocals) {
            this.processContainerLocals(containerLocals, container);
        }
        // Process the containers identifiers...
        for (var identifierTableKey in container.localIdentifiers) {
            var identifierInfo = container.localIdentifiers[identifierTableKey];
            this.processIdentifierInfo(identifierInfo, container);
        }
        // Process the containers classifiables...
        // TJT: Review..
        for (var classifiableKey in container.classifiableSymbols) {
            var classSymbol = container.classifiableSymbols[classifiableKey];
            var classSymbolUId = Ast_1.Ast.getIdentifierUID(classSymbol);
            var classIdentifierInfo = this.allIdentifierInfos[classSymbolUId];
            this.processIdentifierInfo(classIdentifierInfo, container);
        }
        // Recursively go through container children in order added
        var containerChildren = container.getChildren();
        for (var j = 0; j < containerChildren.length; j++) {
            this.shortenContainerIdentifiers(containerChildren[j]);
        }
    };
    BundleMinifier.prototype.processIdentifierInfo = function (identifierInfo, container) {
        var _this = this;
        if (this.canShortenIdentifier(identifierInfo)) {
            var shortenedName_1 = this.getShortenedIdentifierName(container, identifierInfo);
            Logger_1.Logger.trace("Identifier shortened: ", identifierInfo.getName(), shortenedName_1);
            // Add the shortened name to the excluded names in each container that this identifier was found in.
            var containerRefs = identifierInfo.getContainers();
            for (var containerKey in containerRefs) {
                var containerRef = containerRefs[containerKey];
                containerRef.namesExcluded[shortenedName_1] = true;
            }
            // Change all referenced identifier nodes to the shortened name
            Utilities_1.Utils.forEach(identifierInfo.getIdentifiers(), function (identifier) {
                _this.setIdentifierText(identifier, shortenedName_1);
            });
            return;
        }
    };
    BundleMinifier.prototype.canShortenIdentifier = function (identifierInfo) {
        if (identifierInfo.isBlockScopedVariable() ||
            identifierInfo.isFunctionScopedVariable() ||
            identifierInfo.isInternalClass() ||
            identifierInfo.isInternalInterface() ||
            identifierInfo.isPrivateMethod() ||
            identifierInfo.isPrivateProperty() ||
            identifierInfo.isInternalFunction(this.bundleConfig.package.getPackageNamespace()) ||
            identifierInfo.isParameter() ||
            identifierInfo.isNamespaceImportAlias()) {
            Logger_1.Logger.trace("Identifier CAN be shortened: ", identifierInfo.getName());
            return true;
        }
        Logger_1.Logger.trace("Identifier CANNOT be shortened: ", identifierInfo.getName());
        return false;
    };
    BundleMinifier.prototype.getShortenedIdentifierName = function (container, identifierInfo) {
        // Identifier names are shortened in place. They must be the same length or smaller than the original name.
        if (!identifierInfo.shortenedName) {
            var identifierName = identifierInfo.getName();
            if (identifierName.length === 1) {
                // Just reuse the original name for 1 char names
                identifierInfo.shortenedName = identifierName;
            }
            else {
                // Loop until we have a valid shortened name
                // The shortened name MUST be the same length or less
                while (true) {
                    var shortenedName = this.nameGenerator.getName(container.getNameIndex());
                    Debug_1.Debug.assert(shortenedName.length <= identifierName.length);
                    if (!Utilities_1.Utils.hasProperty(container.namesExcluded, shortenedName)) {
                        identifierInfo.shortenedName = shortenedName;
                        break;
                    }
                    else {
                        Logger_1.Logger.trace("Generated name was excluded: ", shortenedName, identifierName);
                    }
                }
                this.shortenedIdentifierCount++;
            }
        }
        else {
            Logger_1.Logger.trace("Identifier already has shortened name: ", identifierInfo.getName(), identifierInfo.shortenedName);
        }
        Logger_1.Logger.info("Identifier shortened name: ", identifierInfo.getName(), identifierInfo.shortenedName);
        return identifierInfo.shortenedName;
    };
    BundleMinifier.prototype.setIdentifierText = function (identifier, text) {
        var identifierLength = identifier.text.length;
        var bufferLength = (identifier.end - identifier.pos);
        // Check to see if there is leading trivia
        var triviaOffset = identifier.getLeadingTriviaWidth();
        // Find the start of the identifier text within the identifier character array
        for (var identifierStart = identifier.pos + triviaOffset; identifierStart < identifier.pos + bufferLength; identifierStart++) {
            if (this.bundleSourceFile.text[identifierStart] === identifier.text[0])
                break;
        }
        // Replace the identifier text
        identifier.text = text;
        identifier.end = identifierStart + text.length;
        for (var i = 0; i < identifierLength; i++) {
            var replaceChar = " ";
            if (i < text.length) {
                replaceChar = text[i];
            }
            this.bundleSourceFile.text = Utilities_1.Utils.replaceAt(this.bundleSourceFile.text, identifierStart + i, replaceChar);
        }
    };
    BundleMinifier.prototype.processContainerLocals = function (locals, container) {
        for (var localsKey in locals) {
            var local = locals[localsKey];
            var localSymbolUId = Ast_1.Ast.getIdentifierUID(local.declarations[0].symbol);
            if (localSymbolUId) {
                var localIdentifierInfo = this.allIdentifierInfos[localSymbolUId];
                this.processIdentifierInfo(localIdentifierInfo, container);
            }
            else {
                Logger_1.Logger.warn("Container local does not have a UId");
            }
        }
    };
    BundleMinifier.prototype.processClassMembers = function (members, container) {
        for (var memberKey in members) {
            var member = members[memberKey];
            var memberSymbol = member.symbol;
            if (memberSymbol) {
                var memberSymbolUId = Ast_1.Ast.getIdentifierUID(memberSymbol);
                if (memberSymbolUId) {
                    var memberIdentifierInfo = this.allIdentifierInfos[memberSymbolUId];
                    var isExcludedProperty = false;
                    for (var excludedPropertyKey in container.excludedProperties) {
                        var memberIdentifierSymbol = memberIdentifierInfo.getSymbol();
                        var excludedPropertySymbol = container.excludedProperties[excludedPropertyKey];
                        // TJT: Review - How to determine equality here. For now just use name which seems pretty naive.
                        if (memberIdentifierSymbol.name === excludedPropertySymbol.name) {
                            isExcludedProperty = true;
                            memberIdentifierInfo.shortenedName = memberIdentifierInfo.getName();
                            break;
                        }
                    }
                    if (!isExcludedProperty) {
                        this.processIdentifierInfo(memberIdentifierInfo, container);
                    }
                }
                else {
                    Logger_1.Logger.warn("Container member does not have a UId");
                }
            }
            else {
                Logger_1.Logger.warn("Container member does not have a symbol.");
            }
        }
    };
    BundleMinifier.prototype.excludeNames = function (container) {
        // Determine identifier names which cannot be used in this container.
        // If this container extends a base/parent class then we exclude the base class member names.
        var baseClass = container.getBaseClass();
        if (baseClass) {
            // We need to get the container for the parent/base class
            var baseClassContainer = this.classifiableContainers[baseClass.name];
            if (baseClassContainer) {
                var baseClassMembers = baseClassContainer.getMembers();
                if (baseClassMembers) {
                    // The base class members must be excluded from this child class
                    for (var memberKey in baseClassMembers) {
                        var member = baseClassMembers[memberKey];
                        var memberSymbol = member.symbol;
                        var memberSymbolUId = Ast_1.Ast.getIdentifierUID(memberSymbol);
                        var excludedSymbol = this.allIdentifierInfos[memberSymbolUId];
                        if (excludedSymbol && excludedSymbol.shortenedName) {
                            container.namesExcluded[excludedSymbol.shortenedName] = true;
                        }
                    }
                }
            }
        }
        for (var identifierInfoKey in container.localIdentifiers) {
            var identifierInfo = container.localIdentifiers[identifierInfoKey];
            this.excludeNamesForIdentifier(identifierInfo, container);
        }
        for (var classifiableKey in container.classifiableSymbols) {
            var classSymbol = container.classifiableSymbols[classifiableKey];
            var classSymbolUId = Ast_1.Ast.getIdentifierUID(classSymbol);
            var classIdentifierInfo = this.allIdentifierInfos[classSymbolUId];
            Debug_1.Debug.assert(classIdentifierInfo !== undefined, "Container classifiable identifier symbol not found.");
            this.excludeNamesForIdentifier(classIdentifierInfo, container);
        }
    };
    BundleMinifier.prototype.getContainerExcludedIdentifiers = function (container) {
        // Recursively walk the container chain to find shortened identifier names that we cannot use in this container.
        var target = this.compilerOptions.target;
        var excludes = {};
        function getContainerExcludes(container) {
            // Recursively process the container block scoped children..
            var containerChildren = container.getChildren();
            for (var i = 0; i < containerChildren.length; i++) {
                var childContainer = containerChildren[i];
                //if ( childContainer.isBlockScoped() ) {
                getContainerExcludes(childContainer);
            }
            // Get the excluded identifiers in this block scoped container..
            for (var excludedIdentifierKey in container.excludedIdentifiers) {
                var excludedIdentifier = container.excludedIdentifiers[excludedIdentifierKey];
                // For function scoped identifiers we must exclude the identifier from the current container parent.
                // Note that for ES5, which doesn't have block scoped variables, we must also exclude the identifier.
                if ((!excludedIdentifier.isBlockScopedVariable) || (target === ts.ScriptTarget.ES5)) {
                    if (!Utilities_1.Utils.hasProperty(excludes, excludedIdentifier.getId())) {
                        excludes[excludedIdentifier.getId()] = excludedIdentifier;
                    }
                }
            }
        }
        // Start the search for excluded identifiers from the container's parent - the parent function scope container.
        getContainerExcludes(container.getParent());
        return excludes;
    };
    BundleMinifier.prototype.excludeNamesForIdentifier = function (identifierInfo, container) {
        // Exclude all shortened names that have already been used in child containers that this identifer is contained in.
        var identifierContainers = identifierInfo.getContainers();
        // For each container that the identifier is contained in..
        for (var containerKey in identifierContainers) {
            var identifierContainer = identifierContainers[containerKey];
            var containerExcludes = this.getContainerExcludedIdentifiers(identifierContainer);
            // We can't use any names that have already been used in this referenced container
            for (var excludedIdentifierKey in containerExcludes) {
                var excludedIdentifier = containerExcludes[excludedIdentifierKey];
                if (excludedIdentifier.shortenedName) {
                    container.namesExcluded[excludedIdentifier.shortenedName] = true;
                }
            }
        }
    };
    BundleMinifier.prototype.currentContainer = function () {
        return this.containerStack[this.containerStack.length - 1];
    };
    BundleMinifier.prototype.restoreContainer = function () {
        return this.containerStack.pop();
    };
    BundleMinifier.prototype.isNextContainer = function (node) {
        var containerFlags = Ast_1.Ast.getContainerFlags(node);
        if (containerFlags & (1 /* IsContainer */ | 2 /* IsBlockScopedContainer */)) {
            var nextContainer = new ContainerContext_1.Container(node, containerFlags, this.currentContainer());
            // Check if the container symbol is classifiable. If so save it for inheritance processing.
            var containerSymbol = node.symbol;
            if (containerSymbol && (containerSymbol.flags & ts.SymbolFlags.Class)) {
                var containerSymbolUId = Ast_1.Ast.getIdentifierUID(containerSymbol);
                // Save the class symbol into the current container ( its parent )
                if (!Utilities_1.Utils.hasProperty(this.currentContainer().classifiableSymbols, containerSymbolUId)) {
                    this.currentContainer().classifiableSymbols[containerSymbolUId] = containerSymbol;
                }
                // Save to the all classifiable containers table. See NOTE Inheritance below.
                if (!Utilities_1.Utils.hasProperty(this.classifiableContainers, containerSymbol.name)) {
                    this.classifiableContainers[containerSymbol.name] = nextContainer;
                }
                // Check for inheritance. We need to do this now because the checker cannot be used once names are shortened.
                var extendsClause = Ast_1.Ast.getExtendsClause(node);
                if (extendsClause) {
                    var baseClassSymbol = this.checker.getSymbolAtLocation(extendsClause.types[0].expression);
                    // NOTE Inheritance:
                    // If this child class is declared before the parent base class then the base class symbol will have symbolFlags.Merged.
                    // When the base class is declared it will have a different symbol id from the symbol id determined here.
                    // We should be able to use the symbol name for lookups in the classifiable containers table.
                    // let baseClassAlias = this.checker.getAliasedSymbol(baseClassSymbol);
                    nextContainer.setBaseClass(baseClassSymbol);
                }
            }
            // Before changing the current container we must first add the new container to the children of the current container.
            var currentContainer = this.currentContainer();
            // If we don't have a container yet then it is the source file container ( the first ).
            if (!currentContainer) {
                this.sourceFileContainer = nextContainer;
            }
            else {
                // Add new container context to the exising current container
                currentContainer.addChildContainer(nextContainer);
            }
            this.containerStack.push(nextContainer);
            return true;
        }
        return false;
    };
    BundleMinifier.prototype.reportWhitespaceStatistics = function () {
        var statisticsReporter = new StatisticsReporter_1.StatisticsReporter();
        statisticsReporter.reportTime("Whitespace time", this.whiteSpaceTime);
        statisticsReporter.reportPercentage("Whitespace reduction", ((this.whiteSpaceBefore - this.whiteSpaceAfter) / this.whiteSpaceBefore) * 100.00);
    };
    BundleMinifier.prototype.reportMinifyStatistics = function () {
        var statisticsReporter = new StatisticsReporter_1.StatisticsReporter();
        statisticsReporter.reportTime("Minify time", this.transformTime);
        statisticsReporter.reportCount("Total identifiers", this.identifierCount);
        statisticsReporter.reportCount("Identifiers shortened", this.shortenedIdentifierCount);
    };
    return BundleMinifier;
}(NodeWalker_1.NodeWalker));
exports.BundleMinifier = BundleMinifier;
