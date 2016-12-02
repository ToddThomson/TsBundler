[![npm version](https://badge.fury.io/js/tsbundler.svg)](http://badge.fury.io/js/tsbundler)
﻿[![Build Status](https://travis-ci.org/ToddThomson/TsBundler.svg?branch=master)](https://travis-ci.org/ToddThomson/TsBundler)
# TsBundler
TsBundler is a Typescript single module bundler and minifier.

## NOTICE

TsBundler is the replacement for TsProject. This is currently a work in progress. Please continue to use TsProject for now.

## Top Features

* Bundling of ES6 external Typescript modules
* Bundle minification with identifier shortening and whitespace removal
* Cache optimized incremental project builds
* File glob pattern matching for project files
 
## What's New

TsBundler 1.0.0 supports Typescript 2.x.

## Why TsBundler?

TsBundler is the only Typescript 2.0 transpiler that provides minified, single file typescript bundles and javascript bundles for packaging of Typescript, javascript and Typescript definition files.
TsBundler bundles file dependencies of external Typescript modules at compilation time rather than relying on build tools (AMD Optimizer, r.js for example ) further down in the build pipeline.

## TsBundler Wiki

Additional details can be found on the TsProject [wiki](https://github.com/ToddThomson/tspackage/wiki).

## Typescript ES6 External Module Bundles

TsBundler supports a "bundles" property within the Typescript project configuration json file. The "bundles" property may contain a list of named bundles. Each bundle must provide an array of source files and may optionally specify bundle configuration settings. 
The Typescript source file and its dependencies are packaged as a single Typescript file and output with the bundle name. The Typescript bundle is compiled to a single js javascript file and a single d.ts declaration file.

The following is a sample tsconfig.json showing the "bundles" property:

```
{
    "compilerOptions": {
        "module": "amd",
        "target": "es5",
        "noResolve": false,
        "declaration": true,
        "diagnostics": true
    },

    "files": [
        "index.ts",
        "page.ts",
        "common.ts",
		"plugin.ts"
    ],
    
    "bundles": {
        "app": {
            "files": [ "index.ts" ]
        },
        "components": {
            "files": [
                "page.ts",
                "plugin.ts"
            ],
            "config": {
			    "declaration": true,
                "outDir": "./bundles",
				"minify": true  
            }
        }
    }
}
```

## How to install

```
npm install tsbundler
```

## Node API

```
    interface BundlerOptions {
        verbose?: boolean;
        logLevel?: number;
        outDir?: string;
    }
    
    interface BuildResult {
        errors: ts.Diagnostic[];
        bundleOutput?: ts2js.CompilerResult[];
        succeeded(): boolean;
    }

    interface BundleBuilder {
        build( buildCompleted: (result: BuildResult) => void): void;
        src(): stream.Readable;
    }
    
    function builder(configFilePath: string, bundlerOptions?: BundlerOptions, buildCompleted?: (result: BuildResult) => void): BundleBuilder;

```

## Building TsBundler

TsBundler depends on [NPM](https://docs.npmjs.com/) as a package manager and 
[Gulp](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md) as a build tool. 
If you haven't already, you'll need to install both these tools in order to 
build TsBundler.

Once Gulp is installed, you can build it with the following commands:

```
npm install
gulp build
```  
