[![npm version](https://badge.fury.io/js/tsbundler.svg)](http://badge.fury.io/js/tsbundler)
﻿[![Build Status](https://travis-ci.org/ToddThomson/TsBundler.svg?branch=master)](https://travis-ci.org/ToddThomson/TsBundler)
# TsBundler
TsBundler is a custom Typescript transform that builds single module bundles.

## Top Features

* Bundling of external Typescript modules into a single file, single module bundle.
* Bundle file output can be to output to memory, disk or gulp (vinyl file stream) 

## TsBundler Wiki

Additional details can be found on the TsBundler [wiki](https://github.com/ToddThomson/TsBundler/wiki).

## Typescript Single Module Bundles

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

## Node API

```
    interface BundlerOptions {
        verbose?: boolean;
        logLevel?: number;
        outputToDisk?: string;
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

## How to install

```
npm install tsbundler
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
