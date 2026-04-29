// Copyright 2025-2026 The MathWorks, Inc.

import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import * as path from "path";
import * as os from "os";
import * as nodeFs from "fs";
import { JSDOM } from "jsdom";
import type {
    TestResultsData,
    MatlabTestFile,
    TestStatistics,
    TestSession,
} from "./testResultsSummary.js";
import { MatlabTestStatus } from "./testResultsSummary.js";

// Create mock functions
const mockAddHeading = jest.fn().mockReturnThis();
const mockAddRaw = jest.fn().mockReturnThis();

// Mock @actions/core
jest.unstable_mockModule("@actions/core", () => ({
    summary: {
        addHeading: mockAddHeading,
        addRaw: mockAddRaw,
    },
}));

// Mock fs, passing through real implementations except unlinkSync
const mockUnlinkSync = jest.fn();
jest.unstable_mockModule("fs", () => ({
    readFileSync: nodeFs.readFileSync,
    existsSync: nodeFs.existsSync,
    writeFileSync: nodeFs.writeFileSync,
    copyFileSync: nodeFs.copyFileSync,
    readdirSync: nodeFs.readdirSync,
    unlinkSync: mockUnlinkSync,
}));

// Dynamic imports after mocking
const core = await import("@actions/core");
const fs = await import("fs");
const testResultsSummary = await import("./testResultsSummary.js");

