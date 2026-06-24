# Bright OS

Bright OS is a local-first productivity app with a Next.js web client, a Capacitor Android shell, and a self-hosted Timer API.

The repository is designed to be public from this baseline forward. It contains source code, accepted product specifications, development documentation, and deployment automation. It must not contain runtime databases, APK/OTA artifacts, signing materials, server secrets, private keys, local backups, or personal workspace notes.

## Architecture

- `apps/bright_os_app/` - Next.js 16, React 19, Tailwind CSS, shadcn-compatible UI, and Capacitor Android.
- `services/timer_api/` - Node.js Timer API with SQLite storage and offline-first sync endpoints.
- `deploy/` - source-owned deployment scripts, Ansible templates, and environment mapping.
- `docs/` - development rules, checklists, and operations notes.
- `openspec/specs/` - accepted product and workflow requirements.
- `memory-bank/` - public point-zero project context for future development sessions.

Generated output is intentionally ignored: `data/`, `deploy/web/`, `deploy/mobile-update/`, `deploy/releases/`, Android build output, SQLite files, and release artifacts stay outside Git.

## Requirements

- Node.js 22 or newer. Bright OS commands prefer the approved runtime under `/srv/opt/node-v22.16.0` when present.
- npm for JavaScript dependencies.
- Android Studio/JDK/Gradle for APK builds.
- A release signing keystore provided through environment variables for production APK builds.

## Common Commands

```bash
npm ci
npm --prefix apps/bright_os_app ci
npm --prefix services/timer_api ci

npm run app:lint
npm run app:test
npm --prefix services/timer_api test
npm run openspec:validate
npm run public:guard
```

Client development:

```bash
npm run app:dev
npm run app:build
npm run app:e2e
```

Android:

```bash
npm run app:cap:sync
npm run android:build:release
```

Release APK signing is env-only. Set `BRIGHT_OS_ANDROID_KEYSTORE_PATH`, `BRIGHT_OS_ANDROID_STORE_PASSWORD`, `BRIGHT_OS_ANDROID_KEY_ALIAS`, and `BRIGHT_OS_ANDROID_KEY_PASSWORD` outside the repository before building a release APK.

## Branch And Deployment Flow

- `main` is production source and deploys to `app.brightos.world`.
- `dev` is shared development source and deploys to `dev.brightos.world`.
- `codex/*` branches deploy to preview slots `A` through `E`.

GitHub Actions run public hygiene checks, app lint/tests, Timer API tests, and branch-class deployment. Deployment credentials live in GitHub Secrets/Variables and on the server, never in source.

Required GitHub values:

- Secret: `BRIGHT_DEPLOY_SSH_KEY`
- Variables: `BRIGHT_DEPLOY_HOST`, `BRIGHT_DEPLOY_USER`, `BRIGHT_DEPLOY_SSH_PORT`, `BRIGHT_DEPLOY_REPO`

## Public Repository Hygiene

Before publishing or opening the repository, run:

```bash
npm run public:guard
```

The guard checks the current tree and reachable Git history for forbidden runtime paths, signing materials, credential-like files, high-confidence secret patterns, local workspace paths, and personal markers.

If the guard fails, fix the source tree and rebuild the clean history. Do not force-push a failed baseline to the public repository.
