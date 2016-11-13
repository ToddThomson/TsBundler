"use strict";
var ts = require("typescript");
var Ast_1 = require("../Ast/Ast");
var Logger_1 = require("../Reporting/Logger");
var ContainerIdGenerator = (function () {
    function ContainerIdGenerator() {
    }
    ContainerIdGenerator.getNextId = function () {
        return this.nextId++;
    };
    ContainerIdGenerator.nextId = 1;
    return ContainerIdGenerator;
}());
var Container = (function () {
    function Container(node, containerFlags, parentContainer) {
        this.childContainers = [];
        // The base class cannot be determined by the checker if the base class name has been shortened
        // so we use get and set for the baseClass property
        this.baseClass = undefined;
        this.namesExcluded = {};
        this.localIdentifiers = {};
        this.classifiableSymbols = {};
        this.excludedIdentifiers = {};
        this.excludedProperties = [];
        this.shortenedIdentifierCount = 0;
        this.id = ContainerIdGenerator.getNextId();
        this.containerFlags = containerFlags;
        if (containerFlags & 2 /* IsBlockScopedContainer */) {
            this.blockScopeContainer = node;
            this.isBlockScope = true;
            // A block scoped container's parent is the parent function scope container.
            this.parent = parentContainer.getParent();
        }
        else {
            this.container = this.blockScopeContainer = node;
            this.isBlockScope = false;
            // A function scoped container is it's own parent
            this.parent = this;
        }
        // The name generator index starts at 0 for containers 
        this.nameIndex = 0;
    }
    Container.prototype.getId = function () {
        return this.id;
    };
    Container.prototype.addChildContainer = function (container) {
        this.childContainers.push(container);
    };
    Container.prototype.getChildren = function () {
        return this.childContainers;
    };
    Container.prototype.getParent = function () {
        return this.parent;
    };
    Container.prototype.getNameIndex = function () {
        // TJT: This logic needs to be reviewed for applicability to ES6 block scopes
        if (this.isBlockScope) {
            // The name generator index for block scoped containers is obtained from the parent container
            return this.parent.getNameIndex();
        }
        return this.nameIndex++;
    };
    Container.prototype.getNode = function () {
        return this.isBlockScope ? this.blockScopeContainer : this.container;
    };
    Container.prototype.getMembers = function () {
        if (this.container) {
            switch (this.container.kind) {
                case ts.SyntaxKind.ClassDeclaration:
                    return this.container.members;
                case ts.SyntaxKind.EnumDeclaration:
                    return this.container.members;
                default:
                    Logger_1.Logger.trace("Container::getMembers() unprocessed container kind: ", this.container.kind);
            }
        }
        return undefined;
    };
    Container.prototype.getLocals = function () {
        if (this.container && this.containerFlags & 32 /* HasLocals */) {
            switch (this.container.kind) {
                case ts.SyntaxKind.ModuleDeclaration:
                    return this.container.locals;
                default:
                    Logger_1.Logger.warn("Container::getLocals() unprocessed container kind: ", this.container.kind);
            }
        }
        return undefined;
    };
    Container.prototype.isBlockScoped = function () {
        return this.isBlockScope;
    };
    Container.prototype.isFunctionScoped = function () {
        if (this.containerFlags & (1 /* IsContainer */ | 33 /* IsContainerWithLocals */)) {
            return true;
        }
        return false;
    };
    Container.prototype.setBaseClass = function (baseClass) {
        if (baseClass.flags & ts.SymbolFlags.Class) {
            this.baseClass = baseClass;
        }
    };
    Container.prototype.getBaseClass = function () {
        return this.baseClass;
    };
    Container.prototype.hasChild = function (container) {
        for (var i = 0; i < this.childContainers.length; i++) {
            if (container.getId() === this.childContainers[i].getId())
                return true;
        }
        return false;
    };
    return Container;
}());
exports.Container = Container;
