"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BundlePackage = /** @class */ (function () {
    function BundlePackage(packageType, packageNamespace) {
        this.packageNamespace = undefined;
        this.packageType = packageType;
        this.packageNamespace = packageNamespace;
    }
    BundlePackage.prototype.getPackageType = function () {
        return this.packageType;
    };
    BundlePackage.prototype.getPackageNamespace = function () {
        return this.packageNamespace;
    };
    return BundlePackage;
}());
exports.BundlePackage = BundlePackage;
//# sourceMappingURL=BundlePackage.js.map