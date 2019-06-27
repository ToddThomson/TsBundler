"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BundlerTransform_1 = require("Bundler/BundlerTransform");
var ConfigParser_1 = require("Bundler/ConfigParser");
exports.ConfigParser = ConfigParser_1.ConfigParser;
var PackageType_1 = require("Bundler/PackageType");
exports.PackageType = PackageType_1.PackageType;
var BundlePackage_1 = require("Bundler/BundlePackage");
exports.BundlePackage = BundlePackage_1.BundlePackage;
function getBundlerTransform(host, program, options) {
    var bundlerTransform = new BundlerTransform_1.BundlerTransform(options);
    return function (context) { return bundlerTransform.transform(host, program, context); };
}
exports.getBundlerTransform = getBundlerTransform;
//# sourceMappingURL=TsBundler.js.map