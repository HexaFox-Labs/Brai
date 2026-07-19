# Recovery production promotion при пропавшем GitHub `push`

- Status: accepted
- Deciders: Владелец проекта, Codex
- Date: 2026-07-19
- Tags: delivery, github-actions, temporal, production, recovery

## Контекст

Принятый Preview может быть реально squash-merged в `main`, но GitHub Actions
иногда не создаёт ожидаемый workflow run события `push` для exact merge SHA.
Прежняя схема считала этот run единственным входом в `deploy-prod`: metadata
promotion и освобождение занятого Preview slot не начинались, хотя PR уже был
merged.

## Решение

`push` на `main` остаётся нормальным и предпочтительным путём. При закрытии
merged internal `codex/*` PR отдельный guarded job запрашивает GitHub Actions
API по event `push` и exact merge SHA в ограниченном интервале. Если run найден,
job завершается без side effects.

Если run не появился, job вызывает существующий `PromotionWorkflow` через
`dispatch-promotion` с теми же merge/base SHA. Workflow ID уже scoped по target
и SHA, поэтому поздний нормальный `push` соединяется с тем же Temporal workflow,
а не запускает второй deploy. Recovery не выполняет shell deploy, release slot
или metadata mutation напрямую.

Установленный `/srv/opt/brai-main-sync.sh` считается deployable copy source
`deploy/scripts/sync-local-main-checkout.sh`. Его актуализация выполняется
только через Ansible; это предотвращает расходящийся host-side sync contract.

## Рассмотренные альтернативы

- Запускать `workflow_dispatch`: отклонено, потому что условия `deploy-prod`
  рассчитаны на `push`, а ручной event не доказывает exact normal path.
- Освобождать Preview slot прямо из closed-PR job: отклонено, потому что это
  обходит production migration, smoke, metadata promotion и reconciliation.
- Считать любой workflow run доказательством delivery: отклонено, потому что
  `pull_request` run не заменяет exact `push` run для merge SHA.

## Последствия

- Принятая работа больше не остаётся silently merged без production promotion.
- В обычном случае добавляется лишь bounded read-only API poll.
- Recovery зависит от GitHub Actions read permission и от idempotency уже
  существующего Temporal promotion ID.

## Проверка

- Unit tests проверяют фильтрацию только `push` run на `main` с exact SHA,
  позднее появление нормального run и полное отсутствие run.
- Workflow test проверяет guarded condition, merge SHA/base SHA и dispatch
  только после отсутствующего normal path.
- Delivery QA проверяет normal `push` path и искусственно отсутствующий path
  без дублей production promotion.

## Ссылки

- `openspec/changes/recover-accepted-production-trigger/`
- `openspec/specs/repository-operations/spec.md`
- `.github/workflows/brai-delivery.yml`
- `deploy/scripts/await-main-push-run.mjs`

## Заменяет

Нет.

## Заменено

Нет.
