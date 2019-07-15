import * as ts from "typescript";
declare enum PackageType {
    /** Default. No special processing. */
    None = 0,
    /** Wraps the bundle in an exported namespace with the bundle name.  */
    Library = 1,
    /** For removing module export modifier. */
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
interface BundleConfigResult {
    bundles: Bundle[];
    errors: ts.Diagnostic[];
}
declare class BundleConfigParser {
    parseConfigFile(json: any, basePath: string): BundleConfigResult;
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
export { BundleConfigResult };
export { BundleConfigParser };
export declare namespace TsBundler {
    /**
     * Gets the TsBundler transformation callback function used to bundle a source
     * file node's dependencies into a single file source module.
     *
     * @param program Optional
     * @param options Optional bundler options.
     * @returns The bundler transform factory callback function.
     */
    function getBundlerTransform(program: ts.Program, options?: BundlerOptions): ts.TransformerFactory<ts.SourceFile>;
}
