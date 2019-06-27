import * as ts from "typescript";
declare enum PackageType {
    None = 0,
    Library = 1,
    Component = 2,
}
declare class BundlePackage {
    private packageType;
    private packageNamespace;
    constructor(packageType: PackageType, packageNamespace: string);
    getPackageType(): PackageType;
    getPackageNamespace(): string;
}
interface BundleConfig {
    sourceMap?: boolean;
    declaration?: boolean;
    outDir?: string;
    minify?: boolean;
    package?: BundlePackage;
}
interface Bundle {
    name: string;
    fileNames: string[];
    config: BundleConfig;
}
interface ConfigResult {
    bundles: Bundle[];
    errors: ts.Diagnostic[];
}
declare class ConfigParser {
    parseConfigFile(json: any, basePath: string): ConfigResult;
}
interface BundlerOptions {
    logLevel?: number;
    verbose?: boolean;
    outputToDisk?: boolean;
}
export { PackageType };
export { BundlePackage };
export { BundleConfig };
export { Bundle };
export { BundlerOptions };
export { ConfigResult };
export { ConfigParser };
