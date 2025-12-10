import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ConfigSchema, DEFAULT_CONFIG, type CliConfig } from "./types";

const CONFIG_DIR_NAME = ".workspace-cli";

export const getConfigDir = () =>
  process.env.WORKSPACE_CLI_CONFIG_DIR ??
  path.join(os.homedir(), CONFIG_DIR_NAME);

export const getConfigPath = () => path.join(getConfigDir(), "config.json");

async function ensureConfigDir() {
  await fs.mkdir(getConfigDir(), { recursive: true });
}

export async function loadConfig(): Promise<CliConfig> {
  const configPath = getConfigPath();
  try {
    const raw = await fs.readFile(configPath, "utf8");
    return ConfigSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_CONFIG;
    }
    throw err;
  }
}

export async function saveConfig(config: CliConfig) {
  await ensureConfigDir();
  await fs.writeFile(getConfigPath(), JSON.stringify(config, null, 2), "utf8");
}

export async function updateConfig(
  mutator: (config: CliConfig) => CliConfig
): Promise<CliConfig> {
  const config = await loadConfig();
  const next = mutator(config);
  const parsed = ConfigSchema.parse(next);
  await saveConfig(parsed);
  return parsed;
}

