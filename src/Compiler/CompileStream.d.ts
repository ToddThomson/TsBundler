/// <reference types="node" />
import * as stream from "stream";
export declare class CompileStream extends stream.Readable {
    constructor(opts?: stream.ReadableOptions);
    _read(): void;
}
