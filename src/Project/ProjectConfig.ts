import * as ts from "typescript";
import * as Bundler from "../Bundler/BundlerModule";

export interface ProjectConfig {
    success: boolean;
    configFile?: string;
    bundlerOptions?: Bundler.BundlerOptions;
    compilerOptions?: ts.CompilerOptions;
    fileNames?: string[];
    bundles?: Bundler.Bundle[];
    errors?: ts.Diagnostic[];
}
