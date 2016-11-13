import ts = require("typescript");
export declare namespace Utils {
    function forEach<T, U>(array: T[], callback: (element: T, index: number) => U): U;
    function contains<T>(array: T[], value: T): boolean;
    function hasProperty<T>(map: ts.MapLike<T>, key: string): boolean;
    function clone<T>(object: T): T;
    function map<T, U>(array: T[], f: (x: T) => U): U[];
    function extend<T1, T2>(first: ts.MapLike<T1>, second: ts.MapLike<T2>): ts.MapLike<T1 & T2>;
    function replaceAt(str: any, index: any, character: any): any;
}
