import * as ts from "typescript";

import { Bundle } from "../Bundler/BundleParser";
import { BundlerOptions } from "../Bundler/BundlerOptions";

export interface ProjectConfig {
    success: boolean;
    configFile?: string;
    bundlerOptions?: BundlerOptions;
    compilerOptions?: ts.CompilerOptions;
    fileNames?: string[];
    bundles?: Bundle[];
    errors?: ts.Diagnostic[];
}
