// Copyright 2024-26 The MathWorks, Inc.
import * as core from "@actions/core";
import { join } from "path";
import { readFileSync, unlinkSync, readdirSync } from "fs";
export function addSummary(taskSummaryTableRows) {
    try {
        core.summary.addHeading("MATLAB Build Results").addTable(taskSummaryTableRows);
    }
    catch (e) {
        console.error("An error occurred while adding the build results table to the summary:", e);
    }
}
export function getSummaryRows(buildSummary) {
    const rows = JSON.parse(buildSummary).map((t) => {
        if (t.failed) {
            return [t.name, "🔴 Failed", t.description, t.duration];
        }
        else if (t.skipped) {
            return [
                t.name,
                "🔵 Skipped" + " (" + interpretSkipReason(t.skipReason) + ")",
                t.description,
                t.duration,
            ];
        }
        else {
            return [t.name, "🟢 Successful", t.description, t.duration];
        }
    });
    return rows;
}
export function interpretSkipReason(skipReason) {
    switch (skipReason) {
        case "UpToDate":
            return "up-to-date";
        case "UserSpecified":
        case "UserRequested":
            return "user requested";
        case "DependencyFailed":
            return "dependency failed";
        default:
            return skipReason;
    }
}
export function processAndAddBuildSummary(runnerTemp, actionName) {
    const filePrefix = `buildSummary${actionName}_`;
    const fileSuffix = `.json`;
    let buildSummaryFiles = [];
    try {
        buildSummaryFiles = readdirSync(runnerTemp)
            .filter((file) => file.startsWith(filePrefix) && file.endsWith(fileSuffix))
            .sort();
    }
    catch (e) {
        console.error(`An error occurred while finding build summary file(s) in directory ${runnerTemp}:`, e);
        return;
    }
    if (buildSummaryFiles.length === 0) {
        return;
    }
    const header = [
        { data: "MATLAB Task", header: true },
        { data: "Status", header: true },
        { data: "Description", header: true },
        { data: "Duration (HH:mm:ss)", header: true },
    ];
    for (const fileName of buildSummaryFiles) {
        const filePath = join(runnerTemp, fileName);
        try {
            const buildSummary = readFileSync(filePath, { encoding: "utf8" });
            const rows = getSummaryRows(buildSummary);
            const taskSummaryTable = [header, ...rows];
            addSummary(taskSummaryTable);
        }
        catch (e) {
            console.error("An error occurred while reading the build summary file:", e);
        }
        finally {
            try {
                unlinkSync(filePath);
            }
            catch (e) {
                console.error(`An error occurred while trying to delete the build summary file ${filePath}:`, e);
            }
        }
    }
}
//# sourceMappingURL=buildSummary.js.map