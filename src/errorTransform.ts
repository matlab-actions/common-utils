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
    const cleaned = stripControlChars(output);

    const syntaxResult = transformSyntaxError(cleaned, command, prefixLength);
    if (syntaxResult !== undefined) {
        return syntaxResult;
    }

    const runtimeResult = transformRuntimeError(cleaned, command, prefixLength);
    if (runtimeResult !== undefined) {
        return runtimeResult;
    }

    return output;
}

function stripControlChars(s: string): string {
    // MATLAB wraps errors in {^H ... }^H (curly brace + backspace)
    // eslint-disable-next-line no-control-regex
    return s
        .replace(/[{}]\x08/g, "")
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .trim();
}

// Matches MATLAB syntax error formats:
//   Multi-line:  Error: File:\n<path>.m\nLine: 1 Column: N\n<message>
//   Single-line: File: <path>.m Line: 1 Column: N\n<message>
const SYNTAX_ERROR_PATTERN = /File:\s*\n?.*\.m\s*\n?\s*Line: 1 Column: (\d+)\n(.+)/;

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

// Matches the runtime error format:
//   <message>
//
//   Error in <scriptname> (line 1)
//   <full source line>
//   <carets>
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
