import {
  intro,
  isCancel,
  log,
  outro,
  select,
  text
} from "@clack/prompts";
import { Command } from "commander";
import { loadConfig, updateConfig } from "../config";
import {
  addRepoToWorkspace,
  findWorkspace,
  removeRepoFromWorkspace
} from "../workspace";
import type { RepoConfig } from "../types";

export function registerRepoCommands(program: Command) {
  const repo = program.command("repo").description("Manage repos in a workspace");

  repo
    .command("list")
    .option("-w, --workspace <name>", "Workspace name")
    .description("List repos for a workspace")
    .action(async (options: RepoListOptions) => {
      const config = await loadConfig();
      const workspace = await pickWorkspace(config, options.workspace);
      if (!workspace) return;

      if (!workspace.repos.length) {
        log.info(`Workspace "${workspace.name}" has no repos yet.`);
        return;
      }

      for (const r of workspace.repos) {
        log.info(
          `${r.name} -> source=${r.source}, targetSubdir=${
            r.targetSubdir ?? r.name
          }, defaultBranch=${r.defaultBranch ?? "unset"}`
        );
      }
    });

  repo
    .command("add")
    .description("Add a repo to a workspace")
    .option("-w, --workspace <name>", "Workspace name")
    .option("-n, --name <name>", "Repo name (display + target folder)")
    .option("-s, --source <path>", "Path to the main repo clone (git worktree base)")
    .option("-b, --default-branch <branch>", "Default branch")
    .option("-t, --target-subdir <dir>", "Relative folder name under the workspace target")
    .action(async (options: RepoAddOptions) => {
      intro("Add repo");
      const config = await loadConfig();
      const workspace = await pickWorkspace(config, options.workspace);
      if (!workspace) return;

      const name =
        options.name ??
        (await text({
          message: "Repo name",
          placeholder: workspace.name,
          validate: (value) => (!value ? "Name is required" : undefined)
        }));
      if (isCancel(name)) return outro("Cancelled");

      const source =
        options.source ??
        (await text({
          message: "Path to the repo clone (used for git worktree add)",
          placeholder: "/path/to/repo"
        }));
      if (isCancel(source)) return outro("Cancelled");

      const targetSubdir =
        options.targetSubdir ??
        (await text({
          message: "Target folder name (enter to default to repo name)",
          placeholder: name as string
        }));
      if (isCancel(targetSubdir)) return outro("Cancelled");

      const defaultBranch =
        options.defaultBranch ??
        (await text({
          message: "Default branch (enter to skip)",
          placeholder: "main"
        }));
      if (isCancel(defaultBranch)) return outro("Cancelled");

      const repo: RepoConfig = {
        name: name as string,
        source: source as string,
        targetSubdir: (targetSubdir as string) || undefined,
        defaultBranch: (defaultBranch as string) || undefined
      };

      await updateConfig((cfg) =>
        addRepoToWorkspace(cfg, workspace.name, repo)
      );

      outro(`Added repo "${repo.name}" to workspace "${workspace.name}".`);
    });

  repo
    .command("remove")
    .argument("<name>", "Repo name")
    .option("-w, --workspace <name>", "Workspace name")
    .description("Remove a repo from a workspace")
    .action(async (name: string, options: RepoRemoveOptions) => {
      intro("Remove repo");
      const config = await loadConfig();
      const workspace = await pickWorkspace(config, options.workspace);
      if (!workspace) return;

      const exists = workspace.repos.find(
        (r) => r.name.toLowerCase() === name.toLowerCase()
      );
      if (!exists) {
        log.error(`Repo "${name}" not found in workspace "${workspace.name}".`);
        return outro("Nothing to remove.");
      }

      await updateConfig((cfg) =>
        removeRepoFromWorkspace(cfg, workspace.name, name)
      );
      outro(`Removed repo "${name}" from workspace "${workspace.name}".`);
    });
}

async function pickWorkspace(config: Awaited<ReturnType<typeof loadConfig>>, name?: string) {
  if (name) {
    const found = findWorkspace(config, name);
    if (!found) {
      log.error(`Workspace "${name}" not found.`);
    }
    return found;
  }

  if (!config.workspaces.length) {
    log.error("No workspaces configured.");
    return undefined;
  }

  const choice = await select({
    message: "Choose a workspace",
    options: config.workspaces.map((ws) => ({
      value: ws.name,
      label: `${ws.name} (${ws.repos.length} repos)`
    }))
  });
  if (isCancel(choice)) {
    outro("Cancelled");
    return undefined;
  }
  return findWorkspace(config, choice as string);
}

type RepoListOptions = {
  workspace?: string;
};

type RepoAddOptions = {
  workspace?: string;
  name?: string;
  source?: string;
  defaultBranch?: string;
  targetSubdir?: string;
};

type RepoRemoveOptions = {
  workspace?: string;
};

