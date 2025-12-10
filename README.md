# workspace-cli

A Bun-powered CLI to manage multi-repo worktrees via named workspaces. Configure once per machine in `~/.workspace-cli/config.json`, then spin up matching worktrees for all repos in a workspace with a single command.

## Features
- Home-dir config with multiple named workspaces
- Clack-powered prompts and sensible defaults
- Git worktree add/list helpers with dry-run
- Context-aware workspace resolution from `cwd` (by target root)

## Quickstart
```bash
bun install
bun run src/index.ts --help
```

Common flows (using compiled binary or bun runner):
```bash
# Create a workspace and set a default target root
./dist/workspace-cli workspace create Clerk --target ~/dev/worktrees --default-branch main
# or: bun run src/index.ts workspace create Clerk --target ~/dev/worktrees --default-branch main

# Register repos (point at your base clone to attach worktrees)
./dist/workspace-cli repo add -w Clerk --name dashboard --source ~/dev/clerk/dashboard
./dist/workspace-cli repo add -w Clerk --name api --source ~/dev/clerk/api
# or: bun run src/index.ts repo add ...

# Spin up worktrees for a branch (will create branch if missing)
./dist/workspace-cli init Clerk --branch feature/foo --target ~/dev/worktrees

# Check status of worktrees under the target root
./dist/workspace-cli status Clerk
```

## Scripts
- `bun run src/index.ts ...` – execute the CLI
- `bun run build:bin` – produce a single-file executable at `dist/workspace-cli`
- `bun test` – run tests (to be added)
- `bun run check` – TypeScript type-check
