"use client";

import { APP_BRANCH, APP_COMMIT, APP_ENVIRONMENT, APP_OTA_CHANNEL, APP_PREVIEW_SLOT, APP_VERSION } from "@/shared/config/runtime";
import type { BrightOtaState } from "@/shared/platform/ota";
import { moscowDateTime, moscowTime } from "@/shared/time/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import type { Tone } from "../../appModel";
import { SECTION_GRID_CLASS } from "../../appModel";
import { settingsSectionView } from "./settingsModel";

const updateStatusVariants: Record<Tone, "secondary" | "outline" | "destructive"> = {
  ok: "secondary",
  warn: "outline",
  bad: "destructive",
  muted: "secondary",
};

export function SettingsSection({
  otaState,
  otaCheckedAt,
  otaRefreshing,
  bundlePublishedAt,
  onRefreshOta,
}: {
  otaState: BrightOtaState | null;
  otaCheckedAt: string | null;
  otaRefreshing: boolean;
  bundlePublishedAt: string | null;
  onRefreshOta: () => Promise<void>;
}) {
  const appBuild = APP_VERSION;
  const view = settingsSectionView({ appBuild, otaRefreshing, otaState });
  const environmentRows = nonProductionRows(otaState);

  return (
    <section className={SECTION_GRID_CLASS} aria-label="Настройки">
      <Card className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3.5 max-[460px]:flex-col">
          <div>
            <h2 className="m-0 text-base leading-[1.2]">Обновление</h2>
            <p className="m-0 font-normal text-muted-foreground">{view.updateStatus.body}</p>
          </div>
          <Badge className="min-h-[30px] flex-none px-2.5 text-xs font-semibold" variant={updateStatusVariants[view.updateStatus.tone]}>
            {view.updateStatus.label}
          </Badge>
        </div>

        <dl className="version-list m-0 grid gap-[9px]">
          <div className="flex items-baseline justify-between gap-3.5 max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-0.5">
            <dt className="text-xs font-normal uppercase text-muted-foreground">Web</dt>
            <dd className="m-0 max-w-[70%] [overflow-wrap:anywhere] text-right text-sm font-normal text-foreground tabular-nums max-[460px]:max-w-full max-[460px]:text-left">{view.activeWebVersion}</dd>
          </div>
          {otaState?.candidateBundleVersion ? (
            <div className="flex items-baseline justify-between gap-3.5 max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-0.5">
              <dt className="text-xs font-normal uppercase text-muted-foreground">Готово</dt>
              <dd className="m-0 max-w-[70%] [overflow-wrap:anywhere] text-right text-sm font-normal text-foreground tabular-nums max-[460px]:max-w-full max-[460px]:text-left">{otaState.candidateBundleVersion}</dd>
            </div>
          ) : null}
          <div className="flex items-baseline justify-between gap-3.5 max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-0.5">
            <dt className="text-xs font-normal uppercase text-muted-foreground">APK</dt>
            <dd className="m-0 max-w-[70%] [overflow-wrap:anywhere] text-right text-sm font-normal text-foreground tabular-nums max-[460px]:max-w-full max-[460px]:text-left">{view.nativeApk}</dd>
          </div>
          {environmentRows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3.5 max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-0.5">
              <dt className="text-xs font-normal uppercase text-muted-foreground">{row.label}</dt>
              <dd className="m-0 max-w-[70%] [overflow-wrap:anywhere] text-right text-sm font-normal text-foreground tabular-nums max-[460px]:max-w-full max-[460px]:text-left">{row.value}</dd>
            </div>
          ))}
          {bundlePublishedAt ? (
            <div className="flex items-baseline justify-between gap-3.5 max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-0.5">
              <dt className="text-xs font-normal uppercase text-muted-foreground">Опубликовано</dt>
              <dd className="m-0 max-w-[70%] [overflow-wrap:anywhere] text-right text-sm font-normal text-foreground tabular-nums max-[460px]:max-w-full max-[460px]:text-left">{moscowDateTime(bundlePublishedAt)}</dd>
            </div>
          ) : null}
          {otaCheckedAt ? (
            <div className="flex items-baseline justify-between gap-3.5 max-[460px]:flex-col max-[460px]:items-start max-[460px]:gap-0.5">
              <dt className="text-xs font-normal uppercase text-muted-foreground">Проверено</dt>
              <dd className="m-0 max-w-[70%] [overflow-wrap:anywhere] text-right text-sm font-normal text-foreground tabular-nums max-[460px]:max-w-full max-[460px]:text-left">{moscowTime(otaCheckedAt)}</dd>
            </div>
          ) : null}
        </dl>

        <Button className="justify-self-start" type="button" variant="secondary" disabled={view.isChecking} onClick={() => void onRefreshOta()}>
          {view.isChecking ? "Проверяем..." : "Проверить обновление"}
        </Button>
      </Card>
    </section>
  );
}

function nonProductionRows(otaState: BrightOtaState | null): Array<{ label: string; value: string }> {
  const nativeEnvironment = otaState?.nativeEnvironment;
  const environment = APP_ENVIRONMENT !== "prod" ? APP_ENVIRONMENT : nativeEnvironment;
  if (!environment || environment === "prod") return [];

  const slot = APP_PREVIEW_SLOT || otaState?.nativePreviewSlot || "";
  const rows = [
    { label: "Окружение", value: environment === "dev" ? "Dev" : slot || environment },
  ];
  if (APP_BRANCH) rows.push({ label: "Ветка", value: APP_BRANCH });
  if (APP_COMMIT) rows.push({ label: "Commit", value: APP_COMMIT.slice(0, 12) });
  rows.push({ label: "OTA", value: APP_OTA_CHANNEL || otaState?.nativeOtaChannel || "" });
  return rows.filter((row) => row.value);
}
