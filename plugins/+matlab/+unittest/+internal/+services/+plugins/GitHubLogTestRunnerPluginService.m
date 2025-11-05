classdef GitHubLogTestRunnerPluginService < matlab.buildtool.internal.services.ciplugins.CITestRunnerPluginService
    % Copyright 2025 The MathWorks, Inc.

    methods
        function plugins = providePlugins(~, ~)
            plugins = ciplugins.github.GitHubLogTestRunnerPlugin();
        end
    end
end