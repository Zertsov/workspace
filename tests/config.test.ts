import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadConfig, saveConfig } from "../src/config";
import { DEFAULT_CONFIG, type CliConfig } from "../src/types";
import { resolveWorkspaceFromCwd } from "../src/workspace";

let tempDir = "";

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "workspace-cli-test-"));
  process.env.WORKSPACE_CLI_CONFIG_DIR = tempDir;
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("config load/save", () => {
  it("returns defaults when config file is missing", async () => {
    const config = await loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("persists config to disk", async () => {
    const toSave: CliConfig = {
      version: 1,
      workspaces: [
        {
          name: "clerk",
          targetRoot: "/tmp/worktrees",
          defaultBranch: "main",
          repos: [
            {
              name: "dashboard",
              source: "/tmp/dashboard",
              defaultBranch: "main"
            }
          ]
        }
      ]
    };

    await saveConfig(toSave);
    const loaded = await loadConfig();
    expect(loaded).toEqual(toSave);
  });
});

describe("workspace resolution", () => {
  it("returns workspace matching cwd prefix", () => {
    const config: CliConfig = {
      version: 1,
      workspaces: [
        {
          name: "clerk",
          targetRoot: "/worktrees/clerk",
          repos: []
        }
      ]
    };

    const resolved = resolveWorkspaceFromCwd(config, "/worktrees/clerk/dashboard");
    expect(resolved?.name).toBe("clerk");
  });
});

