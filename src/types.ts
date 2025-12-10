import { z } from "zod";

export const RepoSchema = z.object({
  name: z.string(),
  source: z.string(), // absolute path to the base clone used for worktrees
  url: z.string().optional(),
  defaultBranch: z.string().optional(),
  targetSubdir: z.string().optional()
});

export const WorkspaceSchema = z.object({
  name: z.string(),
  targetRoot: z.string().optional(),
  defaultBranch: z.string().optional(),
  marker: z.string().optional(),
  repos: z.array(RepoSchema).default([])
});

export const ConfigSchema = z.object({
  version: z.number().default(1),
  workspaces: z.array(WorkspaceSchema).default([])
});

export type RepoConfig = z.infer<typeof RepoSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceSchema>;
export type CliConfig = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: CliConfig = {
  version: 1,
  workspaces: []
};

