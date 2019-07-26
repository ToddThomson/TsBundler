import * as ts from "typescript"
import { BundlerTransform } from "./Bundler/BundlerTransform"
import { BundlerOptions } from "./Bundler/BundlerOptions"
import { BundleConfigParser, BundleConfigResult } from "./Bundler/BundlerConfigParser"
import { PackageType } from "./Bundler/PackageType"
import { BundlePackage } from "./Bundler/BundlePackage"
import { BundleConfig } from "./Bundler/BundleConfig"
import { Bundle } from "./Bundler/Bundle"
import { BundleFile, BundleBuildResult } from "./Bundler/BundleBuildResult"
import { BundleBuilder } from "./Bundler/BundleBuilder"

// TsBundler Exported Types..
export { PackageType }
export { BundlePackage }
export { BundleConfig }
export { Bundle };
export { BundlerOptions }
export { BundleConfigResult }
export { BundleConfigParser }
export { BundleFile }
export { BundleBuildResult }
export { BundleBuilder }

export namespace TsBundler
{
    /**
     * Gets the TsBundler transformation callback function used to bundle a source
     * file node's dependencies into a single file source module.
     * 
     * @param program Optional 
     * @param options Optional bundler options.
     * @returns The bundler transform factory callback function.
     */
    export function getBundlerTransform( program: ts.Program, options?: BundlerOptions ): ts.TransformerFactory<ts.SourceFile>
    {
        const bundlerTransform = new BundlerTransform( options );
        return ( context: ts.TransformationContext ) => bundlerTransform.transform( program, context );
    }

    export function buildBundle( bundle: Bundle, program: ts.Program, options?: BundlerOptions ): BundleBuildResult
    {
        const bundler = new BundleBuilder( program, options );

        return bundler.build( bundle );
    }
}