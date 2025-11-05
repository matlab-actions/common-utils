// Copyright 2025 The MathWorks, Inc.

import * as testResultsSummary from "./testResultsSummary";
import * as path from "path";
import * as fs from "fs";
import * as core from "@actions/core";
import { JSDOM } from "jsdom";

jest.mock("@actions/core", () => ({
    summary: {
        addHeading: jest.fn().mockReturnThis(),
        addRaw: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
    },
}));

jest.mock("fs", () => ({
    ...jest.requireActual("fs"),
    unlinkSync: jest.fn(),
}));

describe("Artifact Processing Tests", () => {
    // Shared test data
    let testResultsData: testResultsSummary.TestResultsData;
    let testResults: testResultsSummary.MatlabTestFile[][];
    let stats: testResultsSummary.TestStatistics;

    beforeAll(() => {
        const runnerTemp = path.join(__dirname, "..");
        const runId = "123";
        const actionName = "run-tests";
        const osInfo = getOSInfo();
        const workspace = path.join(osInfo.workspaceParent, "workspace");

        copyTestDataFile(osInfo.osName, runnerTemp, runId, actionName);

        testResultsData = testResultsSummary.getTestResults(runnerTemp, runId, actionName, workspace);
        testResults = testResultsData.TestResults;
        stats = testResultsData.Stats;
    });

    function getOSInfo() {
        const os = require("os").platform().toLowerCase();
        if (os.includes("win") && !os.includes("darwin"))
            return { osName: "windows", workspaceParent: "C:\\" };
        if (os.includes("linux") || os.includes("unix") || os.includes("aix"))
            return { osName: "linux", workspaceParent: "/home/user/" };
        if (os.includes("darwin")) return { osName: "mac", workspaceParent: "/Users/username/" };
        throw new Error(`Unsupported OS: ${os}`);
    }

    function copyTestDataFile(osName: string, runnerTemp: string, runId: string, actionName: string) {
        const sourceFilePath = path.join(
            __dirname,
            "test-data",
            "testResultsArtifacts",
            "t1",
            osName,
            "matlabTestResults.json",
        );
        const destinationFilePath = path.join(runnerTemp, "matlabTestResults_" + runId + "_" + actionName + ".json");

        try {
            fs.copyFileSync(sourceFilePath, destinationFilePath);
        } catch (err) {
            console.error("Error copying test-data:", err);
        }
    }

    it("should return correct test results data for valid JSON", () => {
        expect(testResults).toBeDefined();
        expect(stats).toBeDefined();
        expect(testResults.length).toBe(2);
        expect(testResults[0].length).toBe(1);
        expect(testResults[1].length).toBe(1);
        expect(testResults[0][0].TestCases.length).toBe(9);
        expect(testResults[1][0].TestCases.length).toBe(1);
    });

    it("should return correct test stats for valid JSON", () => {
        expect(stats.Total).toBe(10);
        expect(stats.Passed).toBe(4);
        expect(stats.Failed).toBe(3);
        expect(stats.Incomplete).toBe(2);
        expect(stats.NotRun).toBe(1);
        expect(stats.Duration).toBeCloseTo(1.83);
    });

    it("should return correct test files data for valid JSON", () => {
        expect(testResults[0][0].Path).toBe(path.join("visualization", "tests", "TestExamples1"));
        expect(testResults[1][0].Path).toBe(
            path.join("visualization", "duplicate_tests", "TestExamples2"),
        );
        expect(testResults[0][0].Name).toBe("TestExamples1");
        expect(testResults[1][0].Name).toBe("TestExamples2");
        expect(testResults[0][0].Duration).toBeCloseTo(1.73);
        expect(testResults[1][0].Duration).toBeCloseTo(0.1);
        expect(testResults[0][0].Status).toBe(testResultsSummary.MatlabTestStatus.FAILED);
        expect(testResults[1][0].Status).toBe(testResultsSummary.MatlabTestStatus.INCOMPLETE);
    });

    it("should return correct test cases data for valid JSON", () => {
        expect(testResults[0][0].TestCases[0].Name).toBe("testNonLeapYear");
        expect(testResults[0][0].TestCases[4].Name).toBe("testLeapYear");
        expect(testResults[0][0].TestCases[7].Name).toBe("testValidDateFormat");
        expect(testResults[0][0].TestCases[8].Name).toBe("testInvalidDateFormat");
        expect(testResults[1][0].TestCases[0].Name).toBe("testNonLeapYear");

        expect(testResults[0][0].TestCases[0].Status).toBe(
            testResultsSummary.MatlabTestStatus.PASSED,
        );
        expect(testResults[0][0].TestCases[4].Status).toBe(
            testResultsSummary.MatlabTestStatus.FAILED,
        );
        expect(testResults[0][0].TestCases[8].Status).toBe(
            testResultsSummary.MatlabTestStatus.NOT_RUN,
        );
        expect(testResults[1][0].TestCases[0].Status).toBe(
            testResultsSummary.MatlabTestStatus.INCOMPLETE,
        );

        expect(testResults[0][0].TestCases[0].Duration).toBeCloseTo(0.1);
        expect(testResults[0][0].TestCases[1].Duration).toBeCloseTo(0.11);
        expect(testResults[0][0].TestCases[2].Duration).toBeCloseTo(0.11);
        expect(testResults[0][0].TestCases[4].Duration).toBeCloseTo(0.4);
        expect(testResults[0][0].TestCases[8].Duration).toBeCloseTo(0.0);
        expect(testResults[1][0].TestCases[0].Duration).toBeCloseTo(0.1);

        expect(testResults[0][0].TestCases[4].Diagnostics[0].Event).toBe("SampleDiagnosticsEvent1");
        expect(testResults[0][0].TestCases[4].Diagnostics[0].Report).toBe(
            "SampleDiagnosticsReport1",
        );
        expect(testResults[1][0].TestCases[0].Diagnostics[0].Event).toBe("SampleDiagnosticsEvent2");
        expect(testResults[1][0].TestCases[0].Diagnostics[0].Report).toBe(
            "SampleDiagnosticsReport2",
        );
    });

    it("should write test results data to the GitHub job summary", () => {
        const actionName = process.env.GITHUB_ACTION || "";
        testResultsSummary.writeSummary(testResultsData, actionName);

        expect(core.summary.addHeading).toHaveBeenCalledTimes(2);
        expect(core.summary.addHeading).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("MATLAB Test Results (" + actionName + ")"),
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
        expect(core.summary.addHeading).toHaveBeenNthCalledWith(2, "All tests", 3);

        expect(core.summary.addRaw).toHaveBeenCalledTimes(2);
        expect(core.summary.write).toHaveBeenCalledTimes(1);
    });
});

