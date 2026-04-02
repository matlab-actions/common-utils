// Copyright 2026 The MathWorks, Inc.
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as path from "path";
import { JSDOM } from "jsdom";

// Mock fs
const mockUnlinkSync = jest.fn();
jest.unstable_mockModule("fs", () => ({
    readFileSync: jest.fn(),
    existsSync: jest.fn(),
    unlinkSync: mockUnlinkSync,
}));

// Dynamic imports after mocking
const fs = await import("fs");
const codeCoverageSummary = await import("./codeCoverageSummary.js");

describe("Coverage Data Retrieval Tests", () => {
    const runnerTemp = "/tmp/runner";
    const runId = "test-run-123";
    let consoleSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
        jest.clearAllMocks();
        consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it("should return null when coverage file does not exist", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = codeCoverageSummary.getCoverageData(runnerTemp, runId);

        expect(result).toBeNull();
        expect(fs.existsSync).toHaveBeenCalledWith(
            path.join(runnerTemp, `matlabCoverageResults${runId}.json`)
        );
        expect(mockUnlinkSync).not.toHaveBeenCalled();
    });

    it("should return coverage data when file exists with valid data", () => {
        const mockCoverageData = [
            {
                MetricLevel: "statement",
                StatementCoverage: {
                    Executed: 80,
                    Total: 100,
                    Percentage: 80.0
                },
                FunctionCoverage: {
                    Executed: 15,
                    Total: 20,
                    Percentage: 75.0
                }
            }
        ];

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCoverageData));

        const result = codeCoverageSummary.getCoverageData(runnerTemp, runId);

        expect(result).toEqual(mockCoverageData[0]);
        expect(fs.readFileSync).toHaveBeenCalledWith(
            path.join(runnerTemp, `matlabCoverageResults${runId}.json`),
            "utf8"
        );
        expect(mockUnlinkSync).toHaveBeenCalledWith(
            path.join(runnerTemp, `matlabCoverageResults${runId}.json`)
        );
    });

    it("should return the last element when multiple coverage data entries exist", () => {
        const mockCoverageData = [
            {
                MetricLevel: "statement",
                StatementCoverage: {
                    Executed: 70,
                    Total: 100,
                    Percentage: 70.0
                }
            },
            {
                MetricLevel: "decision",
                DecisionCoverage: {
                    Executed: 90,
                    Total: 100,
                    Percentage: 90.0
                }
            }
        ];

        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockCoverageData));

        const result = codeCoverageSummary.getCoverageData(runnerTemp, runId);

        expect(result).toEqual(mockCoverageData[1]);
        expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should return null when coverage data array is empty", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([]));

        const result = codeCoverageSummary.getCoverageData(runnerTemp, runId);

        expect(result).toBeNull();
        expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should handle JSON parse errors gracefully", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue("{ invalid json");

        const result = codeCoverageSummary.getCoverageData(runnerTemp, runId);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("An error occurred while reading the code coverage summary file"),
            expect.anything(),
        );
        expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should handle file read errors gracefully", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockImplementation(() => {
            throw new Error("Permission denied");
        });

        const result = codeCoverageSummary.getCoverageData(runnerTemp, runId);

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("An error occurred while reading the code coverage summary file"),
            expect.anything(),
        );
        expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should handle file deletion errors gracefully", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([{
            StatementCoverage: {
                Executed: 80,
                Total: 100,
                Percentage: 80.0
            }
        }]));
        mockUnlinkSync.mockImplementationOnce(() => {
            throw new Error("Permission denied - cannot delete file");
        });

        const result = codeCoverageSummary.getCoverageData(runnerTemp, runId);

        expect(result).toBeDefined();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("An error occurred while trying to delete the code coverage summary file"),
            expect.anything(),
        );
        expect(mockUnlinkSync).toHaveBeenCalled();
    });
});

