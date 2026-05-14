classdef tParallelizableBuildSummaryPlugin < matlab.unittest.TestCase

    % Copyright 2026 The MathWorks, Inc.

    properties
        TempFolder
        Plugin
        Runner
    end

    methods (TestClassSetup)
        function setupPath(testCase)
            import matlab.unittest.fixtures.PathFixture;

            testCase.assumeFalse(isMATLABReleaseOlderThan("R2026a"));
            testCase.applyFixture(PathFixture(fileparts(fileparts(mfilename("fullpath")))));
        end
    end

    methods (TestMethodSetup)
        function createPlugin(testCase)
            import matlab.unittest.fixtures.WorkingFolderFixture;
            import matlab.unittest.fixtures.EnvironmentVariableFixture;

            testCase.applyFixture(WorkingFolderFixture);
            testCase.TempFolder = pwd();
            testCase.applyFixture(EnvironmentVariableFixture("MW_GENERATE_JOB_SUMMARY", "true"));
            testCase.applyFixture(EnvironmentVariableFixture("GITHUB_ACTION", "my-action"));

            testCase.Plugin = ParallelizableBuildSummaryPlugin(TempFolder=testCase.TempFolder);
            testCase.Runner = matlab.buildtool.BuildRunner.withNoPlugins();
            testCase.Runner.addPlugin(testCase.Plugin);
        end
    end

    methods (Test)
        function runningBuildCreatesSummaryArtifact(testCase)
            plan = buildplan();
            plan("t1") = Task();
            plan("t2") = Task();

            testCase.Runner.run(plan, ["t1", "t2"]);

            f = findBuildSummaryFile(testCase.TempFolder);
            testCase.verifyNotEmpty(f);
        end

        function runningBuildCreatesSummaryArtifactWithExpectedTasks(testCase)
            plan = buildplan();
            plan("t1") = Task();
            plan("t2") = Task();

            testCase.Runner.run(plan, ["t1", "t2"]);

            f = findBuildSummaryFile(testCase.TempFolder);
            testCase.assertTrue(~isempty(f));

            s = readstruct(f);

            testCase.verifySize(s, [1 2]);
            testCase.verifyEqual(s(1).name, "t1");
            testCase.verifyEqual(s(2).name, "t2");
        end

        function summaryArtifactStatusesAreCorrect(testCase)
            plan = buildplan();
            plan("t1") = Task();
            plan("t2") = Task(Actions=@()error("bam"));

            testCase.Runner.run(plan, ["t1", "t2"]);

            f = findBuildSummaryFile(testCase.TempFolder);
            testCase.assertTrue(~isempty(f));

            s = readstruct(f);

            testCase.verifySize(s, [1 2]);

            testCase.verifyFalse(s(1).failed);
            testCase.verifyFalse(s(1).skipped);

            testCase.verifyTrue(s(2).failed);
            testCase.verifyFalse(s(2).skipped);
        end

        function runningBuildCreatesSummaryForTaskGroups(testCase)
            plan = buildplan();
            plan("g:t") = Task();

            testCase.Runner.run(plan, "g:t");

            f = findBuildSummaryFile(testCase.TempFolder);
            testCase.assertTrue(~isempty(f));

            s = readstruct(f);

            testCase.verifySize(s, [1 1]);
            testCase.verifyEqual(s(1).name, "g:t");
        end
    end

end

function plugin = ParallelizableBuildSummaryPlugin(varargin)
plugin = buildframework.ParallelizableBuildSummaryPlugin(varargin{:});
end

function task = Task(varargin)
task = matlab.buildtool.Task(varargin{:});
end

function f = findBuildSummaryFile(folder)
files = dir(fullfile(folder, "buildSummary*.json"));
if isempty(files)
    f = "";
else
    f = fullfile(folder, files(1).name);
end
end
