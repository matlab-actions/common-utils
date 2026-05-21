/**
 * Transform MATLAB error output to show positions relative to the user's
 * original command rather than the generated temporary script.
 *
 * @param output Raw MATLAB error output
 * @param command The user's original command string
 * @returns Transformed error output
 */
export declare function transformError(output: string, command: string): string;
