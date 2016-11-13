export declare var level: {
    none: number;
    error: number;
    warn: number;
    trace: number;
    info: number;
};
export declare class Logger {
    private static logLevel;
    private static logName;
    static setLevel(level: number): void;
    static setName(name: string): void;
    static log(...args: any[]): void;
    static info(...args: any[]): void;
    static warn(...args: any[]): void;
    static error(...args: any[]): void;
    static trace(...args: any[]): void;
}
