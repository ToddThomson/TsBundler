import * as ts from "typescript";
import * as stream from "stream";
import { BuildResult } from "./BuildResult";

export interface BundleBuilder {
    build( buildCompleted: ( result: BuildResult ) => void ): void;
    src(): stream.Readable;    
}
