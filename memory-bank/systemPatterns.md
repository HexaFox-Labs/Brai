# System Patterns

- Next.js client source lives in `apps/bright_os_app/`.
- Timer API source lives in `services/timer_api/`.
- Accepted requirements live in `openspec/specs/`.
- Development rules live in `docs/guidelines/`.
- Deployment source automation lives in `deploy/`; generated deploy output does not.

Deployment branch classes:

- `main` deploys production.
- `dev` deploys the shared development environment.
- `codex/*` deploys preview slots `A` through `E`.

Security boundaries:

- Browser web uses same-origin `/api`.
- Android uses the configured environment API endpoint.
- Release signing uses environment variables only.
- GitHub Actions receives deploy credentials through repository secrets and variables.
