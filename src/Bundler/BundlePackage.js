"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BundlePackage {
    constructor(packageType, packageNamespace) {
        this.packageNamespace = undefined;
        this.packageType = packageType;
        this.packageNamespace = packageNamespace;
    }
    getPackageType() {
        return this.packageType;
    }
    getPackageNamespace() {
        return this.packageNamespace;
    }
}
exports.BundlePackage = BundlePackage;
//# sourceMappingURL=BundlePackage.js.map