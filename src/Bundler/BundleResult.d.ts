import * as ts from "typescript";
export interface BundleFile {
    path: string;
    extension: string;
    text: string;
}
export declare class BundleResult {
    private status;
    private errors;
    private bundleSource;
    constructor(status: ts.ExitStatus, errors?: ts.Diagnostic[], bundleSource?: BundleFile);
    getBundleSource(): BundleFile;
    getErrors(): ts.Diagnostic[];
    getStatus(): ts.ExitStatus;
    succeeded(): boolean;
}
