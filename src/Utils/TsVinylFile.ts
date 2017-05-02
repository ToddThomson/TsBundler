import * as ts from "typescript"
import File = require( "vinyl" )

export class VinylFile extends File {

    constructor( options: any ) {
        super( options );
    }

    public sourceFile: ts.SourceFile;
} 