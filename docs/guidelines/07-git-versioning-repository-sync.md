# Git, Versioning, And Repository Sync

## Branch Classes

- `main` - production source.
- `dev` - shared development source.
- `codex/*` - task branches with preview slots.

Before the first project-file change for a task, branch from the latest accepted base. Ordinary future task work starts from `origin/dev` unless another base is explicitly requested.

Read-only questions, planning, and investigation without project-file changes do not need a branch or preview slot.

## Commit And Push

Before commit:

- check current branch;
- inspect `git status --short`;
- stage only intended files;
- do not revert unrelated changes;
- run or report relevant checks.

When a commit/push is requested, commit the intended work and push the branch unless local-only is explicitly requested.

## Public Baseline

The public repository starts from a clean baseline history. Do not push old private/bootstrap history, runtime artifacts, generated deploy output, signing material, databases, or personal notes.
