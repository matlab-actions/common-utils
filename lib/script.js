"use strict";
// Copyright 2020-2025 The MathWorks, Inc.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepare = prepare;
exports.pathToCharVec = pathToCharVec;
exports.safeName = safeName;
const path = __importStar(require("path"));
/**
 * Generate MATLAB command for changing directories, adding plugins to path and calling a command in it.
 *
 * @param dir Directory to change to.
 * @param command Command to run in directory.
 * @returns MATLAB command.
 */
function prepare(command) {
    const pluginsPath = path.join(__dirname, "plugins").replaceAll("'", "''");
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
function pathToCharVec(s) {
    return s.replace(/'/g, "''");
}
/**
 * Convert an identifier (i.e., a script name) to one that is callable by MATLAB.
 *
 * @param s Input identifier.
 */
function safeName(s) {
    return s.replace(/-/g, "_");
}
//# sourceMappingURL=script.js.map