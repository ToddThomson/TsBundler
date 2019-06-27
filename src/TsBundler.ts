import * as ts from "typescript"
import { BundlerTransform } from "Bundler/BundlerTransform"
import { BundlerOptions } from "Bundler/BundlerOptions"
import { ConfigParser, ConfigResult } from "Bundler/ConfigParser"
import { PackageType } from "Bundler/PackageType"
import { BundlePackage } from "Bundler/BundlePackage"
import { BundleConfig } from "Bundler/BundleConfig"
import { Bundle } from "Bundler/Bundle";

// TsBundler API..
export { PackageType }
export { BundlePackage }
export { BundleConfig }
export { Bundle };
export { BundlerOptions }
export { ConfigResult }
export { ConfigParser };

export function getBundlerTransform( host: ts.CompilerHost, program: ts.Program, options: BundlerOptions ): ts.TransformerFactory<ts.SourceFile> {
    const bundlerTransform = new BundlerTransform( options );
    return ( context: ts.TransformationContext ) => bundlerTransform.transform( host, program, context );
}