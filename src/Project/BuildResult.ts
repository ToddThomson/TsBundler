import * as ts from "typescript";
import * as ts2js from "ts2js";
import * as Bundler from "../Bundler/BundlerModule";

export interface BuildResult {
    errors: ts.Diagnostic[];
    bundleBuilderResults?: Bundler.BundleBuildResult[];
    bundleCompilerResults?: ts2js.CompilerResult[];
    succeeded(): boolean;
};

export class ProjectBuildResult implements BuildResult {
    errors: ts.Diagnostic[];
    bundleBuilderResults?: Bundler.BundleBuildResult[];    
    bundleCompilerResults?: ts2js.CompilerResult[];

    constructor( errors: ts.Diagnostic[], bundleBuilderResults?: Bundler.BundleBuildResult[], bundles?: ts2js.CompilerResult[] ) {
        this.errors = errors;
        this.bundleBuilderResults = bundleBuilderResults;
        this.bundleCompilerResults = bundles;
    }

    public succeeded(): boolean {
        return ( this.errors.length == 0 );
    }
}