interface CoverageMetric {
    Executed: number;
    Total: number;
    Percentage: number;
}
export interface CoverageData {
    MetricLevel?: string;
    FunctionCoverage?: CoverageMetric;
    StatementCoverage?: CoverageMetric;
    DecisionCoverage?: CoverageMetric;
    ConditionCoverage?: CoverageMetric;
    MCDCCoverage?: CoverageMetric;
}
export declare function getCoverageResults(runnerTemp: string, runId: string): CoverageData | null;
export declare function getCoverageTable(coverage: CoverageData): string;
export {};
