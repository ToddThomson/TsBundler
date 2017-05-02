import * as Bundler from "./Bundler/BundlerModule";

import { Project } from "./Project/Project";
import { ProjectBuilder } from "./Project/ProjectBuilder";
import { BundleBuilder } from "./Project/BundleBuilder";
import { BuildResult } from "./Project/BuildResult";
import { Logger } from "./Reporting/Logger";

import * as ts from "typescript";
import * as tsc from "ts2js";
import * as stream from "stream";

// Interfaces
export { ProjectBuilder } from "./Project/ProjectBuilder";
export { BundlerOptions } from "./Bundler/BundlerModule";
export { BuildResult } from "./Project/BuildResult";

//export interface BundleBuilder {
//        build( buildCompleted: ( result: BuildResult ) => void ): void;
//        src(): stream.Readable;    
//    };

export function builder( configFilePath: string, bundlerOptions?: Bundler.BundlerOptions, buildCompleted?: ( result: BuildResult ) => void ): BundleBuilder {

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

// TJT: Comment out when testing locally
//module.exports = TsBundler;
