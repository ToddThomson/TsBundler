import { Project } from "./Project/Project";
import { CompileStream } from "./Compiler/CompileStream";
import { Logger } from "./Reporting/Logger";

import * as ts from "typescript";

export namespace TsPackage {

    export function builder( configFilePath: string, settings?: any, onDone?: ( status: ts.ExitStatus ) => void ): Project {

        if ( configFilePath === undefined && typeof configFilePath !== 'string' ) {
            throw new Error( "Provide a valid directory or file path to the Typescript project configuration json file." );
        }

        settings = settings || {};
        settings.logLevel = settings.logLevel || 0;

        Logger.setLevel( settings.logLevel );
        Logger.setName( "TsPackage" );

        var project  = new Project( configFilePath, settings )

        if ( onDone ) {
            project.build( null );
        }

        return project;
    }
}

// Nodejs module exports
module.exports = TsPackage;
