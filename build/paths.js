var path = require( 'path' );

var sourceRoot = './src/';
var buildRoot = './built/';
var releaseRoot = './lib/';
var bundleDir = 'bundle/'
var testRoot = './tests/spec/'

module.exports = {
    root: sourceRoot,
    tests: testRoot + '**/*.js',
    sourceTsConfig: sourceRoot + 'tsconfig.json',
    source: sourceRoot + '**/*.ts',
    output: buildRoot,
    main: buildRoot + sourceRoot + bundleDir + 'TsBundler.js',
    typings: buildRoot + sourceRoot + bundleDir + 'TsBundler.d.ts',
    release: releaseRoot
};
