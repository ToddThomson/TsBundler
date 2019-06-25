import * as ts from "typescript";
import { BundleBuilder } from "../Bundler/BundleBuilder";
import { BundlerOptions } from "../Bundler/BundlerOptions";

function bundleBuilderTransform( host: ts.CompilerHost, program: ts.Program, context: ts.TransformationContext ): ts.Transformer<ts.SourceFile> {
    return transform;

    /**
     * Bundle the provided SourceFile.
     *
     * @param node A SourceFile node.
     */
    function transform( node: ts.SourceFile ) : ts.SourceFile {
        return node;
    }
}

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
            return sourceFile;
        }

        return transformImpl;
    }
}