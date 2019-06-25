import * as ts from "typescript"

export namespace Ast {
    
    export function getModifierFlags( node: ts.Node ): ts.ModifierFlags {
        let flags = ts.ModifierFlags.None;

        if ( node.modifiers ) {
            for ( const modifier of node.modifiers ) {
                flags |= modifierToFlag( modifier.kind );
            }
        }

        return flags;
    }

    export function getJsDocTags( symbol: ts.Symbol ): ts.JSDocTag[] {
        // Call getDocumentationComment() to generate the JsDocTags for the symbol( the node ).
        // For some reason a ts.getDocumentationTags() is not exposed.
        symbol.getDocumentationComment( undefined );

        if ( symbol.declarations ) {
            return (<any>symbol.declarations[0]).jsDocCache;
        }

        return undefined;
    }
    
    export function modifierToFlag( token: ts.SyntaxKind ): ts.ModifierFlags {
        switch ( token ) {
            case ts.SyntaxKind.StaticKeyword: return ts.ModifierFlags.Static;
            case ts.SyntaxKind.PublicKeyword: return ts.ModifierFlags.Public;
            case ts.SyntaxKind.ProtectedKeyword: return ts.ModifierFlags.Protected;
            case ts.SyntaxKind.PrivateKeyword: return ts.ModifierFlags.Private;
            case ts.SyntaxKind.AbstractKeyword: return ts.ModifierFlags.Abstract;
            case ts.SyntaxKind.ExportKeyword: return ts.ModifierFlags.Export;
            case ts.SyntaxKind.DeclareKeyword: return ts.ModifierFlags.Ambient;
            case ts.SyntaxKind.ConstKeyword: return ts.ModifierFlags.Const;
            case ts.SyntaxKind.DefaultKeyword: return ts.ModifierFlags.Default;
            case ts.SyntaxKind.AsyncKeyword: return ts.ModifierFlags.Async;
            case ts.SyntaxKind.ReadonlyKeyword: return ts.ModifierFlags.Readonly;
        }
        return ts.ModifierFlags.None;
    }

    export function isSourceCodeFile( file: ts.SourceFile ): boolean {
        return ( file.kind === ts.SyntaxKind.SourceFile && !file.isDeclarationFile );
    }

    export function isSourceCodeModule( symbol: ts.Symbol ): boolean {
        const declarations = symbol.getDeclarations();

        if ( declarations && declarations.length > 0 ) {
            const declaration = symbol.getDeclarations()[0];
            
            return ( ( declaration.kind === ts.SyntaxKind.SourceFile ) && !( (<ts.SourceFile>declaration).isDeclarationFile ) );
        }

        return false;
    }

    export function isAmbientModule( symbol: ts.Symbol ): boolean {
        const declarations = symbol.getDeclarations();
            
        if ( declarations && declarations.length > 0 ) {
            const declaration = symbol.getDeclarations()[0];

            if ( declaration.kind === ts.SyntaxKind.ModuleDeclaration ) {
                if ( declaration.modifiers ) {
                    for ( const modifier of declaration.modifiers ) {
                        if ( modifier.kind === ts.SyntaxKind.DeclareKeyword ) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    export function getSourceFileOfNode( node: ts.Node): ts.SourceFile {
        while ( node && node.kind !== ts.SyntaxKind.SourceFile) {
            node = node.parent;
        }
        return <ts.SourceFile>node;
    }

    export function getSymbolUID( symbol: ts.Symbol ): string {
        if ( !symbol ) {
            return undefined;
        }

        let id = ( <any>symbol ).id;

        // Try to get the symbol id from the value declaration
        if ( id === undefined && symbol.valueDeclaration ) {
            id = ( <any>symbol.valueDeclaration ).symbol.id;
        }

        return id ? id.toString() : undefined;
    }
}