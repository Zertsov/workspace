#!/usr/bin/env bun
import { Command } from "commander";
import { registerInitCommand } from "./commands/init";
import { registerRepoCommands } from "./commands/repo";
import { registerStatusCommand } from "./commands/status";
import { registerWorkspaceCommands } from "./commands/workspace";

const VERSION = "0.1.0";

async function main() {
  const program = new Command();
  program
    .name("workspace-cli")
    .description("Manage multi-repo worktrees via named workspaces")
    .version(VERSION);

  registerWorkspaceCommands(program);
  registerRepoCommands(program);
  registerInitCommand(program);
  registerStatusCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

