import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type GitResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number;
};

export async function git(
  args: string[],
  opts: { cwd: string }
): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: opts.cwd
    });
    return { ok: true, stdout, stderr, code: 0 };
  } catch (error) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };
    return {
      ok: false,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
      code: err.code ?? 1
    };
  }
}

export async function isGitRepo(dir: string): Promise<boolean> {
  const res = await git(["rev-parse", "--is-inside-work-tree"], { cwd: dir });
  return res.ok && res.stdout.trim() === "true";
}

export async function branchExists(repoPath: string, branch: string) {
  const res = await git(["rev-parse", "--verify", branch], { cwd: repoPath });
  return res.ok;
}

export type WorktreeEntry = {
  path: string;
  branch?: string;
  bare: boolean;
};

export async function listWorktrees(repoPath: string): Promise<WorktreeEntry[]> {
  const res = await git(["worktree", "list", "--porcelain"], { cwd: repoPath });
  if (!res.ok) return [];

  const lines = res.stdout.split("\n");
  const entries: WorktreeEntry[] = [];
  let current: Partial<WorktreeEntry> = {};

  for (const line of lines) {
    if (line.startsWith("worktree ")) {
      if (current.path) entries.push(current as WorktreeEntry);
      current = { path: line.replace("worktree ", "").trim(), bare: false };
    } else if (line.startsWith("branch ")) {
      current.branch = line.replace("branch ", "").trim();
    } else if (line === "bare") {
      current.bare = true;
    }
  }
  if (current.path) entries.push(current as WorktreeEntry);
  return entries;
}

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function addWorktree(opts: {
  repoPath: string;
  targetPath: string;
  branch: string;
  baseBranch?: string;
  dryRun?: boolean;
}): Promise<GitResult> {
  const target = path.resolve(opts.targetPath);
  const repo = path.resolve(opts.repoPath);
  const hasTarget = await pathExists(target);

  if (hasTarget) {
    return {
      ok: false,
      stdout: "",
      stderr: `Target path already exists: ${target}`,
      code: 1
    };
  }

  const branchExistsAlready = await branchExists(repo, opts.branch);
  const args = ["worktree", "add"];
  if (!branchExistsAlready) {
    args.push("-b", opts.branch);
  }
  args.push(target);
  args.push(branchExistsAlready ? opts.branch : opts.baseBranch ?? "main");

  if (opts.dryRun) {
    return {
      ok: true,
      stdout: `DRY RUN: git ${args.join(" ")}`,
      stderr: "",
      code: 0
    };
  }

  const parent = path.dirname(target);
  await fs.mkdir(parent, { recursive: true });

  return git(args, { cwd: repo });
}

export async function ensureCleanRepo(repoPath: string): Promise<boolean> {
  const res = await git(["status", "--porcelain"], { cwd: repoPath });
  return res.ok && res.stdout.trim().length === 0;
}

