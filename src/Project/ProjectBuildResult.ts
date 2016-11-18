import * as ts from "typescript";

import { CompilerResult } from "../Compiler/CompilerResult";
import { BundleResult } from "../Bundler/BundleResult";

export class BuildResult {
    errors: ts.Diagnostic[];
    bundles?: CompilerResult[];

    constructor( errors: ts.Diagnostic[], bundles?: CompilerResult[] ) {
        this.errors = errors;
        this.bundles = bundles;
    }

    public succeeded(): boolean {
        return ( this.errors.length == 0 );
    }
}