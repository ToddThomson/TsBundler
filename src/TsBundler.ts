import { Project } from "./Project/Project";
import { ProjectBuilder } from "./Project/ProjectBuilder";
import { BundlerOptions } from "./Bundler/BundlerOptions";
import { Logger } from "./Reporting/Logger";

import * as ts from "typescript";
import * as tsc from "ts2js";
import * as stream from "stream";

// Interface Types...
export { BundlerOptions };

export interface BuildResult {
    errors: ts.Diagnostic[];
    bundleOutput?: tsc.CompilerResult[];
    succeeded(): boolean;
};

export namespace TsBundler {

    export interface BundleBuilder {
        build( buildCompleted: ( result: BuildResult ) => void ): void;
        src(): stream.Readable;    
    };

    export function builder( configFilePath: string, bundlerOptions?: BundlerOptions, buildCompleted?: ( result: BuildResult ) => void ): BundleBuilder {

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

// TJT: Comment out when testing locally
module.exports = TsBundler;
