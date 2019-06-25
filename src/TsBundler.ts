import * as ts from "typescript"
import { BundlerTransform } from "./Bundler/BundlerTransform"
import { BundlerOptions } from "./Bundler/BundlerOptions";

// TsBundler API
export { BundlerOptions };

export function getBundlerTransform( host: ts.CompilerHost, program: ts.Program, options: BundlerOptions ): ts.TransformerFactory<ts.SourceFile> {
    const bundlerTransform = new BundlerTransform( options );
    return ( context: ts.TransformationContext ) => bundlerTransform.transform( host, program, context );
}