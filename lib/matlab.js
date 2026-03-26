// Copyright 2020-2026 The MathWorks, Inc.
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { v4 as uuid } from "uuid";
import * as script from "./script.js";
/**
 * Generate a MATLAB script in the temporary directory that runs a command in
 * the workspace.
 *
 * @param workspaceDir CI job workspace directory
 * @param command MATLAB command to run
 */
export async function generateScript(workspaceDir, command) {
    const scriptName = script.safeName(`command_${uuid()}`);
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "run_matlab_command-"));
    const scriptPath = path.join(temporaryDirectory, scriptName + ".m");
    await fs.writeFile(scriptPath, script.prepare(command), {
        encoding: "utf8",
    });
    return {
        dir: temporaryDirectory,
        command: scriptName
    };
}
/**
 * Run a HelperScript in MATLAB.
 *
 * Create the HelperScript using `generateScript`.
 *
 * @param hs HelperScript pointing to the script containing the command
 * @param platform Operating system of the runner (e.g., "win32" or "linux")
 * @param architecture Architecture of the runner (e.g., "x64")
 * @param fn ExecFn that will execute a command on the runner
 */
export async function runCommand(hs, platform, architecture, fn, args) {
    const rmcPath = getRunMATLABCommandScriptPath(platform, architecture);
    await fs.chmod(rmcPath, 0o777);
    const rmcArg = `setenv('MW_ORIG_WORKING_FOLDER',cd('${script.pathToCharVec(hs.dir)}')); ${hs.command}`;
    let execArgs = [rmcArg];
    if (args) {
        execArgs = execArgs.concat(args);
    }
    const exitCode = await fn(rmcPath, execArgs);
    if (exitCode !== 0) {
        return Promise.reject(Error(`Exited with non-zero code ${exitCode}`));
    }
}
/**
 * Get the path of the script containing RunMATLABCommand for the host OS.
 *
 * @param platform Operating system of the runner (e.g., "win32" or "linux")
 * @param architecture Architecture of the runner (e.g., "x64")
*/
export function getRunMATLABCommandScriptPath(platform, architecture) {
    if (architecture != "x64" && !(platform == "darwin" && architecture == "arm64")) {
        throw new Error(`This action is not supported on ${platform} runners using the ${architecture} architecture.`);
    }
    let ext;
    let platformDir;
    switch (platform) {
        case "win32":
            ext = ".exe";
            platformDir = "win64";
            break;
        case "darwin":
            ext = "";
            if (architecture == "x64") {
                platformDir = "maci64";
            }
            else {
                platformDir = "maca64";
            }
            break;
        case "linux":
            ext = "";
            platformDir = "glnxa64";
            break;
        default:
            throw new Error(`This action is not supported on ${platform} runners using the ${architecture} architecture.`);
    }
    const rmcPath = path.join(import.meta.dirname, "bin", platformDir, `run-matlab-command${ext}`);
    return rmcPath;
}
//# sourceMappingURL=matlab.js.map