# Technical Context

Stack:

- Node.js 22+
- Next.js 16, React 19, TypeScript, Tailwind CSS
- Capacitor Android
- SQLite through `better-sqlite3`
- shadcn-compatible local UI primitives
- GitHub Actions for CI/CD
- Ansible/Caddy/systemd for self-hosted environments

Common checks:

```bash
npm run public:guard
npm run openspec:validate
npm run app:lint
npm run app:test
npm --prefix services/timer_api test
```

Public version baseline:

- App/web/OTA version: `0.0.1.1`
- Android `versionCode`: `1`
- Release ledger table: `build_versions`

Do not commit SQLite files, APKs, OTA bundles, keystores, `.env` files, private keys, or generated deploy output.
