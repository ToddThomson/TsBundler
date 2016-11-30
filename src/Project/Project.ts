//import { DiagnosticsReporter } from "../Reporting/DiagnosticsReporter";
//import { BuildResult } from "./BuildResult";
//import { BundleBuilder } from "../Bundler/BundleBuilder";
import { BundlerOptions } from "../Bundler/BundlerOptions";
//import { BundleFile, BundleResult } from "../Bundler/BundleResult";
import { ProjectConfig } from "./ProjectConfig";
//import { StatisticsReporter } from "../Reporting/StatisticsReporter";
import { Logger } from "../Reporting/Logger";
import { BundleParser, Bundle } from "../Bundler/BundleParser";
import { Glob } from "../Utils/Glob";
import { TsCore } from "../Utils/TsCore";
import { Utils } from "../Utils/Utilities";

import * as ts from "typescript";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import * as chalk from "chalk";

export class Project {

    private configFileName: string;
    private configFilePath: string;
    private settings: BundlerOptions;

    private config: ProjectConfig;

    constructor( configFilePath: string, settings?: BundlerOptions  ) {
        this.configFilePath = configFilePath;
        this.settings = settings || {};

        this.config = this.parseProjectConfig();
    }

    public getConfig(): ProjectConfig {
        return this.config;
    }

    private parseProjectConfig(): ProjectConfig {
        var configFileDir: string;
        
        try {
            var isConfigDirectory = fs.lstatSync( this.configFilePath ).isDirectory();
        }
        catch ( e ) {
            let diagnostic = TsCore.createDiagnostic( { code: 6064, category: ts.DiagnosticCategory.Error, key: "Cannot_read_project_path_0_6064", message: "Cannot read project path '{0}'." }, this.configFilePath );
            return { success: false, errors: [diagnostic] };
        }

        if ( isConfigDirectory ) {
            configFileDir = this.configFilePath;
            this.configFileName = path.join( this.configFilePath, "tsconfig.json" );
        }
        else {
            configFileDir = path.dirname( this.configFilePath );
            this.configFileName = this.configFilePath;
        }

        Logger.info( "Reading config file:", this.configFileName );
        let readConfigResult = ts.readConfigFile( this.configFileName, this.readConfigFile );

        if ( readConfigResult.error ) {
            return { success: false, configFile: this.configFileName, errors: [readConfigResult.error] };
        }

        let configObject = readConfigResult.config;

        // Parse standard project configuration objects: compilerOptions, files.
        Logger.info( "Parsing config file..." );
        var configParseResult = ts.parseJsonConfigFileContent( configObject, ts.sys, configFileDir );

        if ( configParseResult.errors.length > 0 ) {
            return { success: false, configFile: this.configFileName, errors: configParseResult.errors };
        }

        // The returned "Files" list may contain file glob patterns. 
        configParseResult.fileNames = this.expandFileNames( configParseResult.fileNames, configFileDir );

        // Parse "bundle" project configuration objects: compilerOptions, files.
        var bundleParser = new BundleParser();
        var bundlesParseResult = bundleParser.parseConfigFile( configObject, configFileDir );

        if ( bundlesParseResult.errors.length > 0 ) {
            return { success: false, configFile: this.configFileName, errors: bundlesParseResult.errors };
        }

        // The returned bundles "Files" list may contain file glob patterns. 
        bundlesParseResult.bundles.forEach( bundle => {
            bundle.fileNames = this.expandFileNames( bundle.fileNames, configFileDir );
        });

        // Parse the command line args to override project file compiler options
        let settingsCompilerOptions = this.getSettingsCompilerOptions( this.settings, configFileDir );

        // Check for any errors due to command line parsing
        if ( settingsCompilerOptions.errors.length > 0 ) {
            return { success: false, configFile: this.configFileName, errors: settingsCompilerOptions.errors };
        }

        let compilerOptions = Utils.extend( settingsCompilerOptions.options, configParseResult.options );

        return {
            success: true,
            configFile: this.configFileName,
            bundlerOptions: this.settings,
            compilerOptions: compilerOptions,
            fileNames: configParseResult.fileNames,
            bundles: bundlesParseResult.bundles
        }
    }
    
    private readConfigFile( fileName: string ): string {
        return ts.sys.readFile( fileName );
    }

    private getSettingsCompilerOptions( jsonSettings: any, configDirPath: string ): ts.ParsedCommandLine {
        // Parse the json settings from the TsProject src() API
        let parsedResult = ts.parseJsonConfigFileContent( jsonSettings, ts.sys, configDirPath );

        // Check for compiler options that are not relevent/supported.

        // Not supported: --project, --init
        // Ignored: --help, --version

        if ( parsedResult.options.project ) {
            let diagnostic = TsCore.createDiagnostic( { code: 5099, category: ts.DiagnosticCategory.Error, key: "The_compiler_option_0_is_not_supported_in_this_context_5099", message: "The compiler option '{0}' is not supported in this context." }, "--project" );
            parsedResult.errors.push( diagnostic );
        }

        // FIXME: Perhaps no longer needed?

        //if ( parsedResult.options.init ) {
        //    let diagnostic = TsCore.createDiagnostic( { code: 5099, category: ts.DiagnosticCategory.Error, key: "The_compiler_option_0_is_not_supported_in_this_context_5099", message: "The compiler option '{0}' is not supported in this context." }, "--init" );
        //    parsedResult.errors.push( diagnostic );
        //}

        return parsedResult;
    }

    private expandFileNames( files: string[], configDirPath: string ): string[] {
        // The parameter files may contain a mix of glob patterns and filenames.
        // glob.expand() will only return a list of all expanded "found" files. 
        // For filenames without glob patterns, we add them to the list of files as we will want to know
        // if any filenames are not found during bundle processing.

        var glob = new Glob();
        var nonglobFiles: string[] = [];

        Utils.forEach( files, file => {
            if ( !glob.hasPattern( file ) ) {
                nonglobFiles.push( path.normalize( file ) );
            }
        });
                            
        // Get the list of expanded glob files
        var globFiles = glob.expand( files, configDirPath );
        var normalizedGlobFiles: string[] = [];

        // Normalize file paths for matching
        Utils.forEach( globFiles, file => {
            normalizedGlobFiles.push( path.normalize( file ) );
        });

        // The overall file list is the union of both non-glob and glob files
        return _.union( normalizedGlobFiles, nonglobFiles );
    }

    private convertProjectFileNames( fileNames: string[], configDirPath: string ) {
        let configFileText = "";

        try {
            configFileText = fs.readFileSync( this.configFileName, 'utf8' );

            if ( configFileText !== undefined ) {
                let jsonConfigObject = JSON.parse( configFileText );
                let relativeFileNames: string[] = [];
                
                fileNames.forEach( fileName => {
                    relativeFileNames.push ( path.relative( configDirPath, fileName ).replace( /\\/g, "/" ) );
                });

                jsonConfigObject["files"] = relativeFileNames;

                fs.writeFileSync( this.configFileName, JSON.stringify( jsonConfigObject, undefined, 4 ) );
            }
        }
        catch( e ) {
            if ( this.config.bundlerOptions.verbose ) {
                Logger.log( chalk.yellow( "Converting project files failed." ) );
            }
        }
    }
}