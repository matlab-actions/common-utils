// Copyright 2020-2025 The MathWorks, Inc.

import * as path from "path";

/**
 * Generate MATLAB command for changing directories, adding plugins to path and calling a command in it.
 *
 * @param dir Directory to change to.
 * @param command Command to run in directory.
 * @returns MATLAB command.
 */
export function prepare(command: string): string {
    const pluginsPath = path.join(__dirname, "plugins").replaceAll("'","''");
    return `cd(getenv('MW_ORIG_WORKING_FOLDER')); ` +
        `addpath('` + pluginsPath + `'); `
        + command;
}

/**
 * Convert a path-like string to MATLAB character vector literal.
 *
 * @param s Input string.
 * @returns Input string in MATLAB character vector literal.
 */
export function pathToCharVec(s: string): string {
    return s.replace(/'/g, "''");
}

/**
 * Convert an identifier (i.e., a script name) to one that is callable by MATLAB.
 *
 * @param s Input identifier.
 */
export function safeName(s: string): string {
    return s.replace(/-/g, "_");
}
