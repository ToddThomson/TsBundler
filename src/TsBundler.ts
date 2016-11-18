import { Project } from "./Project/Project";
import { Logger } from "./Reporting/Logger";

import * as ts from "typescript";

namespace TsBundler {

    export interface CompileResult {
        getErrors(): ts.Diagnostic[];
        getEmitSkipped(): boolean;
        getEmittedOutput(): ts.MapLike<string>;
        getEmittedFiles(): string[];
        succeeded(): boolean;
    }
    
    export interface TranspileOutput {
        outputText: string;
        diagnostics?: ts.Diagnostic[];
        sourceMapText?: string;
    }
    
    export interface BuildResult {
        errors: ts.Diagnostic[];
        bundles?: CompileResult[];
        succeeded(): boolean;
    }

    export interface OnBuildCompleteCallback {
        ( status: BuildResult ): void;
    }

    export interface BundleBuilder {
        build( onDone: ( result: BuildResult ) => void ): void;
    }

    export function builder( configFilePath: string, settings?: any, onDone?: ( result: BuildResult ) => void ): BundleBuilder {

        if ( configFilePath === undefined && typeof configFilePath !== 'string' ) {
            throw new Error( "Provide a valid directory or file path to the Typescript project configuration json file." );
        }

        settings = settings || {};
        settings.logLevel = settings.logLevel || 0;

        Logger.setLevel( settings.logLevel );
        Logger.setName( "TsPackage" );

        var project  = new Project( configFilePath, settings )

        if ( onDone ) {
            project.build( onDone );
        }

        return project;
    }
}

// Nodejs module exports
module.exports = TsBundler;

export = TsBundler;
