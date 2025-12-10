import { intro, isCancel, log, outro, text } from "@clack/prompts";
import { Command } from "commander";
import path from "node:path";
import { loadConfig } from "../config";
import { addWorktree, isGitRepo } from "../git";
import { findWorkspace, resolveWorkspaceFromCwd } from "../workspace";

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .argument("[workspace]", "Workspace name")
    .description("Create git worktrees for all repos in a workspace")
    .option("-t, --target <dir>", "Override target root directory")
    .option("-b, --branch <name>", "Branch name for the new worktrees")
    .option(
      "--base <branch>",
      "Base branch to create from when branch does not exist"
    )
    .option("--dry-run", "Show actions without executing", false)
    .action(async (workspaceName: string | undefined, options: InitOptions) => {
      intro("Initialize workspace");
      const config = await loadConfig();
      const workspace = workspaceName
        ? findWorkspace(config, workspaceName)
        : resolveWorkspaceFromCwd(config, process.cwd());

      if (!workspace) {
        log.error(
          workspaceName
            ? `Workspace "${workspaceName}" not found.`
            : "No workspace resolved from cwd. Please pass a name."
        );
        return outro("Aborted");
      }

      const targetRoot =
        options.target ??
        workspace.targetRoot ??
        (await text({
          message: "Target root directory (where worktrees will be created)",
          placeholder: process.cwd()
        }));
      if (isCancel(targetRoot)) return outro("Cancelled");
      const resolvedTargetRoot = path.resolve(targetRoot as string);

      for (const repo of workspace.repos) {
        const branchName =
          options.branch ??
          repo.defaultBranch ??
          workspace.defaultBranch ??
          "main";
        const baseBranch =
          options.base ??
          repo.defaultBranch ??
          workspace.defaultBranch ??
          "main";
        const targetPath = path.join(
          resolvedTargetRoot,
          workspace.name,
          repo.targetSubdir ?? repo.name
        );

        if (!(await isGitRepo(repo.source))) {
          log.error(
            `Skipping ${repo.name}: source path is not a git repo (${repo.source})`
          );
          continue;
        }

        const result = await addWorktree({
          repoPath: repo.source,
          targetPath,
          branch: branchName,
          baseBranch,
          dryRun: options.dryRun
        });

        if (result.ok) {
          log.success(
            `${options.dryRun ? "[dry-run] " : ""}Added worktree for ${
              repo.name
            } -> ${targetPath} (branch: ${branchName})`
          );
        } else {
          log.error(
            `Failed for ${repo.name}: ${result.stderr || "unknown error"}`
          );
        }
      }

      outro("Init complete");
    });
}

type InitOptions = {
  target?: string;
  branch?: string;
  base?: string;
  dryRun?: boolean;
};

