"use strict";
var Project_1 = require("./Project/Project");
var Logger_1 = require("./Reporting/Logger");
var TsPackage;
(function (TsPackage) {
    function builder(configFilePath, settings, onDone) {
        if (configFilePath === undefined && typeof configFilePath !== 'string') {
            throw new Error("Provide a valid directory or file path to the Typescript project configuration json file.");
        }
        settings = settings || {};
        settings.logLevel = settings.logLevel || 0;
        Logger_1.Logger.setLevel(settings.logLevel);
        Logger_1.Logger.setName("TsPackage");
        var project = new Project_1.Project(configFilePath, settings);
        if (onDone) {
            project.build(null);
        }
        return project;
    }
    TsPackage.builder = builder;
})(TsPackage = exports.TsPackage || (exports.TsPackage = {}));
// Nodejs module exports
module.exports = TsPackage;
