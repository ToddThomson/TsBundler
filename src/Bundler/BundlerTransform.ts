import * as ts from "typescript";
import { BundleBuilder } from "../Bundler/BundleBuilder";
import { BundlerOptions } from "../Bundler/BundlerOptions";

export class BundlerTransform
{
    private bundlerOptions: BundlerOptions;
    private compilerOptions: ts.CompilerOptions;
    private program: ts.Program;
    private context: ts.TransformationContext;
    private bundler: BundleBuilder;

    constructor( options?: BundlerOptions )
    {
        this.bundlerOptions = options || {};
    }

    public transform( program: ts.Program, context: ts.TransformationContext )
    {
        this.compilerOptions = context.getCompilerOptions();
        this.program = program;
        this.context = context;

        return this.transformSourceFile;
    }

    private transformSourceFile = ( sourceFile: ts.SourceFile ) =>
    {
        this.bundler = new BundleBuilder( this.program, this.bundlerOptions );

        return this.bundler.transform( sourceFile, this.context );
    }
}