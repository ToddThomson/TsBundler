import * as ts from "typescript"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"

/**
 * Export declaration collection by module specifier.
 */
export class ExportCollection
{
    // For an ExportDeclaration: ExportClause
    //
    // export * from "mod" => ExportClause: undefined
    // export { a, b as x } => ModuleSpecifier: undefined, NamedExports = { elements: [{ name: a }, { name: x, propertyName: b}]}
    // export { a, b as x } from "mod" =>  NamedExports = { elements: [{ name: a }, { name: x, propertyName: b}]}

    private exports: ts.MapLike<ts.ExportDeclaration[]> = {};

    public add( exportDeclaration: ts.ExportDeclaration )
    {
        // The moduleSpecifier for an ImportDeclaration is always a StringLiteral
        let moduleSpecifier = ( <ts.LiteralExpression>exportDeclaration.moduleSpecifier ).text;

        if ( !Utils.hasProperty( this.exports, moduleSpecifier ) )
        {
            this.exports[moduleSpecifier] = [exportDeclaration];
        }
        else
        {
            // TJT: Avoid duplicates?
            this.exports[moduleSpecifier].push( exportDeclaration );
        }
    }

    public getModuleSpecifierExportProperties( moduleSpecifier: string )
    {
        const indexOfIdentifier = ( identifiers: ts.Identifier[], identifier: ts.Identifier ) =>
        {
            for ( var i = 0; i < identifiers.length; i++ )
            {
                if ( identifiers[i].escapedText === identifier.escapedText )
                {
                    return i;
                }
            }
            return -1;
        }

        const indexOfSpecifier = ( specifiers: ts.ExportSpecifier[], specifier: ts.ExportSpecifier ) =>
        {
            for ( var i = 0; i < specifiers.length; i++ )
            {
                if ( specifiers[i].name.escapedText === specifier.name.escapedText )
                {
                    if ( !specifiers[i].propertyName && !specifier.propertyName )
                    {
                        return i;
                    }

                    if ( specifier.propertyName )
                    {
                        if ( ( specifiers[i].propertyName ) &&
                            ( specifiers[i].propertyName.escapedText === specifier.name.escapedText ) )
                        {
                            return i;
                        }
                    }
                }
            }
            return -1;
        }

        const defaultNames: ts.Identifier[] = [];
        const namespaces: ts.Identifier[] = [];
        const namedElements: ts.ExportSpecifier[] = [];

        for ( const exportDeclaration of this.exports[ moduleSpecifier] )
        {
            const { elements } = exportDeclaration.exportClause;
            
            if ( elements )
            {
                for ( const element of elements )
                {
                    if ( indexOfSpecifier( namedElements, element ) < 0 )
                    {
                        namedElements.push( element );
                    }
                }
            }
        }

        return {
            defaultNames,
            namespaces,
            namedElements,
        };
    }

    public getModuleSpecifiers(): string[]
    {
        let keys: string[] = [];

        for ( var key in this.exports )
        {
            keys.push( key );
        }

        return keys;
    }
}