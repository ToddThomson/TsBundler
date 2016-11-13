"use strict";
var BundlePackage_1 = require("./BundlePackage");
var Logger_1 = require("../Reporting/Logger");
var Utilities_1 = require("../Utils/Utilities");
var TsCore_1 = require("../Utils/TsCore");
var ts = require("typescript");
var path = require("path");
var BundleParser = (function () {
    function BundleParser() {
    }
    BundleParser.prototype.parseConfigFile = function (json, basePath) {
        var errors = [];
        return {
            bundles: getBundles(),
            errors: errors
        };
        function getBundles() {
            var bundles = [];
            var jsonBundles = json["bundles"];
            if (jsonBundles) {
                Logger_1.Logger.info(jsonBundles);
                for (var id in jsonBundles) {
                    Logger_1.Logger.info("Bundle Id: ", id, jsonBundles[id]);
                    var jsonBundle = jsonBundles[id];
                    var bundleName;
                    var fileNames = [];
                    var config = {};
                    // Name
                    bundleName = path.join(basePath, id);
                    // Files..
                    if (Utilities_1.Utils.hasProperty(jsonBundle, "files")) {
                        if (jsonBundle["files"] instanceof Array) {
                            fileNames = Utilities_1.Utils.map(jsonBundle["files"], function (s) { return path.join(basePath, s); });
                            Logger_1.Logger.info("bundle files: ", fileNames);
                        }
                        else {
                            errors.push(TsCore_1.TsCore.createDiagnostic({ code: 6063, category: ts.DiagnosticCategory.Error, key: "Bundle_0_files_is_not_an_array_6063", message: "Bundle '{0}' files is not an array." }, id));
                        }
                    }
                    else {
                        errors.push(TsCore_1.TsCore.createDiagnostic({ code: 6062, category: ts.DiagnosticCategory.Error, key: "Bundle_0_requires_an_array_of_files_6062", message: "Bundle '{0}' requires an array of files." }, id));
                    }
                    // Config..
                    if (Utilities_1.Utils.hasProperty(jsonBundle, "config")) {
                        config = jsonBundle.config;
                    }
                    config.package = parsePackageConfig(config);
                    bundles.push({ name: bundleName, fileNames: fileNames, config: config });
                }
            }
            return bundles;
        }
        function parsePackageConfig(config) {
            // TODO: Add diagnostics for input errors..
            var bundlePackageType = 0 /* None */;
            var bundlePackageNamespace = undefined;
            var packageTypeMap = {
                "none": 0 /* None */,
                "library": 1 /* Library */,
                "component": 2 /* Component */
            };
            if (Utilities_1.Utils.hasProperty(config, "package")) {
                var packageType = config["package"];
                if (typeof (packageType) === "string") {
                    if (Utilities_1.Utils.hasProperty(packageTypeMap, packageType.toLowerCase())) {
                        bundlePackageType = packageTypeMap[packageType.toLowerCase()];
                    }
                }
            }
            if (Utilities_1.Utils.hasProperty(config, "packageNamespace")) {
                var packageNamespace = config["packageNamespace"];
                if (typeof (packageNamespace) === "string") {
                    bundlePackageNamespace = packageNamespace;
                }
            }
            return new BundlePackage_1.BundlePackage(bundlePackageType, bundlePackageNamespace);
        }
    };
    return BundleParser;
}());
exports.BundleParser = BundleParser;
