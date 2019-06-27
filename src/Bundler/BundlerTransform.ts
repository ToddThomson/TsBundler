import * as ts from "typescript";
import { BundleBuilder } from "../Bundler/BundleBuilder";
import { BundlerOptions } from "../Bundler/BundlerOptions";

export class BundlerTransform{
    private bundlerOptions: BundlerOptions;
    private compilerOptions: ts.CompilerOptions;
    private program: ts.Program;
    private host: ts.CompilerHost;
    private bundler: BundleBuilder;

    constructor( options: BundlerOptions ) {
        this.bundlerOptions = options;
    }

    public transform( host: ts.CompilerHost, program: ts.Program, context: ts.TransformationContext ) {
        this.compilerOptions = context.getCompilerOptions();
        this.program = program;
        this.host = host;

        this.bundler = new BundleBuilder( this.host, this.program, this.bundlerOptions );

        function transformImpl( sourceFile: ts.SourceFile ) {
            // TODO: Transform sourceFile...
            return sourceFile;
        }

        return transformImpl;
    }
}