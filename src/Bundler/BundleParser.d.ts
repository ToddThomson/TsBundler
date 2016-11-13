import { BundlePackage } from "./BundlePackage";
import * as ts from "typescript";
export interface BundleConfig {
    sourceMap?: boolean;
    declaration?: boolean;
    outDir?: string;
    minify?: boolean;
    package?: BundlePackage;
}
export interface Bundle {
    name: string;
    fileNames: string[];
    config: BundleConfig;
}
export interface ParsedBundlesResult {
    bundles: Bundle[];
    errors: ts.Diagnostic[];
}
export declare class BundleParser {
    parseConfigFile(json: any, basePath: string): ParsedBundlesResult;
}
