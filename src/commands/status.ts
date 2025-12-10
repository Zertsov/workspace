import { intro, log, outro } from "@clack/prompts";
import { Command } from "commander";
import path from "node:path";
import { loadConfig } from "../config";
import { listWorktrees } from "../git";
import { findWorkspace, resolveWorkspaceFromCwd } from "../workspace";

export function registerStatusCommand(program: Command) {
  program
    .command("status")
    .argument("[workspace]", "Workspace name")
    .option("-a, --all", "Show all worktrees (not just ones under target root)")
    .description("Show worktree status for a workspace")
    .action(async (workspaceName: string | undefined, options: StatusOptions) => {
      intro("Workspace status");
      const config = await loadConfig();
      const workspace = workspaceName
        ? findWorkspace(config, workspaceName)
        : resolveWorkspaceFromCwd(config, process.cwd());

      if (!workspace) {
        log.error("Workspace not found. Pass a name or run inside a workspace.");
        return outro("Aborted");
      }

      const targetRoot = workspace.targetRoot
        ? path.resolve(workspace.targetRoot)
        : undefined;

      for (const repo of workspace.repos) {
        const entries = await listWorktrees(repo.source);
        const filtered = options.all
          ? entries
          : entries.filter((wt) =>
              targetRoot ? wt.path.startsWith(targetRoot) : true
            );

        if (!filtered.length) {
          log.warn(`${repo.name}: no worktrees found${targetRoot ? " under target root" : ""}.`);
          continue;
        }

        log.info(`${repo.name}:`);
        for (const entry of filtered) {
          log.info(
            `  ${entry.path} ${entry.branch ? `(${entry.branch})` : ""}${
              entry.bare ? " [bare]" : ""
            }`
          );
        }
      }

      outro("Done");
    });
}

type StatusOptions = {
  all?: boolean;
};

