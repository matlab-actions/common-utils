// Copyright 2024-26 The MathWorks, Inc.

import { jest, describe, it, expect, beforeEach } from "@jest/globals";

jest.unstable_mockModule('@actions/core', () => ({
    summary: {
        addTable: jest.fn().mockReturnThis(),
        addHeading: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
    },
}));

const core = await import("@actions/core");
const buildSummary = await import("./buildSummary.js");

beforeEach(() => {
    (core.summary.addTable as jest.Mock).mockReturnThis();
    (core.summary.addHeading as jest.Mock).mockReturnThis();
    (core.summary.write as jest.Mock).mockReturnThis();
});

describe('summaryGeneration', () => {
    it('should process and return summary rows for valid JSON with different task statuses', () => {
        const mockBuildSummary = JSON.stringify([
            { name: 'Task 1', failed: true, skipped: false, description: 'Task 1 description', duration: '00:00:10' },
            { name: 'Task 2', failed: false, skipped: true, skipReason: 'UserSpecified', description: 'Task 2 description', duration: '00:00:20' },
            { name: 'Task 3', failed: false, skipped: true, skipReason: 'DependencyFailed', description: 'Task 3 description', duration: '00:00:20' },
            { name: 'Task 4', failed: false, skipped: true, skipReason: 'UpToDate', description: 'Task 4 description', duration: '00:00:20' },
            { name: 'Task 5', failed: false, skipped: false, description: 'Task 5 description', duration: '00:00:30' }
        ]);

        const result = buildSummary.getSummaryRows(mockBuildSummary);

        expect(result).toEqual([
            ['Task 1', '🔴 Failed', 'Task 1 description', '00:00:10'],
            ['Task 2', '🔵 Skipped (user requested)', 'Task 2 description', '00:00:20'],
            ['Task 3', '🔵 Skipped (dependency failed)', 'Task 3 description', '00:00:20'],
            ['Task 4', '🔵 Skipped (up-to-date)', 'Task 4 description', '00:00:20'],
            ['Task 5', '🟢 Successful', 'Task 5 description', '00:00:30']
        ]);
    });

    it('writes the summary correctly', () => {
        const mockTableRows = [
            ['MATLAB Task', 'Status', 'Description', 'Duration (HH:mm:ss)'],
            ['Test Task', '🔴 Failed', 'A test task', '00:00:10'],
        ];
        const actionName = 'run-build';

        buildSummary.addSummary(mockTableRows, actionName);

        expect(core.summary.addHeading).toHaveBeenCalledTimes(1);
        expect(core.summary.addHeading).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining("MATLAB Build Results (" + actionName + ")"),
        );
        expect(core.summary.addTable).toHaveBeenCalledTimes(1);
        expect(core.summary.addTable).toHaveBeenCalledWith(mockTableRows);
    });
});
