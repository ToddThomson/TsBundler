import { TsBundler, BundlerOptions, BuildResult } from "./src/tsbundler";
var gulp = require( "gulp" );

var bundlerOptions: BundlerOptions  = {
    logLevel: 0,
    verbose: true
};

var bundleBuilder = TsBundler.builder( "./src", bundlerOptions );

bundleBuilder.src()
    .pipe( gulp.dest( "./dist/gulp" ) );

bundleBuilder.build( ( result: BuildResult ) => {
    if ( !result.succeeded ) {
        console.log( "build failed" );
    } else {
        console.log( "build succeeded" );
    }
});