describe("Coverage Table HTML Generation Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should generate HTML table with all coverage metrics", () => {
        const mockCoverageData = {
            MetricLevel: "all",
            StatementCoverage: {
                Executed: 80,
                Total: 100,
                Percentage: 80.55
            },
            FunctionCoverage: {
                Executed: 15,
                Total: 20,
                Percentage: 75.0
            },
            DecisionCoverage: {
                Executed: 45,
                Total: 50,
                Percentage: 90.0
            },
            ConditionCoverage: {
                Executed: 30,
                Total: 40,
                Percentage: 75.0
            },
            MCDCCoverage: {
                Executed: 20,
                Total: 25,
                Percentage: 80.0
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Verify table exists
        const table = document.querySelector("table");
        expect(table).not.toBeNull();

        // Verify table has 3 rows (header + percentage + covered/total)
        const rows = table?.querySelectorAll("tr");
        expect(rows?.length).toBe(3);

        // Verify header row has 6 columns (Metric + 5 coverage types)
        const headerRow = rows?.[0];
        expect(headerRow?.children.length).toBe(6);
        expect(headerRow?.children[0]?.textContent).toBe("Metric");
        expect(headerRow?.children[1]?.textContent).toBe("Statement");
        expect(headerRow?.children[2]?.textContent).toBe("Function");
        expect(headerRow?.children[3]?.textContent).toBe("Decision");
        expect(headerRow?.children[4]?.textContent).toBe("Condition");
        expect(headerRow?.children[5]?.textContent).toBe("MC/DC");

        // Verify percentage row
        const percentageRow = rows?.[1];
        expect(percentageRow?.children[0]?.textContent).toBe("Percentage");
        expect(percentageRow?.children[1]?.textContent).toBe("80.55%");
        expect(percentageRow?.children[2]?.textContent).toBe("75.00%");
        expect(percentageRow?.children[3]?.textContent).toBe("90.00%");
        expect(percentageRow?.children[4]?.textContent).toBe("75.00%");
        expect(percentageRow?.children[5]?.textContent).toBe("80.00%");

        // Verify covered/total row
        const coveredTotalRow = rows?.[2];
        expect(coveredTotalRow?.children[0]?.textContent).toBe("Covered/Total");
        expect(coveredTotalRow?.children[1]?.textContent).toBe("80/100");
        expect(coveredTotalRow?.children[2]?.textContent).toBe("15/20");
        expect(coveredTotalRow?.children[3]?.textContent).toBe("45/50");
        expect(coveredTotalRow?.children[4]?.textContent).toBe("30/40");
        expect(coveredTotalRow?.children[5]?.textContent).toBe("20/25");
    });

    it("should generate HTML table with only statement coverage", () => {
        const mockCoverageData = {
            MetricLevel: "statement",
            StatementCoverage: {
                Executed: 85,
                Total: 100,
                Percentage: 85.0
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        const dom = new JSDOM(html);
        const document = dom.window.document;

        const table = document.querySelector("table");
        const rows = table?.querySelectorAll("tr");

        // Verify header row has only 2 columns (Metric + Statement)
        const headerRow = rows?.[0];
        expect(headerRow?.children.length).toBe(2);
        expect(headerRow?.children[0]?.textContent).toBe("Metric");
        expect(headerRow?.children[1]?.textContent).toBe("Statement");

        // Verify percentage row
        const percentageRow = rows?.[1];
        expect(percentageRow?.children[1]?.textContent).toBe("85.00%");

        // Verify covered/total row
        const coveredTotalRow = rows?.[2];
        expect(coveredTotalRow?.children[1]?.textContent).toBe("85/100");
    });

    it("should generate HTML table with multiple but not all coverage metrics", () => {
        const mockCoverageData = {
            MetricLevel: "partial",
            StatementCoverage: {
                Executed: 80,
                Total: 100,
                Percentage: 80.0
            },
            DecisionCoverage: {
                Executed: 45,
                Total: 50,
                Percentage: 90.0
            },
            MCDCCoverage: {
                Executed: 20,
                Total: 25,
                Percentage: 80.0
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        const dom = new JSDOM(html);
        const document = dom.window.document;

        const table = document.querySelector("table");
        const rows = table?.querySelectorAll("tr");

        // Verify header row has 4 columns (Metric + 3 coverage types)
        const headerRow = rows?.[0];
        expect(headerRow?.children.length).toBe(4);
        expect(headerRow?.children[0]?.textContent).toBe("Metric");
        expect(headerRow?.children[1]?.textContent).toBe("Statement");
        expect(headerRow?.children[2]?.textContent).toBe("Decision");
        expect(headerRow?.children[3]?.textContent).toBe("MC/DC");

        // Verify Function and Condition are not included
        expect(html).not.toContain("Function");
        expect(html).not.toContain("Condition");
    });

    it("should handle zero percentage correctly", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 0,
                Total: 100,
                Percentage: 0
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        expect(html).toContain("0.00%");
    });

    it("should handle 100 percentage correctly", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 100,
                Total: 100,
                Percentage: 100
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        expect(html).toContain("100.00%");
    });

    it("should format percentages to 2 decimal places", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 333,
                Total: 1000,
                Percentage: 33.333333
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        expect(html).toContain("33.33%");
    });
});

describe("HTML Structure and Alignment Tests", () => {
    it("should have proper alignment attributes in HTML", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 80,
                Total: 100,
                Percentage: 80.0
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        const dom = new JSDOM(html);
        const document = dom.window.document;

        const rows = document.querySelectorAll("tr");
        rows.forEach(row => {
            expect(row.getAttribute("align")).toBe("center");
        });
    });

    it("should generate valid HTML that can be parsed", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 80,
                Total: 100,
                Percentage: 80.0
            },
            FunctionCoverage: {
                Executed: 15,
                Total: 20,
                Percentage: 75.0
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        // Should not throw when parsing
        expect(() => {
            new JSDOM(html);
        }).not.toThrow();
    });
});

describe("Edge Cases and Special Values", () => {
    it("should handle NaN percentage values", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 0,
                Total: 0,
                Percentage: NaN
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        expect(html).toContain("0.00%");
    });

    it("should handle undefined percentage values", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 0,
                Total: 0,
                Percentage: undefined as any
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        expect(html).toContain("0.00%");
    });

    it("should handle null percentage values", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 0,
                Total: 0,
                Percentage: null as any
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        expect(html).toContain("0.00%");
    });

    it("should handle very large numbers", () => {
        const mockCoverageData = {
            StatementCoverage: {
                Executed: 999999,
                Total: 1000000,
                Percentage: 99.9999
            }
        };

        const html = codeCoverageSummary.generateCoverageTableHTML(mockCoverageData);

        expect(html).toContain("100.00%");
        expect(html).toContain("999999/1000000");
    });
});
