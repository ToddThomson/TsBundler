import * as ts from "typescript";
import * as ts2js from "ts2js";
import * as stream from "stream";

declare namespace TsBundler {
    
    export interface BundlerOptions {
        verbose?: boolean;
        logLevel?: number;
    }
    
    export interface BuildResult {
        errors: ts.Diagnostic[];
        bundleOutput?: ts2js.CompilerResult[];
        succeeded(): boolean;
    }

    export interface BundleBuilder {
        build( buildCompleted: (result: BuildResult) => void): void;
        src(): stream.Readable;
    }
    
    export function builder(configFilePath: string, bundlerOptions?: BundlerOptions, buildCompleted?: (result: BuildResult) => void): BundleBuilder;
}

export = TsBundler;