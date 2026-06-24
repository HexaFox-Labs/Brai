# Repository Sync Checklist

- [ ] Read `docs/guidelines/07-git-versioning-repository-sync.md`.
- [ ] Check current branch.
- [ ] Inspect `git status --short`.
- [ ] Stage only intended files.
- [ ] Do not revert unrelated changes.
- [ ] Run or report relevant checks.
- [ ] Commit intended changes.
- [ ] Push the `codex/*` task branch to `origin` unless the task is explicitly local-only/no-push.
- [ ] Wait for CI/deploy to assign or reuse a preview slot.
- [ ] End with clean tracked `git status --short` and report preview letter + URL, or report the exact blocker explicitly.
