// Copyright 2026 The MathWorks, Inc.

import * as script from "./script.js";

/**
 * Transform MATLAB error output to show positions relative to the user's
 * original command rather than the generated temporary script.
 *
 * @param output Raw MATLAB error output
 * @param command The user's original command string
 * @returns Transformed error output
 */
export function transformError(output: string, command: string): string {
    const prefixLength = script.prefix().length;

    const syntaxResult = transformSyntaxError(output, command, prefixLength);
    if (syntaxResult !== undefined) {
        return syntaxResult;
    }

    const runtimeResult = transformRuntimeError(output, command, prefixLength);
    if (runtimeResult !== undefined) {
        return runtimeResult;
    }

    return output;
}

const SYNTAX_ERROR_PATTERN = /File: .+ Line: 1 Column: (\d+)\n(.+)/;

function transformSyntaxError(
    output: string,
    command: string,
    prefixLength: number,
): string | undefined {
    const match = output.match(SYNTAX_ERROR_PATTERN);
    if (!match) {
        return undefined;
    }

    const column = parseInt(match[1], 10);
    const message = match[2];
    const adjustedColumn = column - prefixLength;

    if (adjustedColumn < 1 || adjustedColumn > command.length + 1) {
        return undefined;
    }

    const caret = " ".repeat(adjustedColumn - 1) + "^";
    return `${message}\n\n${command}\n${caret}`;
}

const RUNTIME_ERROR_PATTERN = /^([\s\S]*?)Error in .+ \(line 1\)\n(.+)\n(\s*\^+\s*)$/m;

function transformRuntimeError(
    output: string,
    command: string,
    prefixLength: number,
): string | undefined {
    const match = output.match(RUNTIME_ERROR_PATTERN);
    if (!match) {
        return undefined;
    }

    const message = match[1].trim();
    const caretLine = match[3];

    const caretStart = caretLine.indexOf("^");
    const adjustedStart = caretStart - prefixLength;

    if (adjustedStart < 0) {
        return undefined;
    }

    const caretCount = (caretLine.match(/\^+/) || ["^"])[0].length;
    const adjustedCaret = " ".repeat(adjustedStart) + "^".repeat(caretCount);

    return `${message}\n\n${command}\n${adjustedCaret}`;
}
