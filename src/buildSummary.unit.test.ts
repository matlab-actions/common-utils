// Copyright 2024-26 The MathWorks, Inc.

import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import * as path from "path";
import * as nodeFs from "fs";

jest.unstable_mockModule("@actions/core", () => ({
    summary: {
        addTable: jest.fn().mockReturnThis(),
        addHeading: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
    },
}));

// Mock fs, passing through real implementations except unlinkSync
const mockUnlinkSync = jest.fn();
jest.unstable_mockModule("fs", () => ({
    readFileSync: nodeFs.readFileSync,
    existsSync: nodeFs.existsSync,
    writeFileSync: nodeFs.writeFileSync,
    readdirSync: nodeFs.readdirSync,
    unlinkSync: mockUnlinkSync,
}));

const core = await import("@actions/core");
const fs = await import("fs");
const buildSummary = await import("./buildSummary.js");

const runnerTemp = path.join(import.meta.dirname, "..");

function safeDelete(filePath: string) {
    try {
        nodeFs.unlinkSync(filePath);
    } catch (e) {
        /* ignore */
    }
}

const validBuildData = JSON.stringify([
    {
        name: "compile",
        failed: false,
        skipped: false,
        description: "Compile source",
        duration: "00:00:10",
    },
    {
        name: "test",
        failed: true,
        skipped: false,
        description: "Run tests",
        duration: "00:00:25",
    },
]);

beforeEach(() => {
    (core.summary.addTable as jest.Mock).mockClear();
    (core.summary.addHeading as jest.Mock).mockClear();
    (core.summary.write as jest.Mock).mockClear();
    mockUnlinkSync.mockReset();
});

describe("getSummaryRows", () => {
    it("should return correct rows for different task statuses", () => {
        const mockBuildSummary = JSON.stringify([
            {
                name: "Task 1",
                failed: true,
                skipped: false,
                description: "Task 1 description",
                duration: "00:00:10",
            },
            {
                name: "Task 2",
                failed: false,
                skipped: true,
                skipReason: "UserSpecified",
                description: "Task 2 description",
                duration: "00:00:20",
            },
            {
                name: "Task 3",
                failed: false,
                skipped: true,
                skipReason: "DependencyFailed",
                description: "Task 3 description",
                duration: "00:00:20",
            },
            {
                name: "Task 4",
                failed: false,
                skipped: true,
                skipReason: "UpToDate",
                description: "Task 4 description",
                duration: "00:00:20",
            },
            {
                name: "Task 5",
                failed: false,
                skipped: false,
                description: "Task 5 description",
                duration: "00:00:30",
            },
        ]);

        const result = buildSummary.getSummaryRows(mockBuildSummary);

        expect(result).toEqual([
            ["Task 1", "🔴 Failed", "Task 1 description", "00:00:10"],
            ["Task 2", "🔵 Skipped (user requested)", "Task 2 description", "00:00:20"],
            ["Task 3", "🔵 Skipped (dependency failed)", "Task 3 description", "00:00:20"],
            ["Task 4", "🔵 Skipped (up-to-date)", "Task 4 description", "00:00:20"],
            ["Task 5", "🟢 Successful", "Task 5 description", "00:00:30"],
        ]);
    });

    it("should return empty array for empty JSON array", () => {
        const result = buildSummary.getSummaryRows("[]");
        expect(result).toEqual([]);
    });
});

