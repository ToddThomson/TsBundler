import * as ts from "typescript";
export declare class DiagnosticsReporter {
    static reportDiagnostics(diagnostics: ts.Diagnostic[]): void;
    static reportDiagnostic(diagnostic: ts.Diagnostic): void;
}
