# Active Context

## Current Focus

Bright OS is being reset to a public point-zero repository baseline.

The target state is a single clean public `main` history containing source code, accepted OpenSpec specs, public-safe docs, and this reset Memory Bank. Runtime data, release artifacts, signing material, server-only env files, local backups, and personal notes stay outside Git.

## Next Steps

- Keep future requirement changes in `openspec/changes/` until accepted.
- Keep durable accepted behavior in `openspec/specs/`.
- Keep public-safe project facts in `memory-bank/`.
- Run `npm run public:guard` before publishing or merging public branches.
- Use `dev` for shared development and `codex/*` branches for preview work.

## Open Questions

- Public branch protection must be configured in GitHub after the clean repository receives its first `main`.
- Server secrets, Android signing material, and deploy keys must be installed outside the repository.
