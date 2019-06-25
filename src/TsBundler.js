"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BundlerTransform_1 = require("./Bundler/BundlerTransform");
function getBundlerTransform(host, program, options) {
    var bundlerTransform = new BundlerTransform_1.BundlerTransform(options);
    return function (context) { return bundlerTransform.transform(host, program, context); };
}
exports.getBundlerTransform = getBundlerTransform;
//# sourceMappingURL=TsBundler.js.map