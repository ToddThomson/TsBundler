/** @bundlemodule { Bundler } */

// The above annotation creates an internal bundle module. The internal module
// is a namespace.
// The internal bundle module must always be an ambient file. Strictly not a source file.

// TJT:
// What does it mean to be an ambient generated module?
// How are they processed, included in the single bundle? What order?
// Is the bundle module contained in a namespace?

export { Bundle } from "./Bundle"
export { BundleBuilder } from "./BundleBuilder"
export { BundleBuildResult } from "./BundleBuildResult"
export { BundleConfig } from "./BundleConfig"
export { BundlePackage } from "./BundlePackage"
export { ConfigParser } from "./ConfigParser"
export { BundlerOptions } from "./BundlerOptions"
export { PackageType } from "./PackageType"