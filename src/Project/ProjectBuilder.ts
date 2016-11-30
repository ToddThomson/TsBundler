﻿import { DiagnosticsReporter } from "../Reporting/DiagnosticsReporter";
import { BuildResult } from "./BuildResult";
import { BuildStream } from "./BuildStream";
import { BundleBuilder } from "../Bundler/BundleBuilder";
import { BundlerOptions } from "../Bundler/BundlerOptions";
import { BundleFile, BundleResult } from "../Bundler/BundleResult";
import { Project } from "./Project";
import { ProjectConfig } from "./ProjectConfig";
import { IBundleBuilder } from "./IBundleBuilder";
import { StatisticsReporter } from "../Reporting/StatisticsReporter";
import { Logger } from "../Reporting/Logger";
import { BundleParser, Bundle } from "../Bundler/BundleParser";
import { Glob } from "../Utils/Glob";
import { TsCore } from "../Utils/TsCore";
import { Utils } from "../Utils/Utilities";

import * as ts2js from "ts2js";
import * as tsMinifier from "tsminifier";
import * as ts from "typescript";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import * as chalk from "chalk";
import * as stream from "stream";
import File = require( "vinyl" );

export class ProjectBuilder implements IBundleBuilder {
    private project: Project;
    private config: ProjectConfig;

    // TODO: move to BuildStatistics
    private totalBuildTime: number = 0;
    private totalCompileTime: number = 0;
    private totalPreBuildTime: number = 0;
    private totalBundleTime: number = 0;

    constructor( project: Project ) {
        this.project = project;
        this.config = project.getConfig();
    }

    public build( buildCompleted: ( result: BuildResult ) => void ): void {

        if ( !this.config.success ) {
            DiagnosticsReporter.reportDiagnostics( this.config.errors );

            return buildCompleted( new BuildResult( this.config.errors ) );
        }

        // Perform the build..
        this.buildWorker( ( result ) => {
            // onBuildCompleted...
            this.reportBuildStatus( result );
            
            return buildCompleted( result );
        });
    }

    public src(): stream.Readable {
        if ( !this.config.success && this.config.bundlerOptions.verbose ) {
            DiagnosticsReporter.reportDiagnostics( this.config.errors );

            throw new Error( "Invalid typescript configuration file" + this.config.configFile ? " " + this.config.configFile : ""  );
        }

        var outputStream = new BuildStream();

        // Perform the build..
        this.buildWorker( (buildResult) => {
            // onBuildCompleted..
            if ( buildResult.succeeded ) {
                buildResult.bundleOutput.forEach( ( compileResult ) => {
                    if ( !compileResult.emitSkipped ) {
                        compileResult.emitOutput.forEach(( emit ) => {
                            if ( !emit.emitSkipped ) {
                                if ( emit.text ) {
                                    const vinylFile = new File({ path: emit.fileName, contents: new Buffer( emit.text )})

                                    outputStream.push( vinylFile );
                                }
                            }
                        });
                    }
                });
            }

            outputStream.push( null );
        });

        return outputStream;
    }

    private buildWorker( buildCompleted: ( result: BuildResult ) => void ): void {
        let config = this.project.getConfig();

        if ( config.bundlerOptions.verbose ) {
            Logger.log( "Building project with: " + chalk.magenta( `${config.configFile}` ) );
            Logger.log( "TypeScript compiler version: ", ts.version );
        }

        this.totalBuildTime = this.totalPreBuildTime = new Date().getTime();

        let fileNames = config.fileNames;
        let bundles = config.bundles;
        let compilerOptions = config.compilerOptions;

        this.totalPreBuildTime = new Date().getTime() - this.totalPreBuildTime;

        // Compile the project...
        let compiler = new ts2js.Compiler( compilerOptions );

        if ( this.config.bundlerOptions.verbose ) {
            Logger.log( "Compiling project files..." );
        }
        
        this.totalCompileTime = new Date().getTime();

        var projectCompileResult = compiler.compile( fileNames );

        this.totalCompileTime = new Date().getTime() - this.totalCompileTime;

        if ( projectCompileResult.diagnostics.length > 0 ) {
            DiagnosticsReporter.reportDiagnostics( projectCompileResult.diagnostics );

            return buildCompleted( new BuildResult( projectCompileResult.diagnostics ) );
        }

        var allDiagnostics: ts.Diagnostic[] = [];
        var bundleCompileResults: ts2js.CompilerResult[] = [];
        var bundlingResults: BundleResult[] = [];

        this.totalBundleTime = new Date().getTime();

        // Create a bundle builder to build bundles..
        var bundleBuilder = new BundleBuilder( compiler.getHost(), compiler.getProgram() );

        for ( var i = 0, len = bundles.length; i < len; i++ ) {
            if ( this.config.bundlerOptions.verbose ) {
                Logger.log( "Building bundle: ", chalk.cyan( bundles[i].name ) );
            }

            var bundleResult = bundleBuilder.build( bundles[i] );

            bundlingResults.push( bundleResult );

            if ( !bundleResult.succeeded() ) {
                DiagnosticsReporter.reportDiagnostics( bundleResult.getErrors() );
                allDiagnostics.concat( bundleResult.getErrors() );

                continue;
            }

            var bundleSource = bundleResult.getBundleSource();
            
            var compileResult: ts2js.CompilerResult;
            
            if ( bundles[i].config.minify ) {
                compileResult = tsMinifier.minifyModule( bundleSource.text, bundleSource.path, compilerOptions, { mangleIdentifiers: true, removeWhitespace: true } );
            } else {
                compileResult = ts2js.compileModule( bundleSource.text, bundleSource.path, compilerOptions );
            }

            bundleCompileResults.push( compileResult );

            if ( this.config.bundlerOptions.verbose && ( compileResult.diagnostics.length > 0 ) ) {
                DiagnosticsReporter.reportDiagnostics( compileResult.diagnostics );
                allDiagnostics.concat( compileResult.diagnostics );
            }
        }

        this.totalBundleTime = new Date().getTime() - this.totalBundleTime;
        this.totalBuildTime = new Date().getTime() - this.totalBuildTime;

        if ( (<any>compilerOptions).diagnostics ) {
            this.reportStatistics();
        }

        return buildCompleted( new BuildResult( allDiagnostics, bundleCompileResults ) );
    }

    private reportBuildStatus( buildResult: BuildResult ) {
        if ( this.config.bundlerOptions.verbose ) {
            if ( buildResult.succeeded() ) {
                Logger.log( chalk.green( "Project build completed successfully." ) );
            }
            else {
                Logger.log( chalk.red( "Build completed with errors." ) );
            }
        }
    }

    private reportStatistics() {
        if ( this.config.bundlerOptions.verbose ) {
            let statisticsReporter = new StatisticsReporter();

            statisticsReporter.reportTitle( "Total build times..." );
            statisticsReporter.reportTime( "Pre-build time", this.totalPreBuildTime );
            statisticsReporter.reportTime( "Compiling time", this.totalCompileTime );
            statisticsReporter.reportTime( "Bundling time", this.totalBundleTime );
            statisticsReporter.reportTime( "Build time", this.totalBuildTime );
        }
    }
}