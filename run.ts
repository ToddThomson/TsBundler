import * as tsbundler from "./src/tsbundler";
var gulp = require( "gulp" );

var buildSettings = {
    logLevel: 0,
    verbose: true,
    compileToMemory: false,
    compilerOptions: {
        watch: false,
        listFiles: false
    }
};

var bundleBuilder = tsbundler.builder( "./src", buildSettings );

bundleBuilder.src()
    .pipe( gulp.dest( "./dist" ) );

bundleBuilder.build( ( result: tsbundler.BuildResult ) => {
    if ( !result.succeeded ) {
        console.log( "build failed" );
    } else {
        console.log( "build succeeded" );
    }
});