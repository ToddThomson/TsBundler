var gulp = require( 'gulp' );
var runSequence = require( 'run-sequence' );
var paths = require( '../paths' );
var tsb = require( "../../src/tsbundler" );

var bundlerOptions  = {
    logLevel: 0,
    verbose: true
};

gulp.task( 'bundle', function() {
    var bundleBuilder = tsb.builder( paths.sourceTsConfig, bundlerOptions );
    
    return bundleBuilder.src( )
        .pipe( gulp.dest( paths.output ) );
} );
