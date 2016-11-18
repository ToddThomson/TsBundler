import * as ts from "typescript";


export interface BundleFile {
    path: string,
    extension: string,
    text: string
}

export class BundleResult {

    private errors: ts.Diagnostic[];
    private bundleSource?: BundleFile;

    constructor( errors: ts.Diagnostic[], bundleSource?: BundleFile ) {
        this.errors = errors;
        this.bundleSource = bundleSource;
    }
    
    public getBundleSource(): BundleFile {
        return this.bundleSource;
    }

    public getErrors(): ts.Diagnostic[] {
        return this.errors;
    }
    
    public succeeded(): boolean {
        return ( this.errors.length == 0 );
    }
}