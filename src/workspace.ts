import path from "node:path";
import type { CliConfig, RepoConfig, WorkspaceConfig } from "./types";

export function findWorkspace(
  config: CliConfig,
  name: string
): WorkspaceConfig | undefined {
  return config.workspaces.find(
    (ws) => ws.name.toLowerCase() === name.toLowerCase()
  );
}

export function upsertWorkspace(
  config: CliConfig,
  workspace: WorkspaceConfig
): CliConfig {
  const others = config.workspaces.filter(
    (ws) => ws.name.toLowerCase() !== workspace.name.toLowerCase()
  );
  return {
    ...config,
    workspaces: [...others, workspace]
  };
}

export function removeWorkspace(config: CliConfig, name: string): CliConfig {
  return {
    ...config,
    workspaces: config.workspaces.filter(
      (ws) => ws.name.toLowerCase() !== name.toLowerCase()
    )
  };
}

export function addRepoToWorkspace(
  config: CliConfig,
  workspaceName: string,
  repo: RepoConfig
): CliConfig {
  const workspace = findWorkspace(config, workspaceName);
  if (!workspace) {
    throw new Error(`Workspace "${workspaceName}" not found`);
  }
  const existingRepoNames = new Set(
    workspace.repos.map((r) => r.name.toLowerCase())
  );
  if (existingRepoNames.has(repo.name.toLowerCase())) {
    throw new Error(
      `Repo "${repo.name}" already exists in workspace "${workspaceName}"`
    );
  }
  const updated: WorkspaceConfig = { ...workspace, repos: [...workspace.repos, repo] };
  return upsertWorkspace(config, updated);
}

export function removeRepoFromWorkspace(
  config: CliConfig,
  workspaceName: string,
  repoName: string
): CliConfig {
  const workspace = findWorkspace(config, workspaceName);
  if (!workspace) {
    throw new Error(`Workspace "${workspaceName}" not found`);
  }
  const updated: WorkspaceConfig = {
    ...workspace,
    repos: workspace.repos.filter(
      (repo) => repo.name.toLowerCase() !== repoName.toLowerCase()
    )
  };
  return upsertWorkspace(config, updated);
}

export function resolveWorkspaceFromCwd(
  config: CliConfig,
  cwd: string
): WorkspaceConfig | undefined {
  const normalizedCwd = path.resolve(cwd);
  const matches = config.workspaces
    .map((ws) => {
      if (!ws.targetRoot) return undefined;
      const resolvedTarget = path.resolve(ws.targetRoot);
      return normalizedCwd.startsWith(resolvedTarget)
        ? { workspace: ws, length: resolvedTarget.length }
        : undefined;
    })
    .filter(Boolean) as { workspace: WorkspaceConfig; length: number }[];

  if (matches.length === 0) return undefined;
  return matches.sort((a, b) => b.length - a.length)[0]?.workspace;
}

