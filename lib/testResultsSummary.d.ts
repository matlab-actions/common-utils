export declare enum MatlabTestStatus {
    PASSED = "PASSED",
    FAILED = "FAILED",
    INCOMPLETE = "INCOMPLETE",
    NOT_RUN = "NOT_RUN"
}
interface MatlabTestDiagnostics {
    Event: string;
    Report: string;
}
interface MatlabTestCase {
    Name: string;
    Duration: number;
    Status: MatlabTestStatus;
    Diagnostics: MatlabTestDiagnostics[];
}
export interface MatlabTestFile {
    Name: string;
    Path: string;
    TestCases: MatlabTestCase[];
    Duration: number;
    Status: MatlabTestCase["Status"];
}
export interface TestStatistics {
    Total: number;
    Passed: number;
    Failed: number;
    Incomplete: number;
    NotRun: number;
    Duration: number;
}
export interface TestResultsData {
    TestResults: MatlabTestFile[][];
    Stats: TestStatistics;
}
export declare function processAndAddTestSummary(runnerTemp: string, runId: string, actionName: string, workspace: string): void;
export declare function getTestResults(runnerTemp: string, runId: string, workspace: string): TestResultsData | null;
export declare function addSummary(testResultsData: TestResultsData, actionName: string): void;
export declare function getTestHeader(stats: TestStatistics): string;
export declare function getDetailedResults(testResults: MatlabTestFile[][]): string;
export declare function getStatusEmoji(status: MatlabTestStatus): string;
export {};
