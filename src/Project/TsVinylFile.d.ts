/// <reference types="vinyl" />
import * as ts from "typescript";
import File = require("vinyl");
export declare class TsVinylFile extends File {
    constructor(options: any);
    sourceFile: ts.SourceFile;
}