describe("Artifact Processing Tests", () => {
    // Shared test data
    let testResultsData: TestResultsData | null;
    let testSessions: TestSession[];
    let overallStats: TestStatistics;

    beforeAll(() => {
        const runnerTemp = path.join(import.meta.dirname, "..");
        const runId = "123";
        const actionName = "run-tests";
        const osInfo = getOSInfo();
        const workspace = path.join(osInfo.workspaceParent, "workspace");

        copyTestDataFile(osInfo.osName, runnerTemp, runId, actionName);

        testResultsData = testResultsSummary.getTestResults(runnerTemp, runId, workspace);
        if (testResultsData) {
            testSessions = testResultsData.TestSessions;
            overallStats = testResultsData.OverallStats;
        }
    });

    beforeEach(() => {
        mockAddHeading.mockClear().mockReturnThis();
        mockAddRaw.mockClear().mockReturnThis();
    });

    function getOSInfo() {
        const platform = os.platform().toLowerCase();
        if (platform.includes("win") && !platform.includes("darwin"))
            return { osName: "windows", workspaceParent: "C:\\" };
        if (platform.includes("linux") || platform.includes("unix") || platform.includes("aix"))
            return { osName: "linux", workspaceParent: "/home/user/" };
        if (platform.includes("darwin"))
            return { osName: "mac", workspaceParent: "/Users/username/" };
        throw new Error(`Unsupported OS: ${platform}`);
    }

    function copyTestDataFile(
        osName: string,
        runnerTemp: string,
        runId: string,
        actionName: string,
    ) {
        const sourceFilePath = path.join(
            import.meta.dirname,
            "test-data",
            "testResultsArtifacts",
            "t1",
            osName,
            "matlabTestResults.json",
        );
        const destinationFilePath = path.join(
            runnerTemp,
            "matlabTestResults_20250101_120000_000.json",
        );

        try {
            fs.copyFileSync(sourceFilePath, destinationFilePath);
        } catch (err) {
            console.error("Error copying test-data:", err);
        }
    }

    // it("should return correct test results data structure", () => {
    //     expect(testResultsData).toBeDefined();
    //     expect(testSessions).toBeDefined();
    //     expect(overallStats).toBeDefined();
    //     expect(testSessions.length).toBe(1);
    //     expect(testSessions[0].FileName).toBe("matlabTestResults_20250101_120000_000.json");
    //     expect(testSessions[0].TestResults.length).toBe(2);
    // });

    // it("should return correct test results data for valid JSON", () => {
    //     const testResults = testSessions[0].TestResults;
    //     expect(testResults).toBeDefined();
    //     expect(testResults.length).toBe(2);
    //     expect(testResults[0].TestCases.length).toBe(9);
    //     expect(testResults[1].TestCases.length).toBe(1);
    // });

    // it("should return correct overall stats for valid JSON", () => {
    //     expect(overallStats.Total).toBe(10);
    //     expect(overallStats.Passed).toBe(4);
    //     expect(overallStats.Failed).toBe(3);
    //     expect(overallStats.Incomplete).toBe(2);
    //     expect(overallStats.NotRun).toBe(1);
    //     expect(overallStats.Duration).toBeCloseTo(1.83);
    // });

    // it("should return correct session stats for valid JSON", () => {
    //     const sessionStats = testSessions[0].Stats;
    //     expect(sessionStats.Total).toBe(10);
    //     expect(sessionStats.Passed).toBe(4);
    //     expect(sessionStats.Failed).toBe(3);
    //     expect(sessionStats.Incomplete).toBe(2);
    //     expect(sessionStats.NotRun).toBe(1);
    //     expect(sessionStats.Duration).toBeCloseTo(1.83);
    // });

    // it("should return correct test files data for valid JSON", () => {
    //     const testResults = testSessions[0].TestResults;
    //     expect(testResults[0].Path).toBe(path.join("visualization", "tests", "TestExamples1"));
    //     expect(testResults[1].Path).toBe(
    //         path.join("visualization", "duplicate_tests", "TestExamples2"),
    //     );
    //     expect(testResults[0].Name).toBe("TestExamples1");
    //     expect(testResults[1].Name).toBe("TestExamples2");
    //     expect(testResults[0].Duration).toBeCloseTo(1.73);
    //     expect(testResults[1].Duration).toBeCloseTo(0.1);
    //     expect(testResults[0].Status).toBe(MatlabTestStatus.FAILED);
    //     expect(testResults[1].Status).toBe(MatlabTestStatus.INCOMPLETE);
    // });

    // it("should return correct test cases data for valid JSON", () => {
    //     const testResults = testSessions[0].TestResults;
    //     expect(testResults[0].TestCases[0].Name).toBe("testNonLeapYear");
    //     expect(testResults[0].TestCases[4].Name).toBe("testLeapYear");
    //     expect(testResults[0].TestCases[7].Name).toBe("testValidDateFormat");
    //     expect(testResults[0].TestCases[8].Name).toBe("testInvalidDateFormat");
    //     expect(testResults[1].TestCases[0].Name).toBe("testNonLeapYear");

    //     expect(testResults[0].TestCases[0].Status).toBe(MatlabTestStatus.PASSED);
    //     expect(testResults[0].TestCases[4].Status).toBe(MatlabTestStatus.FAILED);
    //     expect(testResults[0].TestCases[8].Status).toBe(MatlabTestStatus.NOT_RUN);
    //     expect(testResults[1].TestCases[0].Status).toBe(MatlabTestStatus.INCOMPLETE);

    //     expect(testResults[0].TestCases[0].Duration).toBeCloseTo(0.1);
    //     expect(testResults[0].TestCases[1].Duration).toBeCloseTo(0.11);
    //     expect(testResults[0].TestCases[2].Duration).toBeCloseTo(0.11);
    //     expect(testResults[0].TestCases[4].Duration).toBeCloseTo(0.4);
    //     expect(testResults[0].TestCases[8].Duration).toBeCloseTo(0.0);
    //     expect(testResults[1].TestCases[0].Duration).toBeCloseTo(0.1);

    //     expect(testResults[0].TestCases[4].Diagnostics[0].Event).toBe("SampleDiagnosticsEvent1");
    //     expect(testResults[0].TestCases[4].Diagnostics[0].Report).toBe("SampleDiagnosticsReport1");
    //     expect(testResults[1].TestCases[0].Diagnostics[0].Event).toBe("SampleDiagnosticsEvent2");
    //     expect(testResults[1].TestCases[0].Diagnostics[0].Report).toBe("SampleDiagnosticsReport2");
    // });

    // it("should handle test results with undefined Details property", () => {
    //     const runnerTemp = path.join(import.meta.dirname, "..");
    //     const testFilePath = path.join(runnerTemp, "matlabTestResults_undefined_details.json");

    //     // Create test data with undefined Details
    //     const testData = [
    //         [
    //             {
    //                 BaseFolder: "/workspace/tests",
    //                 TestResult: {
    //                     Name: "TestFile/testCase1",
    //                     Duration: 0.5,
    //                     Failed: false,
    //                     Incomplete: false,
    //                     Passed: true,
    //                     // Details property is intentionally omitted
    //                 },
    //             },
    //         ],
    //     ];

    //     try {
    //         fs.writeFileSync(testFilePath, JSON.stringify(testData));

    //         const result = testResultsSummary.getTestResults(runnerTemp, "123", "/workspace");

    //         expect(result).not.toBeNull();
    //         if (result) {
    //             expect(result.TestSessions.length).toBeGreaterThan(0);
    //             const session = result.TestSessions.find(
    //                 (s) => s.FileName === "matlabTestResults_undefined_details.json",
    //             );
    //             expect(session).toBeDefined();
    //             if (session) {
    //                 expect(session.TestResults.length).toBeGreaterThan(0);
    //                 const testFile = session.TestResults[0];
    //                 expect(testFile.TestCases.length).toBe(1);
    //                 expect(testFile.TestCases[0].Diagnostics).toEqual([]);
    //             }
    //         }
    //     } finally {
    //         if (nodeFs.existsSync(testFilePath)) {
    //             nodeFs.unlinkSync(testFilePath);
    //         }
    //     }
    // });

    // it("should handle test results with Details but no DiagnosticRecord", () => {
    //     const runnerTemp = path.join(import.meta.dirname, "..");
    //     const testFilePath = path.join(runnerTemp, "matlabTestResults_no_diagnostics.json");

    //     // Create test data with Details but no DiagnosticRecord
    //     const testData = [
    //         [
    //             {
    //                 BaseFolder: "/workspace/tests",
    //                 TestResult: {
    //                     Name: "TestFile/testCase1",
    //                     Duration: 0.5,
    //                     Failed: false,
    //                     Incomplete: false,
    //                     Passed: true,
    //                     Details: {},
    //                 },
    //             },
    //         ],
    //     ];

    //     try {
    //         fs.writeFileSync(testFilePath, JSON.stringify(testData));

    //         const result = testResultsSummary.getTestResults(runnerTemp, "123", "/workspace");

    //         expect(result).not.toBeNull();
    //         if (result) {
    //             expect(result.TestSessions.length).toBeGreaterThan(0);
    //             const session = result.TestSessions.find(
    //                 (s) => s.FileName === "matlabTestResults_no_diagnostics.json",
    //             );
    //             expect(session).toBeDefined();
    //             if (session) {
    //                 expect(session.TestResults.length).toBeGreaterThan(0);
    //                 const testFile = session.TestResults[0];
    //                 expect(testFile.TestCases.length).toBe(1);
    //                 expect(testFile.TestCases[0].Diagnostics).toEqual([]);
    //             }
    //         }
    //     } finally {
    //         if (nodeFs.existsSync(testFilePath)) {
    //             nodeFs.unlinkSync(testFilePath);
    //         }
    //     }
    // });

    it("should write test results data to the GitHub job summary", () => {
        if (testResultsData) {
            testResultsSummary.addSummary(testResultsData, null);

            expect(mockAddHeading).toHaveBeenCalledTimes(2);

            // First heading: overall results
            expect(mockAddHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("MATLAB Test Results "),
            );
            expect(mockAddHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining(
                    '<a href="https://github.com/matlab-actions/run-tests/blob/main/README.md#view-test-results"',
                ),
            );
            expect(mockAddHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('target="_blank"'),
            );
            expect(mockAddHeading).toHaveBeenNthCalledWith(1, expect.stringContaining("ℹ️</a>"));

            expect(mockAddHeading).toHaveBeenNthCalledWith(2, "All tests", 4);

            expect(mockAddRaw).toHaveBeenCalledTimes(2);
        }
    });

    it("should show session numbers when multiple sessions exist", () => {
        if (testResultsData) {
            // Create a mock with multiple sessions
            const multiSessionData: TestResultsData = {
                TestSessions: [
                    testResultsData.TestSessions[0],
                    {
                        FileName: "matlabTestResults_20250101_120001_000.json",
                        TestResults: testResultsData.TestSessions[0].TestResults,
                        Stats: testResultsData.TestSessions[0].Stats,
                    },
                ],
                OverallStats: {
                    Total: testResultsData.OverallStats.Total * 2,
                    Passed: testResultsData.OverallStats.Passed * 2,
                    Failed: testResultsData.OverallStats.Failed * 2,
                    Incomplete: testResultsData.OverallStats.Incomplete * 2,
                    NotRun: testResultsData.OverallStats.NotRun * 2,
                    Duration: testResultsData.OverallStats.Duration * 2,
                },
            };

            testResultsSummary.addSummary(multiSessionData, null);

            expect(mockAddHeading).toHaveBeenCalledTimes(5);
            expect(mockAddHeading).toHaveBeenNthCalledWith(2, "Test Session (Session 1)", 3);
            expect(mockAddHeading).toHaveBeenNthCalledWith(4, "Test Session (Session 2)", 3);
        }
    });
});

