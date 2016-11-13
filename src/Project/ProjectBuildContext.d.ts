import * as ts from "typescript";
import { ProjectConfig } from "../Project/ProjectConfig";
import { WatchCompilerHost } from "../Compiler/WatchCompilerHost";
export declare class ProjectBuildContext {
    host: WatchCompilerHost;
    private program;
    config: ProjectConfig;
    private files;
    constructor(host: WatchCompilerHost, config: ProjectConfig, program?: ts.Program);
    isWatchMode(): void;
    getProgram(): ts.Program;
    setProgram(program: ts.Program): void;
}
