"use strict";
(function (BundlePackageType) {
    BundlePackageType[BundlePackageType["None"] = 0] = "None";
    BundlePackageType[BundlePackageType["Library"] = 1] = "Library";
    BundlePackageType[BundlePackageType["Component"] = 2] = "Component";
})(exports.BundlePackageType || (exports.BundlePackageType = {}));
var BundlePackageType = exports.BundlePackageType;
var BundlePackage = (function () {
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
