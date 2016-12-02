import * as ts from "typescript";
import * as ts2js from "ts2js";
import * as stream from "stream";

declare namespace TsBundler {
    
    interface BundlerOptions {
        verbose?: boolean;
        logLevel?: number;
        outDir?: string;
    }
    
    interface BuildResult {
        errors: ts.Diagnostic[];
        bundleOutput?: ts2js.CompilerResult[];
        succeeded(): boolean;
    }

    interface BundleBuilder {
        build( buildCompleted: (result: BuildResult) => void): void;
        src(): stream.Readable;
    }
    
    function builder(configFilePath: string, bundlerOptions?: BundlerOptions, buildCompleted?: (result: BuildResult) => void): BundleBuilder;
}

export = TsBundler;