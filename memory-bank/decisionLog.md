# Decision Log

## 2026-06-24 - Public Repository Baseline

Brai public development starts from a new clean history instead of exposing private bootstrap history.

Rationale:

- Old Git history contained runtime artifacts and private development context.
- Future public development should use one canonical repository, not separate public/private source branches.
- Docs, accepted specs, and Memory Bank remain public, but are reset to public-safe content.

## 2026-06-24 - Public Hygiene Gate

Every public branch class must run the public guard before merge or deployment.

The guard checks current tree and reachable history for runtime data, generated artifacts, signing material, credential-like files, high-confidence secret patterns, local home paths, and personal markers.

## 2026-06-27 - SocratiCode Default Semantic Search

Brai agent workflow uses SocratiCode as the default path for semantic codebase exploration after `codebase_status` confirms the active project path is indexed.

Rationale:

- Semantic feature, responsibility, and architecture search should use the shared index before speculative file reads.
- Exact string and file discovery still use `rg`.
- Agent rules, docs, OpenSpec, and Memory Bank are declared as SocratiCode context artifacts so governance context is searchable.
