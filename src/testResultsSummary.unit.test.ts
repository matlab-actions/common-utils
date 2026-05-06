// Copyright 2025-2026 The MathWorks, Inc.

import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";
import * as path from "path";
import * as os from "os";
import * as nodeFs from "fs";
import { JSDOM } from "jsdom";
import type {
    TestResultsData,
    TestSession,
    MatlabTestFile,
    TestStatistics,
} from "./testResultsSummary.js";

// Mock @actions/core
jest.unstable_mockModule("@actions/core", () => ({
    summary: {
        addHeading: jest.fn().mockReturnThis(),
        addRaw: jest.fn().mockReturnThis(),
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
const { MatlabTestStatus } = testResultsSummary;

describe("Artifact Processing Tests", () => {
    // Shared test data
    let testResultsData: TestResultsData | null;
    let testSession: TestSession;
    let testResults: MatlabTestFile[];
    let stats: TestStatistics;

    beforeAll(() => {
        const runnerTemp = path.join(import.meta.dirname, "..");
        const runId = "123";
        const osInfo = getOSInfo();
        const workspace = path.join(osInfo.workspaceParent, "workspace");

        copyTestDataFile(osInfo.osName, runnerTemp);

        testResultsData = testResultsSummary.getTestResults(runnerTemp, runId, workspace);
        if (testResultsData) {
            testSession = testResultsData.TestSessions[0];
            testResults = testSession.TestResults;
            stats = testResultsData.OverallStats;
        }
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

    function copyTestDataFile(osName: string, runnerTemp: string) {
        const sourceFilePath = path.join(
            import.meta.dirname,
            "test-data",
            "testResultsArtifacts",
            "t1",
            osName,
            "matlabTestResults.json",
        );
        const destinationFilePath = path.join(runnerTemp, "matlabTestResults_session1.json");

        try {
            fs.copyFileSync(sourceFilePath, destinationFilePath);
        } catch (err) {
            console.error("Error copying test-data:", err);
        }
    }

    it("should return correct test results data for valid JSON", () => {
        expect(testResultsData).toBeDefined();
        expect(testResultsData!.TestSessions.length).toBe(1);
        expect(testResults).toBeDefined();
        expect(stats).toBeDefined();
        expect(testResults.length).toBe(2);
        expect(testResults[0].TestCases.length).toBe(9);
        expect(testResults[1].TestCases.length).toBe(1);
    });

    it("should return correct overall stats for valid JSON", () => {
        expect(stats.Total).toBe(10);
        expect(stats.Passed).toBe(4);
        expect(stats.Failed).toBe(3);
        expect(stats.Incomplete).toBe(2);
        expect(stats.NotRun).toBe(1);
        expect(stats.Duration).toBeCloseTo(1.83);
    });

    it("should return correct session stats for valid JSON", () => {
        const sessionStats = testSession.Stats;
        expect(sessionStats.Total).toBe(10);
        expect(sessionStats.Passed).toBe(4);
        expect(sessionStats.Failed).toBe(3);
        expect(sessionStats.Incomplete).toBe(2);
        expect(sessionStats.NotRun).toBe(1);
        expect(sessionStats.Duration).toBeCloseTo(1.83);
    });

    it("should return correct test files data for valid JSON", () => {
        expect(testResults[0].Path).toBe(path.join("visualization", "tests", "TestExamples1"));
        expect(testResults[1].Path).toBe(
            path.join("visualization", "duplicate_tests", "TestExamples2"),
        );
        expect(testResults[0].Name).toBe("TestExamples1");
        expect(testResults[1].Name).toBe("TestExamples2");
        expect(testResults[0].Duration).toBeCloseTo(1.73);
        expect(testResults[1].Duration).toBeCloseTo(0.1);
        expect(testResults[0].Status).toBe(MatlabTestStatus.FAILED);
        expect(testResults[1].Status).toBe(MatlabTestStatus.INCOMPLETE);
    });

    it("should return correct test cases data for valid JSON", () => {
        expect(testResults[0].TestCases[0].Name).toBe("testNonLeapYear");
        expect(testResults[0].TestCases[4].Name).toBe("testLeapYear");
        expect(testResults[0].TestCases[7].Name).toBe("testValidDateFormat");
        expect(testResults[0].TestCases[8].Name).toBe("testInvalidDateFormat");
        expect(testResults[1].TestCases[0].Name).toBe("testNonLeapYear");

        expect(testResults[0].TestCases[0].Status).toBe(MatlabTestStatus.PASSED);
        expect(testResults[0].TestCases[4].Status).toBe(MatlabTestStatus.FAILED);
        expect(testResults[0].TestCases[8].Status).toBe(MatlabTestStatus.NOT_RUN);
        expect(testResults[1].TestCases[0].Status).toBe(MatlabTestStatus.INCOMPLETE);

        expect(testResults[0].TestCases[0].Duration).toBeCloseTo(0.1);
        expect(testResults[0].TestCases[1].Duration).toBeCloseTo(0.11);
        expect(testResults[0].TestCases[2].Duration).toBeCloseTo(0.11);
        expect(testResults[0].TestCases[4].Duration).toBeCloseTo(0.4);
        expect(testResults[0].TestCases[8].Duration).toBeCloseTo(0.0);
        expect(testResults[1].TestCases[0].Duration).toBeCloseTo(0.1);

        expect(testResults[0].TestCases[4].Diagnostics[0].Event).toBe("SampleDiagnosticsEvent1");
        expect(testResults[0].TestCases[4].Diagnostics[0].Report).toBe("SampleDiagnosticsReport1");
        expect(testResults[1].TestCases[0].Diagnostics[0].Event).toBe("SampleDiagnosticsEvent2");
        expect(testResults[1].TestCases[0].Diagnostics[0].Report).toBe("SampleDiagnosticsReport2");
    });

    it("should store correct session file name", () => {
        expect(testSession.FileName).toBe("matlabTestResults_session1.json");
    });

    it("should write test results to GitHub job summary for single session", () => {
        if (testResultsData) {
            (core.summary.addHeading as jest.Mock).mockClear();
            (core.summary.addRaw as jest.Mock).mockClear();

            testResultsSummary.addSummary(testResultsData, null);

            // Single session: overall header + "All tests" heading
            expect(core.summary.addHeading).toHaveBeenCalledTimes(2);
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("MATLAB Test Results "),
            );
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining(
                    '<a href="https://github.com/matlab-actions/run-tests/blob/main/README.md#view-test-results"',
                ),
            );
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('target="_blank"'),
            );
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("ℹ️</a>"),
            );
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(2, "All tests", 4);

            // Overall header + detailed results
            expect(core.summary.addRaw).toHaveBeenCalledTimes(2);
        }
    });

    it("should not add per-session headers for single session", () => {
        if (testResultsData) {
            (core.summary.addHeading as jest.Mock).mockClear();
            (core.summary.addRaw as jest.Mock).mockClear();

            testResultsSummary.addSummary(testResultsData, null);

            const headingCalls = (core.summary.addHeading as jest.Mock).mock.calls;
            const sessionHeaders = headingCalls.filter(
                (call) => typeof call[0] === "string" && call[0].includes("Test Session"),
            );
            expect(sessionHeaders.length).toBe(0);
        }
    });
});

describe("Multiple Sessions Tests", () => {
    let testResultsData: TestResultsData | null;

    beforeAll(() => {
        const runnerTemp = path.join(import.meta.dirname, "..");
        const runId = "456";
        const osInfo = getOSInfo();
        const workspace = path.join(osInfo.workspaceParent, "workspace");

        const sourceFilePath = path.join(
            import.meta.dirname,
            "test-data",
            "testResultsArtifacts",
            "t1",
            osInfo.osName,
            "matlabTestResults.json",
        );

        // Copy the same data file twice to simulate multiple sessions
        const dest1 = path.join(runnerTemp, "matlabTestResults_multi1.json");
        const dest2 = path.join(runnerTemp, "matlabTestResults_multi2.json");

        try {
            fs.copyFileSync(sourceFilePath, dest1);
            fs.copyFileSync(sourceFilePath, dest2);
        } catch (err) {
            console.error("Error copying test-data:", err);
        }

        testResultsData = testResultsSummary.getTestResults(runnerTemp, runId, workspace);
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

    it("should return multiple test sessions", () => {
        expect(testResultsData).not.toBeNull();
        expect(testResultsData!.TestSessions.length).toBe(2);
    });

    it("should aggregate overall stats across sessions", () => {
        const overallStats = testResultsData!.OverallStats;
        expect(overallStats.Total).toBe(20);
        expect(overallStats.Passed).toBe(8);
        expect(overallStats.Failed).toBe(6);
        expect(overallStats.Incomplete).toBe(4);
        expect(overallStats.NotRun).toBe(2);
        expect(overallStats.Duration).toBeCloseTo(3.66);
    });

    it("should have correct per-session stats", () => {
        for (const session of testResultsData!.TestSessions) {
            expect(session.Stats.Total).toBe(10);
            expect(session.Stats.Passed).toBe(4);
            expect(session.Stats.Failed).toBe(3);
            expect(session.Stats.Incomplete).toBe(2);
            expect(session.Stats.NotRun).toBe(1);
            expect(session.Stats.Duration).toBeCloseTo(1.83);
        }
    });

    it("should have correct test results per session", () => {
        for (const session of testResultsData!.TestSessions) {
            expect(session.TestResults.length).toBe(2);
            expect(session.TestResults[0].TestCases.length).toBe(9);
            expect(session.TestResults[1].TestCases.length).toBe(1);
        }
    });

    it("should add per-session headers for multiple sessions", () => {
        if (testResultsData) {
            (core.summary.addHeading as jest.Mock).mockClear();
            (core.summary.addRaw as jest.Mock).mockClear();

            testResultsSummary.addSummary(testResultsData, null);

            // Overall header + (session header + "All tests") * 2 sessions = 5 headings
            expect(core.summary.addHeading).toHaveBeenCalledTimes(5);
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining("MATLAB Test Results "),
            );
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(
                2,
                "Test Session (Session 1)",
                3,
            );
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(3, "All tests", 4);
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(
                4,
                "Test Session (Session 2)",
                3,
            );
            expect(core.summary.addHeading).toHaveBeenNthCalledWith(5, "All tests", 4);

            // Overall header + (session header + detailed results) * 2 = 5 addRaw calls
            expect(core.summary.addRaw).toHaveBeenCalledTimes(5);
        }
    });
});

describe("No Results Tests", () => {
    it("should return null when no matching files exist", () => {
        const emptyDir = path.join(import.meta.dirname, "test-data");
        const result = testResultsSummary.getTestResults(emptyDir, "999", "");
        expect(result).toBeNull();
    });

    it("should return null when directory does not exist", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const result = testResultsSummary.getTestResults("/nonexistent/path", "999", "");
        expect(result).toBeNull();
        consoleSpy.mockRestore();
    });
});

describe("HTML Structure Tests", () => {
    it.each([
        [MatlabTestStatus.PASSED, "✅"],
        [MatlabTestStatus.FAILED, "❌"],
        [MatlabTestStatus.INCOMPLETE, "⚠️"],
        [MatlabTestStatus.NOT_RUN, "🚫"],
    ])("should return %s emoji for %s Status", (Status, expectedEmoji) => {
        expect(testResultsSummary.getStatusEmoji(Status)).toBe(expectedEmoji);
    });

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

    it("should use forward slashes in displayed path", () => {
        const mockTestResults: MatlabTestFile[] = [
            {
                Name: "TestFile",
                Path: "src\\tests\\TestFile",
                Duration: 0.5,
                Status: MatlabTestStatus.PASSED,
                TestCases: [
                    {
                        Name: "testCase1",
                        Duration: 0.5,
                        Status: MatlabTestStatus.PASSED,
                        Diagnostics: [],
                    },
                ],
            },
        ];

        const htmlDetails = testResultsSummary.getDetailedResults(mockTestResults);
        expect(htmlDetails).toContain('title="src/tests/TestFile"');
        expect(htmlDetails).not.toContain("src\\tests\\TestFile");
    });
});

describe("Error Handling Tests", () => {
    it("should handle errors gracefully in addSummary", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Mock addHeading to throw an error
        (core.summary.addHeading as jest.Mock).mockImplementationOnce(() => {
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
        const mockTestResultsData: TestResultsData = {
            TestSessions: [
                {
                    FileName: "matlabTestResults_test.json",
                    TestResults: [],
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
    });

    it("should handle JSON parsing errors gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        const runnerTemp = path.join(import.meta.dirname, "..");

        // Create a file with invalid JSON matching the new naming pattern
        const invalidJsonPath = path.join(runnerTemp, "matlabTestResults_invalid.json");
        fs.writeFileSync(invalidJsonPath, "{ invalid json content");

        try {
            const result = testResultsSummary.getTestResults(runnerTemp, "123", "");
            expect(result).not.toBeNull();
            expect(result!.TestSessions.length).toBe(0);
            expect(result!.OverallStats.Total).toBe(0);

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

        const runnerTemp = path.join(import.meta.dirname, "..");

        // Create a valid JSON file matching the new naming pattern
        const validJsonPath = path.join(runnerTemp, "matlabTestResults_deletetest.json");
        fs.writeFileSync(validJsonPath, "[]"); // Empty array - valid JSON

        try {
            const result = testResultsSummary.getTestResults(runnerTemp, "123", "");

            // Should still return results even if deletion fails
            expect(result).not.toBeNull();
            expect(result!.TestSessions.length).toBe(1);
            expect(result!.TestSessions[0].TestResults).toEqual([]);

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

        const result = testResultsSummary.getTestResults("/nonexistent/directory/path", "123", "");

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining(
                "An error occurred while finding test results summary file(s) in directory",
            ),
            expect.any(Error),
        );

        consoleSpy.mockRestore();
    });
});
