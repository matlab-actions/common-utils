// Copyright 2026 The MathWorks, Inc.

import { readFileSync, unlinkSync, existsSync } from "fs";
import * as path from "path";

interface CoverageMetric {
    Executed: number;
    Total: number;
    Percentage: number;
}

export interface CoverageData {
    MetricLevel?: string;
    StatementCoverage?: CoverageMetric;  
    FunctionCoverage?: CoverageMetric;   
    DecisionCoverage?: CoverageMetric;   
    ConditionCoverage?: CoverageMetric;  
    MCDCCoverage?: CoverageMetric;       
}

export function getCoverageData(
    runnerTemp: string,
    runId: string,
): CoverageData | null {
    let coverageData = null;
    const coveragePath = path.join(runnerTemp, `matlabCoverageResults${runId}.json`);
    
    if (existsSync(coveragePath)) {
        try {
            const coverageArray: CoverageData[] = JSON.parse(readFileSync(coveragePath, "utf8"));
            coverageData = coverageArray[coverageArray.length - 1];
        } catch (e) {
            console.error(
                `An error occured while reading the code coverage summary file ${coveragePath}:`,
                e,
            );
        } finally {
            try {
                unlinkSync(coveragePath);
            } catch (e) {
                console.error(
                    `An error occurred while trying to delete the code coverage summary file ${coveragePath}:`,
                    e,
                );
            }
        }
    }
    return coverageData;
}

function formatPercentage(percentage: number): string {
    if (percentage === null || percentage === undefined || isNaN(percentage)) {
        return '0.00%';
    }
    return percentage.toFixed(2) + '%';
}

export function generateCoverageTableHTML(coverage: CoverageData): string {

    // Define all possible columns
    const allColumns = [
        { name: 'Statement', data: coverage.StatementCoverage },
        { name: 'Function', data: coverage.FunctionCoverage },
        { name: 'Decision', data: coverage.DecisionCoverage },
        { name: 'Condition', data: coverage.ConditionCoverage },
        { name: 'MC/DC', data: coverage.MCDCCoverage }
    ];

    // Filter to only include columns where data actually exists
    const visibleColumns = allColumns.filter(col => col.data !== undefined && col.data !== null);

    // Build header row
    const headers = visibleColumns.map(col => `<th>${col.name}</th>`).join('');
    const headerRow = `<tr align="center"><th>Metric</th>${headers}</tr>`;

    // Build percentage row
    const percentages = visibleColumns.map(col => 
        `<td>${formatPercentage(col.data!.Percentage)}</td>`
    ).join('');
    const percentageRow = `<tr align="center"><td><b>Percentage</b></td>${percentages}</tr>`;

    // Build covered/total row
    const coveredTotals = visibleColumns.map(col => 
        `<td>${col.data!.Executed}/${col.data!.Total}</td>`
    ).join('');
    const coveredTotalRow = `<tr align="center"><td><b>Covered/Total</b></td>${coveredTotals}</tr>`;

    const tableHTML = `<table>${headerRow}${percentageRow}${coveredTotalRow}</table>`;
    
    return tableHTML;
}