describe("HTML Structure Tests", () => {
    it.each([
        [MatlabTestStatus.PASSED, "✅"],
        [MatlabTestStatus.FAILED, "❌"],
        [MatlabTestStatus.INCOMPLETE, "⚠️"],
        [MatlabTestStatus.NOT_RUN, "🚫"],
    ])(
        "should return %s emoji for %s Status",
        (status: MatlabTestStatus, expectedEmoji: string) => {
            expect(testResultsSummary.getStatusEmoji(status)).toBe(expectedEmoji);
        },
    );

    it("should generate valid HTML table structure for header", () => {
        const mockStats: TestStatistics = {
            Total: 10,
            Passed: 4,
            Failed: 3,
            Incomplete: 2,
            NotRun: 1,
            Duration: 1.83,
        };

        const htmlHeader = testResultsSummary.getTestHeader(mockStats);

        // Parse HTML with jsdom
        const dom = new JSDOM(htmlHeader);
        const document = dom.window.document;

        // Verify table exists
        const table = document.querySelector("table");
        expect(table).not.toBeNull();

        // Verify table has 2 rows (header + data)
        const rows = table?.querySelectorAll("tr");
        expect(rows?.length).toBe(2);

        // Verify header row has 6 columns
        const headerRow = rows?.[0];
        expect(headerRow?.children.length).toBe(6);
        expect(headerRow?.children[0]?.textContent).toBe("Total tests");
        expect(headerRow?.children[1]?.textContent).toBe("Passed ✅");
        expect(headerRow?.children[2]?.textContent).toBe("Failed ❌");
        expect(headerRow?.children[3]?.textContent).toBe("Incomplete ⚠️");
        expect(headerRow?.children[4]?.textContent).toBe("Not Run 🚫");
        expect(headerRow?.children[5]?.textContent).toBe("Duration(s) ⌛");

        // Verify data row has correct values
        const dataRow = rows?.[1];
        expect(dataRow?.children[0]?.textContent).toBe("10");
        expect(dataRow?.children[1]?.textContent).toBe("4");
        expect(dataRow?.children[2]?.textContent).toBe("3");
        expect(dataRow?.children[3]?.textContent).toBe("2");
        expect(dataRow?.children[4]?.textContent).toBe("1");
        expect(dataRow?.children[5]?.textContent).toBe("1.83");
    });

    it("should generate valid HTML for detailed results with proper details tags for both passed and failed tests", () => {
        const mockTestResults: MatlabTestFile[] = [
            {
                Name: "TestExamples1",
                Path: "tests/TestExamples1",
                Duration: 1.5,
                Status: MatlabTestStatus.FAILED,
                TestCases: [
                    {
                        Name: "testFailedCase",
                        Duration: 0.5,
                        Status: MatlabTestStatus.FAILED,
                        Diagnostics: [
                            {
                                Event: "TestFailure",
                                Report: "Expected 5 but got 4",
                            },
                        ],
                    },
                ],
            },
            {
                Name: "TestExamples2",
                Path: "tests/TestExamples2",
                Duration: 0.3,
                Status: MatlabTestStatus.PASSED,
                TestCases: [
                    {
                        Name: "testPassedCase",
                        Duration: 0.3,
                        Status: MatlabTestStatus.PASSED,
                        Diagnostics: [],
                    },
                ],
            },
        ];

        const htmlDetails = testResultsSummary.getDetailedResults(mockTestResults);

        // Parse HTML with jsdom
        const dom = new JSDOM(htmlDetails);
        const document = dom.window.document;

        // Verify table structure
        const table = document.querySelector("table");
        expect(table).not.toBeNull();

        // Get all details elements
        const detailsElements = document.querySelectorAll("details");
        expect(detailsElements.length).toBe(3); // 2 test files + 1 diagnostic

        // Verify failed test (first details element) has open attribute
        const failedTestDetails = detailsElements[0];
        expect(failedTestDetails.hasAttribute("open")).toBe(true);
        const failedTestSummary = failedTestDetails.querySelector("summary b");
        expect(failedTestSummary?.textContent).toContain("TestExamples1");
        expect(failedTestSummary?.textContent).toContain("❌");

        // Verify passed test (third details element; second element is for Diagnostics) does NOT have open attribute
        const passedTestDetails = detailsElements[2];
        expect(passedTestDetails.hasAttribute("open")).toBe(false);
        const passedTestSummary = passedTestDetails.querySelector("summary b");
        expect(passedTestSummary?.textContent).toContain("TestExamples2");
        expect(passedTestSummary?.textContent).toContain("✅");

        // Verify test case details
        expect(htmlDetails).toContain("❌ testFailedCase");
        expect(htmlDetails).toContain("✅ testPassedCase");

        // Verify Diagnostics details tag (second details element)
        const diagnosticsDetails = detailsElements[1];
        expect(diagnosticsDetails).not.toBeNull();
        expect(diagnosticsDetails.hasAttribute("open")).toBe(false); // Diagnostics should be closed by default

        // Verify Diagnostics summary and content
        const diagnosticsSummary = diagnosticsDetails.querySelector("summary");
        expect(diagnosticsSummary?.textContent).toBe("TestFailure");

        // Verify Diagnostics Report content
        const diagnosticsContent = diagnosticsDetails.querySelector("pre");
        expect(diagnosticsContent).not.toBeNull();
        expect(diagnosticsContent?.textContent?.trim()).toBe("Expected 5 but got 4");
        expect(diagnosticsContent?.getAttribute("style")).toContain("font-family: monospace");
        expect(diagnosticsContent?.getAttribute("style")).toContain("white-space: pre");

        // Verify Diagnostics is nested within the failed test details
        const nestedDiagnostics = failedTestDetails.querySelector("table details");
        expect(nestedDiagnostics).toBe(diagnosticsDetails);

        // Verify durations
        expect(htmlDetails).toContain("<b>1.50</b>");
        expect(htmlDetails).toContain("<b>0.30</b>");
    });
});

