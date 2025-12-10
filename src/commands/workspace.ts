import {
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  text
} from "@clack/prompts";
import { Command } from "commander";
import { loadConfig, updateConfig } from "../config";
import { findWorkspace, removeWorkspace, upsertWorkspace } from "../workspace";

export function registerWorkspaceCommands(program: Command) {
  const workspace = program
    .command("workspace")
    .description("Manage workspaces");

  workspace
    .command("list")
    .description("List configured workspaces")
    .action(async () => {
      const config = await loadConfig();
      if (!config.workspaces.length) {
        log.info("No workspaces configured yet.");
        return;
      }
      for (const ws of config.workspaces) {
        log.info(
          `${ws.name} -> targetRoot=${ws.targetRoot ?? "unset"}, defaultBranch=${
            ws.defaultBranch ?? "unset"
          }, repos=${ws.repos.length}`
        );
      }
    });

  workspace
    .command("create")
    .argument("[name]", "Workspace name")
    .option("-t, --target <dir>", "Default target directory for worktrees")
    .option("-b, --default-branch <branch>", "Default branch name")
    .description("Create or update a workspace")
    .action(async (name: string | undefined, options: WorkspaceCreateOptions) => {
      intro("Create workspace");
      const config = await loadConfig();

      const nameInput =
        name ??
        (await text({
          message: "Workspace name",
          validate: (value) => (!value ? "Name is required" : undefined)
        }));
      if (isCancel(nameInput)) return outro("Cancelled");

      const current = findWorkspace(config, nameInput) ?? {
        name: nameInput,
        repos: []
      };

      const targetRootInput =
        options.target ??
        (await text({
          message: "Target root for worktrees",
          placeholder: current.targetRoot ?? process.cwd()
        }));
      if (isCancel(targetRootInput)) return outro("Cancelled");

      const defaultBranchInput =
        options.defaultBranch ??
        (await text({
          message: "Default branch (enter to skip)",
          placeholder: current.defaultBranch ?? "main"
        }));
      if (isCancel(defaultBranchInput)) return outro("Cancelled");

      await updateConfig((cfg) =>
        upsertWorkspace(cfg, {
          ...current,
          targetRoot: targetRootInput || current.targetRoot,
          defaultBranch: defaultBranchInput || current.defaultBranch
        })
      );

      outro(`Workspace "${nameInput}" saved.`);
    });

  workspace
    .command("remove")
    .argument("<name>", "Workspace name")
    .description("Remove a workspace")
    .action(async (name: string) => {
      intro(`Remove workspace "${name}"`);
      const config = await loadConfig();
      const exists = findWorkspace(config, name);
      if (!exists) {
        log.error(`Workspace "${name}" does not exist.`);
        return outro("Nothing to remove.");
      }
      const proceed = await confirm({
        message: `Delete workspace "${name}"?`,
        initialValue: false
      });
      if (isCancel(proceed) || proceed === false) {
        return outro("Cancelled");
      }
      await updateConfig((cfg) => removeWorkspace(cfg, name));
      outro(`Workspace "${name}" removed.`);
    });

  workspace
    .command("pick")
    .description("Select a workspace and print its name (useful for scripts)")
    .action(async () => {
      const config = await loadConfig();
      if (!config.workspaces.length) {
        log.error("No workspaces configured.");
        return;
      }
      const choice = await select({
        message: "Choose a workspace",
        options: config.workspaces.map((ws) => ({
          value: ws.name,
          label: `${ws.name} (${ws.repos.length} repos)`
        }))
      });
      if (isCancel(choice)) return outro("Cancelled");
      console.log(choice);
      outro("Done");
    });
}

type WorkspaceCreateOptions = {
  target?: string;
  defaultBranch?: string;
};

