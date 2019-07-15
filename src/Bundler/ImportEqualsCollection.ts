import * as ts from "typescript"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"

/**
 * Import equals declaration collection by module specifier.
 */
export class ImportEqualsCollection
{
    // One of:
    // import x = require( "mod" );
    // import x = M.x;

    private imports: ts.MapLike<ts.ImportEqualsDeclaration[]> = {};

    public add( importDeclaration: ts.ImportEqualsDeclaration )
    {
        let moduleReferenceName: ts.DeclarationName = ts.getNameOfDeclaration( importDeclaration );

        if ( !Utils.hasProperty( this.imports, moduleReferenceName.getText() ) )
        {
            this.imports[moduleReferenceName.getText()] = [importDeclaration];
        }
        else
        {
            this.imports[moduleReferenceName.getText()].push( importDeclaration );
        }
    }

    public getModuleReferenceImports( moduleReference: string ): ts.ImportEqualsDeclaration[]
    {
        return this.imports[moduleReference];
    }

    public getModuleReferences(): string[]
    {
        let keys: string[] = [];

        for ( var key in this.imports )
        {
            keys.push( key );
        }

        return keys;
    }
}