describe("Error Handling Tests", () => {
    beforeEach(() => {
        mockAddHeading.mockClear().mockReturnThis();
        mockAddRaw.mockClear().mockReturnThis();
    });

    it("should handle errors gracefully in addSummary", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Mock addHeading to throw an error for this specific test
        mockAddHeading.mockImplementationOnce(() => {
            throw new Error("Mock error in addHeading");
        });

        const mockStats: TestStatistics = {
            Total: 1,
            Passed: 1,
            Failed: 0,
            Incomplete: 0,
            NotRun: 0,
            Duration: 0.5,
        };
        const mockTestResults: MatlabTestFile[] = [];
        const mockTestResultsData: TestResultsData = {
            TestSessions: [
                {
                    FileName: "test.json",
                    TestResults: mockTestResults,
                    Stats: mockStats,
                },
            ],
            OverallStats: mockStats,
        };

        // This should not throw, but should log the error
        expect(() => {
            testResultsSummary.addSummary(mockTestResultsData, null);
        }).not.toThrow();

        // Verify error was logged
        expect(consoleSpy).toHaveBeenCalledWith(
            "An error occurred while adding the test results to the summary:",
            expect.any(Error),
        );

        consoleSpy.mockRestore();

        // Restore the mock to its default behavior
        mockAddHeading.mockReturnThis();
    });

    it("should handle JSON parsing errors gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Set up environment variables
        process.env.RUNNER_TEMP = path.join(import.meta.dirname, "..");
        process.env.GITHUB_RUN_ID = "123";
        process.env.GITHUB_ACTION = "run-tests";

        // Create a file with invalid JSON
        const invalidJsonPath = path.join(
            process.env.RUNNER_TEMP,
            "matlabTestResults_invalid.json",
        );
        fs.writeFileSync(invalidJsonPath, "{ invalid json content");

        try {
            const result = testResultsSummary.getTestResults(
                process.env.RUNNER_TEMP,
                process.env.GITHUB_RUN_ID,
                "",
            );

            // Should return data but skip the invalid file
            if (result) {
                // The invalid file should be skipped, so we might have 0 sessions
                expect(result.TestSessions).toBeDefined();
            }

            // Verify error was logged
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "An error occurred while reading the test results summary file",
                ),
                expect.any(Error),
            );
        } finally {
            // Clean up
            if (nodeFs.existsSync(invalidJsonPath)) {
                nodeFs.unlinkSync(invalidJsonPath);
            }
            consoleSpy.mockRestore();
        }
    });

    it("should handle file deletion errors gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Set up the mock to throw an error for this test
        mockUnlinkSync.mockImplementationOnce(() => {
            throw new Error("Permission denied - cannot delete file");
        });

        // Set up environment variables
        process.env.RUNNER_TEMP = path.join(import.meta.dirname, "..");
        process.env.GITHUB_RUN_ID = "123";
        process.env.GITHUB_ACTION = "run-tests";

        // Create a valid JSON file
        const validJsonPath = path.join(
            process.env.RUNNER_TEMP,
            "matlabTestResults_delete_test.json",
        );
        fs.writeFileSync(validJsonPath, "[[]]"); // Empty array - valid JSON

        try {
            const result = testResultsSummary.getTestResults(
                process.env.RUNNER_TEMP,
                process.env.GITHUB_RUN_ID,
                "",
            );

            // Should still return results even if deletion fails
            expect(result).toBeDefined();
            if (result) {
                expect(result.TestSessions.length).toBeGreaterThanOrEqual(0);
            }

            // Verify deletion error was logged
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "An error occurred while trying to delete the test results summary file",
                ),
                expect.any(Error),
            );

            // Verify unlinkSync was called
            expect(mockUnlinkSync).toHaveBeenCalledWith(validJsonPath);
        } finally {
            // Clean up
            mockUnlinkSync.mockReset();
            consoleSpy.mockRestore();

            // Clean up the test file using real fs
            try {
                nodeFs.unlinkSync(validJsonPath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    it("should handle directory read errors gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Use a non-existent directory
        const nonExistentDir = path.join(import.meta.dirname, "non_existent_directory_12345");

        const result = testResultsSummary.getTestResults(nonExistentDir, "123", "");

        expect(result).toBeNull();

        // The error message includes a colon after the directory path
        expect(consoleSpy).toHaveBeenCalledWith(
            `An error occurred while finding test results summary file(s) in directory ${nonExistentDir}:`,
            expect.any(Error),
        );

        consoleSpy.mockRestore();
    });
});
