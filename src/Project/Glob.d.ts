export declare class Glob {
    hasPattern(pattern: string): boolean;
    expand(patterns: string[], root: string): string[];
    private processPatterns(patterns, fn);
}
