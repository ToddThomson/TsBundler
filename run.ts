import * as TsBundler from "./src/tsbundler";

var buildSettings = {
    logLevel: 0,
    compileToMemory: false,
    compilerOptions: {
        watch: false,
        listFiles: false
    }
};

var bundler = TsBundler.builder( "./src", buildSettings );

bundler.build( ( result: TsBundler.BuildResult ) => {
    if ( !result.succeeded ) {
        console.log( "build failed" );
    } else {
        console.log( "build succeeded" );
    }
});