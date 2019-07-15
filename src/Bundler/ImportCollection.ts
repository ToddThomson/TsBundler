import * as ts from "typescript"
import { Utils } from "../../../TsToolsCommon/src/Utils/Utilities"
import { Ast } from "../../../TsToolsCommon/src/Typescript/AstHelpers"

/**
 * Import declaration collection by module specifier.
 */
export class ImportCollection
{
    // For an ImportDeclaration ImportClause:
    //
    // import d from "mod" => name = d, namedBinding = undefined
    //
    // import * as ns from "mod" => name = undefined, namedBinding: NamespaceImport = { name: ns }
    // import d, * as ns from "mod" => name = d, namedBinding: NamespaceImport = { name: ns }
    //
    // import { a, b as x } from "mod" => name = undefined, namedBinding: NamedImports = { elements: [{ name: a }, { name: x, propertyName: b}]}
    // import d, { a, b as x } from "mod" => name = d, namedBinding: NamedImports = { elements: [{ name: a }, { name: x, propertyName: b}]}
    //
    // Note: NamedImportBindings = NamespaceImport | NamedImports;

    private imports: ts.MapLike<ts.ImportDeclaration[]> = {};

    public add( importDeclaration: ts.ImportDeclaration )
    {
        // The moduleSpecifier for an ImportDeclaration is always a StringLiteral
        let moduleSpecifier = ( <ts.LiteralExpression>importDeclaration.moduleSpecifier ).text;

        if ( !Utils.hasProperty( this.imports, moduleSpecifier ) )
        {
            this.imports[moduleSpecifier] = [importDeclaration];
        }
        else
        {
            // TJT: Avoid duplicates?
            this.imports[moduleSpecifier].push( importDeclaration );
        }
    }

    public getModuleSpecifierImportProperties( moduleSpecifier: string )
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

        const indexOfSpecifier = ( specifiers: ts.ImportSpecifier[], specifier: ts.ImportSpecifier ) =>
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
        const namedElements: ts.ImportSpecifier[] = [];

        for ( const importDeclaration of this.imports[ moduleSpecifier] )
        {
            const { name, namedBindings } = importDeclaration.importClause;
            
            if ( name )
            {
                if ( indexOfIdentifier( defaultNames, name ) < 0 )
                {
                    defaultNames.push( name );
                }
            }

            if ( namedBindings )
            {
                if ( Ast.isNamespaceImport( namedBindings ) )
                {
                    let namespaceName = ( namedBindings as ts.NamespaceImport ).name;

                    if ( indexOfIdentifier( namespaces, namespaceName ) < 0 )
                    {
                        namespaces.push( namespaceName );
                    }
                }
                else
                {
                    let elements = ( namedBindings as ts.NamedImports ).elements;

                    for ( const element of elements )
                    {
                        if ( indexOfSpecifier( namedElements, element ) < 0 )
                        {
                            namedElements.push( element );
                        }
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

        for ( var key in this.imports )
        {
            keys.push( key );
        }

        return keys;
    }
}