"use strict";
// TsBundler ambient module to define the package external exports/API.
Object.defineProperty(exports, "__esModule", { value: true });
// Notes
// Best practices: utilize an index.ts to define the package external exports / API
// This becomes the Typescript definition file d.ts for the package.
// Interfaces
var ProjectBuilder_1 = require("./Project/ProjectBuilder");
exports.ProjectBuilder = ProjectBuilder_1.ProjectBuilder;
// API
var TsBundler_1 = require("./TsBundler");
exports.builder = TsBundler_1.builder;
//# sourceMappingURL=index.js.map