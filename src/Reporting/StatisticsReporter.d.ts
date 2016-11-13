export declare class StatisticsReporter {
    reportTitle(name: string): void;
    reportValue(name: string, value: string): void;
    reportCount(name: string, count: number): void;
    reportTime(name: string, time: number): void;
    reportPercentage(name: string, percentage: number): void;
    private padLeft(s, length);
    private padRight(s, length);
}
