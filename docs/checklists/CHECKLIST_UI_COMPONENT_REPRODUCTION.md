# Чеклист воспроизведения UI-компонента

Перед визуальной работой:

- [ ] Прочитан `docs/guidelines/02-ui-shadcn-radix-visual-rules.md`.
- [ ] Прочитаны `docs/guidelines/11-ui-registry-component-policy.md` и `docs/guidelines/12-ui-icons-visual-qa.md`, если задача касается registry, Radix, иконок, typography или visual QA.
- [ ] Проверено, что `apps/brai_app/components.json` остаётся source of truth для default shadcn style, CSS variables, aliases, registries и Lucide icons.
- [ ] Проверены existing Brai components и `apps/brai_app/src/shared/ui`.
- [ ] Visible controls/surfaces используют registry-native source из Brai, shadcn/ui или Motion Primitives, а не hand-rolled `button`/`motion.button`/`div` + Tailwind.
- [ ] Если registry-native source не найден, fallback на base/custom UI явно согласован с Сергеем до implementation.
- [ ] Если используется registry item, подтверждены public preview, free/non-Pro status и source access.
- [ ] Pro/paid/gated/API-key/private-token items rejected.
- [ ] Actual accepted source получен до implementation.
- [ ] Source скопирован как baseline, не пересоздан по памяти или скриншоту.
- [ ] Structure/classes/layout/spacing/typography/radii/colors/animation/responsive/interactions сохранены.
- [ ] Hardcoded registry/demo colors (`black`, `white`, `zinc`, hex/rgb/arbitrary color utilities) заменены на semantic Brai tokens перед product use.
- [ ] Edits ограничены import/path compatibility, Brai data/actions и явно запрошенными content changes.
- [ ] Новая content-holding product surface использует source-owned shadcn primitive/block или accepted source block.
- [ ] Не добавлен новый `panelClass`, `settings-card`, `chart-panel`, `metric`, `auth-panel`, `empty-state` или ручной border/surface container.
- [ ] Не добавлены hardcoded product colors, static arbitrary radii/shadows, arbitrary font classes, arbitrary font-size classes или новые font families.
- [ ] Theme controls остаются внутри standard shadcn light/dark token modes, без arbitrary accent/color picker по умолчанию.
- [ ] Mobile и desktop viewport проверены.
