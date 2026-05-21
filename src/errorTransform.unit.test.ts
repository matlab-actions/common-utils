// Copyright 2026 The MathWorks, Inc.

import { describe, it, expect } from "@jest/globals";
import * as errorTransform from "./errorTransform.js";
import * as script from "./script.js";

describe("transformError", () => {
    const prefixLength = script.prefix().length;

    describe("syntax errors", () => {
        it("transforms a multi-line syntax error from CI", () => {
            const command = `addpath(genpath("hedcode")), addpath(genpath("tests"), runAllTests`;
            const column = prefixLength + command.length;
            const input =
                `Error: File:\n` +
                `/tmp/run_matlab_command-kXkVWm/command_07231c7a_a4c6_4a77_8efc_bbf0889c5c68.m\n` +
                `Line: 1 Column: ${column}\n` +
                `This statement is incomplete.`;

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(
                `This statement is incomplete.\n` +
                    `\n` +
                    `${command}\n` +
                    `${" ".repeat(command.length - 1)}^`,
            );
        });

        it("transforms a single-line syntax error format", () => {
            const command = `disp('hello world'`;
            const column = prefixLength + command.length + 1;
            const input =
                `Error: File: command_abc123.m Line: 1 Column: ${column}\n` +
                `Unexpected end of line. Check for missing ')'.`;

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(
                `Unexpected end of line. Check for missing ')'.\n` +
                    `\n` +
                    `disp('hello world'\n` +
                    `${" ".repeat(command.length)}^`,
            );
        });

        it("handles MATLAB control character delimiters", () => {
            const command = `addpath(genpath("hedcode")), addpath(genpath("tests"), runAllTests`;
            const column = prefixLength + command.length;
            const input =
                `{\x08Error: File:\n` +
                `/tmp/run_matlab_command-kXkVWm/command_07231c7a.m\n` +
                `Line: 1 Column: ${column}\n` +
                `This statement is incomplete.\n` +
                `}\x08 `;

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(
                `This statement is incomplete.\n` +
                    `\n` +
                    `${command}\n` +
                    `${" ".repeat(command.length - 1)}^`,
            );
        });

        it("does not transform syntax errors on lines other than 1", () => {
            const command = "disp('hello')";
            const input =
                `Error: File:\n` + `/tmp/command.m\n` + `Line: 5 Column: 10\n` + `Some error.`;

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(input);
        });

        it("does not transform when adjusted column is out of range", () => {
            const command = "x";
            const column = prefixLength + 100;
            const input =
                `Error: File:\n` +
                `/tmp/command.m\n` +
                `Line: 1 Column: ${column}\n` +
                `Some error.`;

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(input);
        });
    });

    describe("runtime errors", () => {
        it("transforms a runtime error with adjusted caret", () => {
            const command = `x = [1,2,3]; disp(x(5))`;
            const caretStart = prefixLength + 19;
            const sourceLine = script.prefix() + command;
            const caretLine = " ".repeat(caretStart) + "^^^^";
            const input =
                `Index exceeds the number of array elements. Index must not exceed 3.\n\n` +
                `Error in command_abc123 (line 1)\n` +
                `${sourceLine}\n` +
                `${caretLine}`;

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(
                `Index exceeds the number of array elements. Index must not exceed 3.\n` +
                    `\n` +
                    `${command}\n` +
                    `${" ".repeat(19)}^^^^`,
            );
        });

        it("does not transform runtime errors on lines other than 1", () => {
            const command = "disp('hello')";
            const input =
                `Some error.\n\nError in command_abc (line 5)\n` + `disp('hello')\n` + `^^^^`;

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(input);
        });
    });

    describe("passthrough", () => {
        it("returns unrecognized output unchanged", () => {
            const command = "disp('hi')";
            const input = "Some unrelated output that doesn't match any pattern";

            const result = errorTransform.transformError(input, command);

            expect(result).toBe(input);
        });
    });
});
