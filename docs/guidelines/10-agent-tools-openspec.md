# Agent Tools And OpenSpec

- Use OpenSpec for planned requirement changes before implementation.
- Accepted requirements live in `openspec/specs/`.
- Proposed changes live in `openspec/changes/<change-id>/`.
- Run `npm run openspec:validate` after changing specs or rules.
- Use current library documentation tooling when a task depends on third-party API behavior.
- Do not copy secrets, credentials, private messages, or server-only values into docs or specs.
