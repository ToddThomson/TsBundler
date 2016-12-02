"use strict";
var tsbundler_1 = require("./src/tsbundler");
var gulp = require("gulp");
var bundlerOptions = {
    logLevel: 0,
    verbose: true
};
var bundleBuilder = tsbundler_1.TsBundler.builder("./src", bundlerOptions);
bundleBuilder.src()
    .pipe(gulp.dest("./dist/gulp"));
bundleBuilder.build(function (result) {
    if (!result.succeeded) {
        console.log("build failed");
    }
    else {
        console.log("build succeeded");
    }
});
//# sourceMappingURL=run.js.map