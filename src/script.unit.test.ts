// Copyright 2020-2025 The MathWorks, Inc.

import * as script from "./script";
import * as path from "path";

describe("call generation", () => {
    it("ideally works", () => {
        // I know what your thinking
        const testCommand = "disp('hello world')";
        const pluginsPath = path.join(__dirname, "plugins").replaceAll("'","''");
        const expectedString = `cd(getenv('MW_ORIG_WORKING_FOLDER')); addpath('` + pluginsPath + `'); ${testCommand}`;

        expect(script.prepare(testCommand)).toMatch(expectedString);
    });
});

describe("safe names", () => {
    it("turns dashes into underscores", () => {
        const testString = "__this-is-a-kebab---";
        const expectedString = "__this_is_a_kebab___";

        expect(script.safeName(testString)).toMatch(expectedString);
    });
});

describe("path to character vector", () => {
    it("duplicates single quotes", () => {
        // I know what your thinking
        const testString = String.raw`C:\Users\you\You're Documents`;
        const expectedString = String.raw`C:\Users\you\You''re Documents`;

        expect(script.pathToCharVec(testString)).toMatch(expectedString);
    });
});
