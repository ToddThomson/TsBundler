import * as ts from "typescript";
import { BundlerOptions } from "./Bundler/BundlerOptions";
export { BundlerOptions };
export declare function getBundlerTransform(host: ts.CompilerHost, program: ts.Program, options: BundlerOptions): ts.TransformerFactory<ts.SourceFile>;
