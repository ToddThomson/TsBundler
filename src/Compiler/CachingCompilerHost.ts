import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as chokidar from "chokidar";

import { TsCompilerOptions } from "./TsCompilerOptions";
import { Logger } from "../Reporting/Logger";
import { TsCore } from "../Utils/TsCore";
import { Utils } from "../Utils/Utilities";

/**
 * @description A typescript compiler host that supports incremental builds and optimizations for file reads and file exists functions. Emit output is saved to memory.
 */
export class CachingCompilerHost implements ts.CompilerHost {

    private output: ts.MapLike<string> = {};

    private dirExistsCache: ts.MapLike<boolean> = {};
    private dirExistsCacheSize: number = 0;
    private fileExistsCache: ts.MapLike<boolean> = {};
    private fileExistsCacheSize: number = 0;
    private fileReadCache: ts.MapLike<string> = {};

    protected compilerOptions: TsCompilerOptions;
    private baseHost: ts.CompilerHost;

    constructor( compilerOptions: TsCompilerOptions ) {
        this.compilerOptions = compilerOptions;
        this.baseHost = ts.createCompilerHost( this.compilerOptions );
    }

    public getOutput() {
        return this.output;
    }

    public getSourceFileImpl( fileName: string, languageVersion: ts.ScriptTarget, onError?: ( message: string ) => void ): ts.SourceFile {
        // Use baseHost to get the source file
        return this.baseHost.getSourceFile( fileName, languageVersion, onError );
    }

    public getSourceFile = this.getSourceFileImpl;

    public writeFile( fileName: string, data: string, writeByteOrderMark: boolean, onError?: ( message: string ) => void ) {
        if ( this.compilerOptions.compileToMemory ) {
            this.output[ fileName ] = data;
        }
        else {
            this.baseHost.writeFile( fileName, data, writeByteOrderMark, onError );
        }
    }

    public fileExists = ( fileName: string ): boolean => {
        const fullFileName = this.getCanonicalFileName( fileName );

        // Prune off searches on directories that don't exist
        if ( !this.directoryExists( path.dirname( fullFileName ) ) ) {
            return false;
        }

        if ( Utils.hasProperty( this.fileExistsCache, fullFileName ) ) {
            return this.fileExistsCache[ fullFileName ];
        }
        this.fileExistsCacheSize++;

        return this.fileExistsCache[ fullFileName ] = this.baseHost.fileExists( fullFileName );
    }

    public readFile( fileName: string ): string {
        if ( Utils.hasProperty( this.fileReadCache, fileName ) ) {
            return this.fileReadCache[ fileName ];
        }

        return this.fileReadCache[ fileName ] = this.baseHost.readFile( fileName );
    }

    // Use Typescript CompilerHost "base class" implementation..

    public getDefaultLibFileName( options: ts.CompilerOptions ) {
        return this.baseHost.getDefaultLibFileName( options );
    }

    public getCurrentDirectory() {
        return this.baseHost.getCurrentDirectory();
    }

    public getDirectories( path: string ): string[] {
        return this.baseHost.getDirectories( path );
    } 

    public getCanonicalFileName( fileName: string ) {
        return this.baseHost.getCanonicalFileName( fileName );
    }

    public useCaseSensitiveFileNames() {
        return this.baseHost.useCaseSensitiveFileNames();
    }

    public getNewLine() {
        return this.baseHost.getNewLine();
    }

    public directoryExists( directoryPath: string ): boolean {
        if ( Utils.hasProperty( this.dirExistsCache, directoryPath ) ) {
            return this.dirExistsCache[ directoryPath ];
        }
        
        this.dirExistsCacheSize++;

        return this.dirExistsCache[ directoryPath ] = ts.sys.directoryExists( directoryPath );
    }
}