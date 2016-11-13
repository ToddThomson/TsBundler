"use strict";
var Utilities_1 = require("../Utils/Utilities");
var ProjectBuildContext = (function () {
    function ProjectBuildContext(host, config, program) {
        this.host = host;
        this.setProgram(program);
        this.config = config;
    }
    ProjectBuildContext.prototype.isWatchMode = function () {
        this.config.compilerOptions.watch || false;
    };
    ProjectBuildContext.prototype.getProgram = function () {
        return this.program;
    };
    ProjectBuildContext.prototype.setProgram = function (program) {
        if (this.program) {
            var newSourceFiles_1 = program ? program.getSourceFiles() : undefined;
            Utilities_1.Utils.forEach(this.program.getSourceFiles(), function (sourceFile) {
                // Remove fileWatcher from the outgoing program source files if they are not in the 
                // new program source file set
                if (!(newSourceFiles_1 && Utilities_1.Utils.contains(newSourceFiles_1, sourceFile))) {
                    var watchedSourceFile = sourceFile;
                    if (watchedSourceFile.fileWatcher) {
                        watchedSourceFile.fileWatcher.unwatch(watchedSourceFile.fileName);
                    }
                }
            });
        }
        // Update the host with the new program
        this.host.setReuseableProgram(program);
        this.program = program;
    };
    return ProjectBuildContext;
}());
exports.ProjectBuildContext = ProjectBuildContext;
