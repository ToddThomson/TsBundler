import { DiagnosticsReporter } from "../Reporting/DiagnosticsReporter"
import { ProjectBuildResult, BuildResult } from "./BuildResult"
import { BuildStream } from "./BuildStream"
import { BundleBuilder } from "./BundleBuilder"
import { Project } from "./Project"
import { ProjectConfig } from "./ProjectConfig"
import { StatisticsReporter } from "../Reporting/StatisticsReporter"
import { Logger } from "../Reporting/Logger"
import { Glob } from "../Utils/Glob"
import { TsCore } from "../Utils/TsCore"
import { Utils } from "../Utils/Utilities"

import * as Bundler from "../Bundler/BundlerModule"
import * as ts2js from "ts2js"
import * as tsMinifier from "tsminifier"
import * as ts from "typescript"
import * as _ from "lodash"
import * as fs from "fs"
import * as path from "path"
import * as chalk from "chalk"
import * as stream from "stream"
import * as gutil from "gulp-util"
import File = require( "vinyl" )

export class ProjectBuilder implements BundleBuilder {
    private project: Project;
    private config: ProjectConfig;

    // TODO: move to BuildStatistics
    private totalBuildTime: number = 0;
    private totalCompileTime: number = 0;
    private totalBundleTime: number = 0;

    constructor( project: Project ) {
        this.project = project;
        this.config = project.getConfig();
    }

    public build( buildCompleted: ( result: BuildResult ) => void ): void {
        // Configuration errors?
        if ( !this.config.success ) {
            
            if ( this.config.bundlerOptions.verbose ) {
                DiagnosticsReporter.reportDiagnostics( this.config.errors );
            }

            return buildCompleted( new ProjectBuildResult( this.config.errors ) );
        }

        // Perform the build..
        this.buildWorker( ( buildResult ) => {
            // onBuildCompleted...

            if ( this.config.bundlerOptions.outputToDisk ) {
                if ( buildResult.succeeded() ) {
                    buildResult.bundleCompilerResults.forEach( ( compileResult ) => {
                        if ( !compileResult.emitSkipped ) {
                            compileResult.emitOutput.forEach(( emit ) => {
                                if ( !emit.emitSkipped ) {
                                    var vinylFile: File;
                                    if ( emit.codeFile ) {
                                        fs.writeFile( emit.codeFile.fileName, emit.codeFile.data );
                                    }
                                    if ( emit.dtsFile ) {
                                        fs.writeFile( emit.dtsFile.fileName, emit.dtsFile.data );
                                    }

                                    if ( emit.mapFile ) {
                                        fs.writeFile( emit.mapFile.fileName, emit.mapFile.data );
                                    }
                                }
                            });
                        }
                    });
                }
            }
          
            this.reportBuildStatus( buildResult );
            
            return buildCompleted( buildResult );
        });
    }

    public src(): stream.Readable {
        if ( !this.config.success ) {
            
            if ( this.config.bundlerOptions.verbose ) {
                DiagnosticsReporter.reportDiagnostics( this.config.errors );
            }

            const configFileName = this.config.configFile ? " " + this.config.configFile : "";

            throw new gutil.PluginError({
                plugin: "TsBundler",
                message: "Invalid typescript configuration file" + configFileName 
            });
        }

        var outputStream = new BuildStream();
        var vinylFile: File;

        // Perform the build..
        this.buildWorker( ( buildResult ) => {
            // onBuildCompleted...

            // Emit bundle source files, if any
            if ( buildResult.bundleBuilderResults ) {
                buildResult.bundleBuilderResults.forEach( ( bundleBuildResult ) => {
                    var bundleSource = bundleBuildResult.getBundleSource();
                    vinylFile = new File({ path: bundleSource.path, contents: new Buffer( bundleSource.text )})
                    outputStream.push( vinylFile );
                });
            }

            // Emit bundle compilation results...
            if ( buildResult.succeeded() ) {
                buildResult.bundleCompilerResults.forEach( ( compileResult ) => {
                    if ( !compileResult.emitSkipped ) {
                        compileResult.emitOutput.forEach(( emit ) => {
                            if ( !emit.emitSkipped ) {
                                if ( emit.codeFile ) {
                                    vinylFile = new File({ path: emit.codeFile.fileName, contents: new Buffer( emit.codeFile.data )})

                                    outputStream.push( vinylFile );
                                }
                                if ( emit.dtsFile ) {
                                    vinylFile = new File({ path: emit.dtsFile.fileName, contents: new Buffer( emit.dtsFile.data )})

                                    outputStream.push( vinylFile );
                                }

                                if ( emit.mapFile ) {
                                    vinylFile = new File({ path: emit.mapFile.fileName, contents: new Buffer( emit.mapFile.data )})

                                    outputStream.push( vinylFile );
                                }
                            }
                        });
                    }
                });
            }

            this.reportBuildStatus( buildResult );

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

        let fileNames = config.fileNames;
        let bundles = config.bundles;
        let compilerOptions = config.compilerOptions;

        // Compile the project...
        let compiler = new ts2js.Compiler( compilerOptions );

        if ( this.config.bundlerOptions.verbose ) {
            Logger.log( "Compiling project files..." );
        }
        this.totalBuildTime = new Date().getTime();        
        this.totalCompileTime = new Date().getTime();

        var projectCompileResult = compiler.compile( fileNames );

        this.totalCompileTime = new Date().getTime() - this.totalCompileTime;

        if ( projectCompileResult.diagnostics.length > 0 ) {
            DiagnosticsReporter.reportDiagnostics( projectCompileResult.diagnostics );

            return buildCompleted( new ProjectBuildResult( projectCompileResult.diagnostics ) );
        }

        var allDiagnostics: ts.Diagnostic[] = [];
        var bundleCompileResults: ts2js.CompilerResult[] = [];
        var bundleBuildResults: Bundler.BundleBuildResult[] = [];

        this.totalBundleTime = new Date().getTime();

        // Create a bundle builder to build bundles..
        var bundleBuilder = new Bundler.BundleBuilder( compiler.getHost(), compiler.getProgram(), this.config.bundlerOptions );

        if ( this.config.bundlerOptions.verbose && ( bundles.length == 0 ) ) {
            Logger.log( chalk.yellow( "No bundles found to build." ) );
        }

        for ( var i = 0, len = bundles.length; i < len; i++ ) {
            if ( this.config.bundlerOptions.verbose ) {
                Logger.log( "Building bundle: ", chalk.cyan( bundles[i].name ) );
            }

            var bundleResult = bundleBuilder.build( bundles[i] );

            bundleBuildResults.push( bundleResult );

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

        if ( this.config.bundlerOptions.verbose ) {
            this.reportStatistics();
        }

        return buildCompleted( new ProjectBuildResult( allDiagnostics, bundleBuildResults, bundleCompileResults ) );
    }

    private reportBuildStatus( buildResult: BuildResult ) {
        if ( this.config.bundlerOptions.verbose ) {
            if ( buildResult.succeeded() ) {
                Logger.log( chalk.green( "Build completed successfully." ) );
            }
            else {
                Logger.log( chalk.red( "Build completed with errors." ) );
            }
        }
    }

    private reportStatistics() {
        if ( this.config.bundlerOptions.verbose ) {
            let statisticsReporter = new StatisticsReporter();

            statisticsReporter.reportTitle( "Build times" );
            statisticsReporter.reportTime( "Compiling time", this.totalCompileTime );
            statisticsReporter.reportTime( "Bundling time", this.totalBundleTime );
            statisticsReporter.reportTime( "Total Build time", this.totalBuildTime );
        }
    }
}