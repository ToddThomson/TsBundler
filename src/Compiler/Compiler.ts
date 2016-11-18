import { CompilerResult } from "./CompilerResult";
import { CachingCompilerHost }  from "./CachingCompilerHost";
import { CompileStream }  from "./CompileStream";
import { TsCompilerOptions } from "./TsCompilerOptions";
import { StatisticsReporter } from "../Reporting/StatisticsReporter";
import { Logger } from "../Reporting/Logger";
import { TsVinylFile } from "../Project/TsVinylFile";
import { Utils } from "../Utils/Utilities";
import { TsCore } from "../Utils/TsCore";

import * as ts from "typescript";
import * as path from "path";

export class Compiler {

    private compilerHost: CachingCompilerHost;
    private program: ts.Program;
    private compilerOptions: TsCompilerOptions;

    private preEmitTime: number = 0;
    private emitTime: number = 0;

    constructor( compilerHost: CachingCompilerHost, program: ts.Program ) {
        this.compilerHost = compilerHost
        this.program = program;
        this.compilerOptions = this.program.getCompilerOptions();
    }

    public compile(): CompilerResult {
        this.preEmitTime = new Date().getTime();

        var diagnostics = ts.getPreEmitDiagnostics( this.program );

        if ( this.compilerOptions.noEmitOnError && diagnostics.length > 0 ) {
            return new CompilerResult( true, diagnostics );
        }

        if ( this.compilerOptions.noEmit ) {
            return new CompilerResult( true, [] );
        }

        this.preEmitTime = new Date().getTime() - this.preEmitTime;

        // Compile the source files..
        let startTime = new Date().getTime();

        var emitResult = this.program.emit();

        this.emitTime = new Date().getTime() - startTime;

        diagnostics = diagnostics.concat( emitResult.diagnostics );

        // If the emitter didn't emit anything, then we're done
        if ( emitResult.emitSkipped ) {
            return new CompilerResult( true, diagnostics );
        }

        // The emitter emitted something, inform the caller if that happened in the presence of diagnostics.
        if ( diagnostics.length > 0 ) {
            return new CompilerResult( false, diagnostics, emitResult.emittedFiles, this.compilerHost.getOutput() );
        }

        if ( this.compilerOptions.diagnostics ) {
            this.reportStatistics();
        }

        return new CompilerResult( false, [], emitResult.emittedFiles, this.compilerHost.getOutput() );
    }

    private reportStatistics() {
        let statisticsReporter = new StatisticsReporter();

        statisticsReporter.reportCount( "Files", this.program.getSourceFiles().length );
        statisticsReporter.reportCount( "Lines", this.compiledLines() );
        statisticsReporter.reportTime( "Pre-emit time", this.preEmitTime );
        statisticsReporter.reportTime( "Emit time", this.emitTime );
    }

    private compiledLines(): number {
        var count = 0;
        Utils.forEach( this.program.getSourceFiles(), file => {
            if ( !file.isDeclarationFile ) {
                count += this.getLineStarts( file ).length;
            }
        });

        return count;
    }

    private getLineStarts( sourceFile: ts.SourceFile ): number[] {
        return sourceFile.getLineStarts();
    }
} 