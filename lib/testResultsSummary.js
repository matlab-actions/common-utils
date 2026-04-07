// Copyright 2025-26 The MathWorks, Inc.
import { readFileSync, unlinkSync, existsSync } from "fs";
import * as path from "path";
import * as core from "@actions/core";
import { getCoverageResults, getCoverageTable } from "./codeCoverageSummary.js";
export var MatlabTestStatus;
(function (MatlabTestStatus) {
    MatlabTestStatus["PASSED"] = "PASSED";
    MatlabTestStatus["FAILED"] = "FAILED";
    MatlabTestStatus["INCOMPLETE"] = "INCOMPLETE";
    MatlabTestStatus["NOT_RUN"] = "NOT_RUN";
})(MatlabTestStatus || (MatlabTestStatus = {}));
export function processAndAddTestSummary(runnerTemp, runId, actionName, workspace) {
    const testResultsData = getTestResults(runnerTemp, runId, workspace);
    const coverageResultsData = getCoverageResults(runnerTemp, runId);
    if (testResultsData || coverageResultsData) {
        addSummary(testResultsData, coverageResultsData, actionName);
    }
}
export function getTestResults(runnerTemp, runId, workspace) {
    let testResultsData = null;
    const resultsPath = path.join(runnerTemp, `matlabTestResults${runId}.json`);
    if (existsSync(resultsPath)) {
        try {
            const testArtifact = JSON.parse(readFileSync(resultsPath, "utf8"));
            const testResults = [];
            const stats = {
                Total: 0,
                Passed: 0,
                Failed: 0,
                Incomplete: 0,
                NotRun: 0,
                Duration: 0,
            };
            testResultsData = {
                TestResults: testResults,
                Stats: stats,
            };
            for (const jsonTestSessionResults of testArtifact) {
                const testSessionResults = [];
                const map = new Map();
                const testCases = Array.isArray(jsonTestSessionResults)
                    ? jsonTestSessionResults
                    : [jsonTestSessionResults];
                for (const jsonTestCase of testCases) {
                    processTestCase(testSessionResults, jsonTestCase, map, stats, workspace);
                }
                testResults.push(testSessionResults);
            }
        }
        catch (e) {
            console.error(`An error occurred while reading the test results summary file ${resultsPath}:`, e);
        }
        finally {
            try {
                unlinkSync(resultsPath);
            }
            catch (e) {
                console.error(`An error occurred while trying to delete the test results summary file ${resultsPath}:`, e);
            }
        }
    }
    return testResultsData;
}
export function addSummary(testResultsData, coverageResultsData, actionName) {
    try {
        // Add test results table if available
        if (testResultsData) {
            const helpLink = `<a href="https://github.com/matlab-actions/run-tests/blob/main/README.md#view-test-results"` +
                ` target="_blank" title="View documentation">ℹ️</a>`;
            const header = getTestHeader(testResultsData.Stats);
            core.summary
                .addHeading("MATLAB Test Results (" + actionName + ") " + helpLink)
                .addRaw(header, true);
        }
        // Add coverage table if available
        if (coverageResultsData) {
            core.summary
                .addHeading("MATLAB Code Coverage", 3)
                .addRaw(getCoverageTable(coverageResultsData), true);
        }
        // Add detailed test results
        if (testResultsData) {
            const detailedResults = getDetailedResults(testResultsData.TestResults);
            core.summary
                .addHeading("All tests", 3)
                .addRaw(detailedResults, true);
        }
    }
    catch (e) {
        console.error("An error occurred while adding the test results to the summary:", e);
    }
}
export function getTestHeader(stats) {
    return (`<table>
            <tr align="center">
                <th>Total tests</th>
                <th>Passed ` + getStatusEmoji(MatlabTestStatus.PASSED) + `</th>
                <th>Failed ` + getStatusEmoji(MatlabTestStatus.FAILED) + `</th>
                <th>Incomplete ` + getStatusEmoji(MatlabTestStatus.INCOMPLETE) + `</th>
                <th>Not Run ` + getStatusEmoji(MatlabTestStatus.NOT_RUN) + `</th>
                <th>Duration(s) ⌛</th>
            </tr>
            <tr align="center">
                <td>` + stats.Total + `</td>
                <td>` + stats.Passed + `</td>
                <td>` + stats.Failed + `</td>
                <td>` + stats.Incomplete + `</td>
                <td>` + stats.NotRun + `</td>
                <td>` + stats.Duration.toFixed(2) + `</td>
            </tr>
        </table>`);
}
export function getDetailedResults(testResults) {
    return (`<table>
            <tr>
                <th>Test File</th>
                <th>Duration(s)</th>
            </tr>` +
        testResults
            .flat()
            .map((file) => generateTestFileRow(file))
            .join("") +
        `</table>`);
}
function generateTestFileRow(file) {
    const statusEmoji = getStatusEmoji(file.Status);
    // Always use a linux-style path for display
    const displayPath = file.Path.replace(/\\/g, "/");
    return (`<tr>
            <td>
                <details` + (file.Status !== MatlabTestStatus.PASSED ? ` open` : ``) + `>
                    <summary>
                        <b title="` + displayPath + `">` +
        statusEmoji + ` ` + file.Name +
        `</b>
                    </summary>
                    <br>
                    <table>
                        <tr>
                            <th>Test</th>
                            <th>Diagnostics</th>
                            <th>Duration(s)</th>
                        </tr>` +
        file.TestCases.map((tc) => generateTestCaseRow(tc)).join("") +
        `</table>
                </details>
            </td>
            <td align="center" valign="top">` +
        `<b>` +
        file.Duration.toFixed(2) +
        `</b>` +
        `</td>
        </tr>`);
}
function generateTestCaseRow(testCase) {
    const statusEmoji = getStatusEmoji(testCase.Status);
    const diagnosticsColumn = testCase.Diagnostics.length > 0
        ? testCase.Diagnostics
            .map((diagnostic) => `<details>` +
            `<summary>` +
            diagnostic.Event +
            `</summary>` +
            `<pre style="font-family: monospace; white-space: pre;">` +
            diagnostic.Report.replace(/\n/g, "<br>").trim() +
            `</pre>` +
            `</details>`)
            .join("")
        : "";
    return (`<tr>` +
        `<td>` + statusEmoji + ` ` + testCase.Name + `</td>` +
        `<td>` + diagnosticsColumn + `</td>` +
        `<td align="center">` + testCase.Duration.toFixed(2) + `</td>` +
        `</tr>`);
}
export function getStatusEmoji(status) {
    switch (status) {
        case MatlabTestStatus.PASSED:
            return "✅";
        case MatlabTestStatus.FAILED:
            return "❌";
        case MatlabTestStatus.INCOMPLETE:
            return "⚠️";
        case MatlabTestStatus.NOT_RUN:
            return "🚫";
    }
}
function processTestCase(testSessionResults, jsonTestCase, map, stats, workspace) {
    const baseFolder = jsonTestCase.BaseFolder;
    const testResult = jsonTestCase.TestResult;
    const [testFileName, testCaseName] = testResult.Name.split("/");
    const filePath = path.join(baseFolder, testFileName);
    let testFile = map.get(filePath);
    if (!testFile) {
        testFile = {
            Name: testFileName,
            Path: "",
            TestCases: [],
            Duration: 0,
            Status: MatlabTestStatus.NOT_RUN,
        };
        map.set(filePath, testFile);
        testSessionResults.push(testFile);
    }
    testFile.Path = path.join(path.relative(workspace, baseFolder), testFileName);
    const testCase = {
        Name: testCaseName,
        Duration: Number(testResult.Duration.toFixed(2)),
        Status: determineTestStatus(testResult),
        Diagnostics: processDiagnostics(testResult.Details.DiagnosticRecord),
    };
    testFile.TestCases.push(testCase);
    incrementDuration(testFile, testCase.Duration);
    updateFileStatus(testFile, testCase);
    updateStats(testCase, stats);
}
function determineTestStatus(testResult) {
    switch (true) {
        case testResult.Failed:
            return MatlabTestStatus.FAILED;
        case testResult.Incomplete:
            return MatlabTestStatus.INCOMPLETE;
        case testResult.Passed:
            return MatlabTestStatus.PASSED;
        default:
            return MatlabTestStatus.NOT_RUN;
    }
}
function processDiagnostics(diagnostics) {
    if (!diagnostics)
        return [];
    return Array.isArray(diagnostics) ? diagnostics : [diagnostics];
}
function incrementDuration(testFile, testCaseDuration) {
    testFile.Duration = (testFile.Duration || 0) + testCaseDuration;
}
function updateFileStatus(testFile, testCase) {
    if (testFile.Status !== MatlabTestStatus.FAILED) {
        if (testCase.Status === MatlabTestStatus.FAILED) {
            testFile.Status = MatlabTestStatus.FAILED;
        }
        else if (testFile.Status !== MatlabTestStatus.INCOMPLETE) {
            if (testCase.Status === MatlabTestStatus.INCOMPLETE) {
                testFile.Status = MatlabTestStatus.INCOMPLETE;
            }
            else if (testCase.Status === MatlabTestStatus.PASSED) {
                testFile.Status = MatlabTestStatus.PASSED;
            }
        }
    }
}
function updateStats(testCase, stats) {
    stats.Total++;
    switch (testCase.Status) {
        case "PASSED":
            stats.Passed++;
            break;
        case "FAILED":
            stats.Failed++;
            break;
        case "INCOMPLETE":
            stats.Incomplete++;
            break;
        case "NOT_RUN":
            stats.NotRun++;
            break;
    }
    stats.Duration += testCase.Duration;
}
//# sourceMappingURL=testResultsSummary.js.map