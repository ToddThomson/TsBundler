import { Project } from "./Project/Project";
import { ProjectBuilder } from "./Project/ProjectBuilder";
import { BundlerOptions } from "./Bundler/BundlerOptions";
import { Logger } from "./Reporting/Logger";

import * as ts from "typescript";
import * as tsc from "ts2js";
import * as stream from "stream";

//export { BundlerOptions }

namespace TsBundler {

    export interface BuildResult {
        errors: ts.Diagnostic[];
        bundles?: tsc.CompilerResult[];
        succeeded(): boolean;
    }

    export interface OnBuildCompletedCallback {
        ( result: BuildResult ): void;
    }

    export interface BundleBuilder {
        build( onDone: ( result: BuildResult ) => void ): void;
        src(): stream.Readable;
    }

    export function builder( configFilePath: string, bundlerOptions?: BundlerOptions, buildCompleted?: ( result: BuildResult ) => void ): BundleBuilder {

        if ( configFilePath === undefined && typeof configFilePath !== 'string' ) {
            throw new Error( "Provide a valid directory or file path to the Typescript project configuration json file." );
        }

        bundlerOptions = bundlerOptions || {};
        bundlerOptions.logLevel = bundlerOptions.logLevel || 0;

        Logger.setLevel( bundlerOptions.logLevel );
        Logger.setName( "TsBundler" );

        var projectBuilder = new ProjectBuilder( new Project( configFilePath, bundlerOptions ) );

        if ( buildCompleted ) {
            projectBuilder.build( buildCompleted );
        }

        return projectBuilder;
    }
}

// Nodejs module exports
module.exports = TsBundler;

export = TsBundler;
