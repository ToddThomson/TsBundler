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
    entryFileNames: string[];
    config: BundleConfig;
}
interface BundlerOptions {
    logLevel?: number;
    verbose?: boolean;
    outputToDisk?: boolean;
}
interface BundleFile {
    path: string;
    extension: string;
    text: string;
}
declare class BundleBuildResult {
    private errors;
    private bundleSource?;
    constructor(errors: ts.Diagnostic[], bundleSource?: BundleFile);
    getBundleSource(): BundleFile;
    getErrors(): ts.Diagnostic[];
    succeeded(): boolean;
}
declare class BundleBuilder {
    private bundle;
    private bundleConfig;
    private options;
    private program;
    private typeChecker;
    private context;
    private entrySourceFile;
    private moduleNamespaces;
    constructor(program: ts.Program, options?: BundlerOptions);
    transform(entrySourceFile: ts.SourceFile, context: ts.TransformationContext): ts.SourceFile;
    build(bundle: Bundle): BundleBuildResult;
    buildBundle(entrySourceFile: ts.SourceFile): ts.SourceFile;
    private generateBundleSourceFile(moduleContainer);
    private convertModuleToNamespace(module, containerName);
    private convertAnyImportOrExport(module, containerName);
    private replaceImportWithVar(node, containerName);
    private replaceImportEqualsWithVar(node, containerName);
    private createContainerModulePropertyAccess(containerName, moduleName);
    private createVariableStatement(name, expression);
    private createRequireCall(moduleName);
    private createNamespaceForModule(moduleName, sourceFile);
    private createNamespaceForModuleContainer(moduleName, moduleBlock);
    private generateModuleName(declaration);
    private getImportProperties(importDeclaration);
}
interface BundleConfigResult {
    bundles: Bundle[];
    errors: ts.Diagnostic[];
}
declare class BundleConfigParser {
    parseConfigFile(json: any, basePath: string): BundleConfigResult;
}
export { PackageType };
export { BundlePackage };
export { BundleConfig };
export { Bundle };
export { BundlerOptions };
export { BundleConfigResult };
export { BundleConfigParser };
export { BundleFile };
export { BundleBuildResult };
export { BundleBuilder };
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
    function buildBundle(bundle: Bundle, program: ts.Program, options?: BundlerOptions): BundleBuildResult;
}
