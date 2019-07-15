import * as ts from "typescript"
import { expect } from "chai"
import { TsCompiler, CompileResult, CompileStatus } from "../../../../Ts2Js/src/TsCompiler"
import { TsBundler } from "../../../src/TsBundler"
import { DiagnosticsReporter } from "../../../../TsToolsCommon/src/Reporting/DiagnosticsReporter"

describe( "Bundle Module", () => {

    function completesSuccessfully( name: string, fileName: string, options: ts.CompilerOptions ) {
        describe( name, () => {
            let options = ts.getDefaultCompilerOptions();
            let bundlerTransform = TsBundler.getBundlerTransform;

            let compileResult = TsCompiler.compile(
                [fileName],
                options,
                (program) => ( { before: [bundlerTransform(program)] } ) );

            it( "completes with status is successful", () => {
                expect( compileResult.getStatus() ).to.equal( CompileStatus.Success );
                expect( compileResult.getErrors() ).to.have.length( 0 );
            } );

            afterEach( function () {
                if ( this.currentTest.state === 'failed' ) {
                    DiagnosticsReporter.reportDiagnostics(
                        compileResult.getErrors() );
                }
            } );
        } );
    }

    function completesWithErrors( name: string, fileName: string, options: ts.CompilerOptions ) {
        describe( name, () => {
            let options = ts.getDefaultCompilerOptions();
            let bundlerTransform = TsBundler.getBundlerTransform;

            let compileResult = TsCompiler.compile(
                [fileName],
                options,
                (program) => ({ before: [bundlerTransform(program)] } ) );

            it( "completes with diagnostics", () => {
                expect( compileResult.getStatus() ).to.not.equal( CompileStatus.Success );
                expect( compileResult.getErrors() ).to.have.length.greaterThan( 0 );
            } );

            afterEach( function () {
                if ( this.currentTest.state === 'failed' ) {
                    DiagnosticsReporter.reportDiagnostics(
                        compileResult.getErrors() );
                }
            } );
        } );
    }

    completesSuccessfully(
        "bundle transform with valid source",
        "./tests/projects/simple/main.ts",
        { module: ts.ModuleKind.CommonJS }
    );
} );