describe("processAndAddBuildSummary", () => {
    it("should discover and process files matching the actionName", () => {
        const filePath = path.join(runnerTemp, "buildSummarymy-action_20260509_100000_001.json");
        fs.writeFileSync(filePath, validBuildData);

        try {
            buildSummary.processAndAddBuildSummary(runnerTemp, "my-action");

            expect(core.summary.addHeading).toHaveBeenCalledWith("MATLAB Build Results");
            expect(core.summary.addTable).toHaveBeenCalledTimes(1);

            const tableArg = (core.summary.addTable as jest.Mock).mock.calls[0][0] as any[][];
            expect(tableArg[1]).toEqual(["compile", "🟢 Successful", "Compile source", "00:00:10"]);
            expect(tableArg[2]).toEqual(["test", "🔴 Failed", "Run tests", "00:00:25"]);
        } finally {
            safeDelete(filePath);
        }
    });

    it("should ignore files for a different actionName", () => {
        const matchingFile = path.join(
            runnerTemp,
            "buildSummarymy-action_20260509_100000_001.json",
        );
        const nonMatchingFile = path.join(
            runnerTemp,
            "buildSummaryother-action_20260509_100000_001.json",
        );
        fs.writeFileSync(matchingFile, validBuildData);
        fs.writeFileSync(nonMatchingFile, validBuildData);

        try {
            buildSummary.processAndAddBuildSummary(runnerTemp, "my-action");

            expect(core.summary.addTable).toHaveBeenCalledTimes(1);
            expect(mockUnlinkSync).toHaveBeenCalledWith(matchingFile);
            expect(mockUnlinkSync).not.toHaveBeenCalledWith(nonMatchingFile);
        } finally {
            safeDelete(matchingFile);
            safeDelete(nonMatchingFile);
        }
    });

    it("should not add summary when no matching files exist", () => {
        buildSummary.processAndAddBuildSummary(runnerTemp, "nonexistent-action");

        expect(core.summary.addHeading).not.toHaveBeenCalled();
        expect(core.summary.addTable).not.toHaveBeenCalled();
    });

    it("should handle non-existent directory gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        buildSummary.processAndAddBuildSummary("/nonexistent/directory/path", "my-action");

        expect(core.summary.addTable).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls[0][0] as string).toContain(
            "An error occurred while finding build summary file(s) in directory",
        );
        consoleSpy.mockRestore();
    });

    it("should handle invalid JSON gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const filePath = path.join(runnerTemp, "buildSummarymy-action_20260509_100000_002.json");
        fs.writeFileSync(filePath, "{ invalid json");

        try {
            buildSummary.processAndAddBuildSummary(runnerTemp, "my-action");

            expect(core.summary.addTable).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                "An error occurred while reading the build summary file:",
                expect.any(Error),
            );
        } finally {
            safeDelete(filePath);
            consoleSpy.mockRestore();
        }
    });

    it("should delete files after processing", () => {
        const filePath = path.join(runnerTemp, "buildSummarymy-action_20260509_100000_003.json");
        fs.writeFileSync(filePath, validBuildData);

        try {
            buildSummary.processAndAddBuildSummary(runnerTemp, "my-action");

            expect(mockUnlinkSync).toHaveBeenCalledWith(filePath);
        } finally {
            safeDelete(filePath);
        }
    });

    it("should handle file deletion errors gracefully", () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        mockUnlinkSync.mockImplementationOnce(() => {
            throw new Error("Permission denied");
        });

        const filePath = path.join(runnerTemp, "buildSummarymy-action_20260509_100000_004.json");
        fs.writeFileSync(filePath, validBuildData);

        try {
            buildSummary.processAndAddBuildSummary(runnerTemp, "my-action");

            expect(core.summary.addTable).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "An error occurred while trying to delete the build summary file",
                ),
                expect.any(Error),
            );
        } finally {
            mockUnlinkSync.mockReset();
            safeDelete(filePath);
            consoleSpy.mockRestore();
        }
    });

    it("should process multiple build summary files", () => {
        const file1 = path.join(runnerTemp, "buildSummarymy-action_20260509_100000_005.json");
        const file2 = path.join(runnerTemp, "buildSummarymy-action_20260509_100000_006.json");
        fs.writeFileSync(file1, validBuildData);
        fs.writeFileSync(file2, validBuildData);

        try {
            buildSummary.processAndAddBuildSummary(runnerTemp, "my-action");

            expect(core.summary.addHeading).toHaveBeenCalledTimes(2);
            expect(core.summary.addTable).toHaveBeenCalledTimes(2);
            expect(mockUnlinkSync).toHaveBeenCalledWith(file1);
            expect(mockUnlinkSync).toHaveBeenCalledWith(file2);
        } finally {
            safeDelete(file1);
            safeDelete(file2);
        }
    });
});
