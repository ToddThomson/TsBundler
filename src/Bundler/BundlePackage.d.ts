export declare const enum BundlePackageType {
    None = 0,
    Library = 1,
    Component = 2,
}
export declare class BundlePackage {
    private packageType;
    private packageNamespace;
    constructor(packageType: BundlePackageType, packageNamespace: string);
    getPackageType(): BundlePackageType;
    getPackageNamespace(): string;
}
