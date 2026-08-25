/**
 * Generate MATLAB command for changing directories, adding plugins to path and calling a command in it.
 *
 * @param dir Directory to change to.
 * @param command Command to run in directory.
 * @returns MATLAB command.
 */
export declare function prepare(command: string): string;
/**
 * Convert a path-like string to MATLAB character vector literal.
 *
 * @param s Input string.
 * @returns Input string in MATLAB character vector literal.
 */
export declare function pathToCharVec(s: string): string;
/**
 * Convert an identifier (i.e., a script name) to one that is callable by MATLAB.
 *
 * @param s Input identifier.
 */
export declare function safeName(s: string): string;
