import * as ts from "typescript";
import * as ts2js from "ts2js";

export class BuildResult {
    errors: ts.Diagnostic[];
    bundleOutput?: ts2js.CompilerResult[];

    constructor( errors: ts.Diagnostic[], bundles?: ts2js.CompilerResult[] ) {
        this.errors = errors;
        this.bundleOutput = bundles;
    }

    public succeeded(): boolean {
        return ( this.errors.length == 0 );
    }
}