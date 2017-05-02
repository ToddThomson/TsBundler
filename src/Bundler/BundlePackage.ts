import { PackageType } from "./PackageType";

export class BundlePackage {
    private packageType: PackageType;
    private packageNamespace: string = undefined;
    
    constructor( packageType: PackageType, packageNamespace: string ) {
        this.packageType = packageType;
        this.packageNamespace = packageNamespace;
    }

    public getPackageType(): PackageType {
        return this.packageType;
    }

    public getPackageNamespace(): string {
        return this.packageNamespace;
    }
}