describe("HTML Structure Tests", () => {
    it.each([
        [testResultsSummary.MatlabTestStatus.PASSED, "✅"],
        [testResultsSummary.MatlabTestStatus.FAILED, "❌"],
        [testResultsSummary.MatlabTestStatus.INCOMPLETE, "⚠️"],
        [testResultsSummary.MatlabTestStatus.NOT_RUN, "🚫"],
    ])("should return %s emoji for %s Status", (Status, expectedEmoji) => {
        expect(testResultsSummary.getStatusEmoji(Status)).toBe(expectedEmoji);
    });

    it("should generate valid HTML table structure for header", () => {
        const mockStats: testResultsSummary.TestStatistics = {
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
        const mockTestResults: testResultsSummary.MatlabTestFile[][] = [
            [
                {
                    Name: "TestExamples1",
                    Path: "tests/TestExamples1",
                    Duration: 1.5,
                    Status: testResultsSummary.MatlabTestStatus.FAILED,
                    TestCases: [
                        {
                            Name: "testFailedCase",
                            Duration: 0.5,
                            Status: testResultsSummary.MatlabTestStatus.FAILED,
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
                    Status: testResultsSummary.MatlabTestStatus.PASSED,
                    TestCases: [
                        {
                            Name: "testPassedCase",
                            Duration: 0.3,
                            Status: testResultsSummary.MatlabTestStatus.PASSED,
                            Diagnostics: [],
                        },
                    ],
                },
            ],
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
    it("should handle errors gracefully in writeSummary", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Mock addHeading to throw an error
        (core.summary.addHeading as jest.Mock).mockImplementationOnce(() => {
            throw new Error("Mock error in addHeading");
        });

        const mockStats: testResultsSummary.TestStatistics = {
            Total: 1,
            Passed: 1,
            Failed: 0,
            Incomplete: 0,
            NotRun: 0,
            Duration: 0.5,
        };
        const mockTestResults: testResultsSummary.MatlabTestFile[][] = [];
        const mockTestResultsData: testResultsSummary.TestResultsData = {
            TestResults: mockTestResults,
            Stats: mockStats,
        };

        // This should not throw, but should log the error
        expect(() => {
            testResultsSummary.writeSummary(mockTestResultsData, "mockAction");
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

        // Set up environment variables
        process.env.RUNNER_TEMP = path.join(__dirname, "..");
        process.env.GITHUB_RUN_ID = "123";
        process.env.GITHUB_ACTION = "run-tests";

        // Create a file with invalid JSON
        const invalidJsonPath = path.join(process.env.RUNNER_TEMP, "matlabTestResults_123_run-tests.json");
        fs.writeFileSync(invalidJsonPath, "{ invalid json content");

        try {
            const result = testResultsSummary.getTestResults(process.env.RUNNER_TEMP, process.env.GITHUB_RUN_ID, process.env.GITHUB_ACTION, "");

            // Should return empty results
            expect(result.TestResults).toEqual([]);
            expect(result.Stats).toEqual({
                Total: 0,
                Passed: 0,
                Failed: 0,
                Incomplete: 0,
                NotRun: 0,
                Duration: 0,
            });

            // Verify error was logged
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "An error occurred while reading the test results summary file",
                ),
                expect.any(Error),
            );
        } finally {
            // Clean up
            if (fs.existsSync(invalidJsonPath)) {
                fs.unlinkSync(invalidJsonPath);
            }
            consoleSpy.mockRestore();
        }
    });

    it("should handle file deletion errors gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Get the mocked function
        const mockedUnlinkSync = jest.mocked(fs.unlinkSync);

        // Set up the mock to throw an error for this test
        mockedUnlinkSync.mockImplementationOnce(() => {
            throw new Error("Permission denied - cannot delete file");
        });

        // Set up environment variables
        process.env.RUNNER_TEMP = path.join(__dirname, "..");
        process.env.GITHUB_RUN_ID = "123";
        process.env.GITHUB_ACTION = "run-tests";

        // Create a valid JSON file
        const validJsonPath = path.join(process.env.RUNNER_TEMP, "matlabTestResults_123_run-tests.json");
        fs.writeFileSync(validJsonPath, "[]"); // Empty array - valid JSON

        try {
            const result = testResultsSummary.getTestResults(process.env.RUNNER_TEMP, process.env.GITHUB_RUN_ID, process.env.GITHUB_ACTION, "");

            // Should still return results even if deletion fails
            expect(result).toBeDefined();
            expect(result.TestResults).toEqual([]);

            // Verify deletion error was logged
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "An error occurred while trying to delete the test results summary file",
                ),
                expect.any(Error),
            );

            // Verify unlinkSync was called
            expect(mockedUnlinkSync).toHaveBeenCalledWith(validJsonPath);
        } finally {
            // Clean up
            mockedUnlinkSync.mockRestore();
            consoleSpy.mockRestore();

            // Clean up the test file (use the real fs function)
            const realFs = jest.requireActual("fs");
            try {
                realFs.unlinkSync(validJsonPath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });
});
