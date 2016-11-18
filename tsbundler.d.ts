import * as ts from "typescript";

declare namespace TsBundler {

    interface CompilerResult {
        getErrors(): ts.Diagnostic[];
        getEmitSkipped(): boolean;
        getEmittedOutput(): ts.MapLike<string>;
        getEmittedFiles(): string[];
        succeeded(): boolean;
    }
    
    interface BuildResult {
        errors: ts.Diagnostic[];
        bundles?: CompilerResult[];
        succeeded(): boolean;
    }

    interface OnBuildCompleteCallback {
        (status: BuildResult): void;
    }

    interface BundleBuilder {
        build( onDone: (result: BuildResult) => void): void;
    }
    
    function builder(configFilePath: string, settings?: any, onDone?: (result: BuildResult) => void): BundleBuilder;
}

export default TsBundler;