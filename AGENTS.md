# AGENTS.md

This file routes agents to the project rules.

## Route

- Before development, debugging, refactoring, review, UI work, API/DB changes, releases, commits, infrastructure work, or publication, read [docs/DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md).
- For the first Bright OS question in a working context, read [docs/DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md), [docs/AGENT_CONTEXT.md](docs/AGENT_CONTEXT.md), and `memory-bank/activeContext.md`; for status, version, release, or deployment questions also read `memory-bank/progress.md`.
- Keep detailed development rules in `docs/guidelines/`, not here.

## Final Preview Handoff

- After `scripts/bright-preview-handoff.sh` succeeds, the final implementation response MUST start with that command's preview header: `<slot emoji> Preview`.
- Put no text before that header. Then include the preview URL, branch, and commit before any summary.
