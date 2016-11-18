import * as ts from "typescript";
import { BuildResult } from "./ProjectBuildResult";

export interface IProject {
    build( onDone: ( result: BuildResult ) => void ): void;
}
