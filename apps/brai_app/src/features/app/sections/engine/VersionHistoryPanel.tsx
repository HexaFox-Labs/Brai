"use client";

import { useId, useMemo } from "react";
import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import { BraiApi, type VersionHistoryItem, type VersionHistoryPullRequest, type VersionHistoryType } from "@/shared/api/braiApi";
import { defaultApiBase } from "@/shared/config/runtime";
import { moscowDateTime } from "@/shared/time/format";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { MarkdownContent } from "@/shared/ui/markdown-content";
import { useVersionHistory, type VersionHistoryApi } from "./useVersionHistory";

export function VersionHistoryPanel({ api }: { api?: VersionHistoryApi }) {
  const defaultApi = useMemo(() => new BraiApi(defaultApiBase()), []);
  const history = useVersionHistory(api ?? defaultApi);
  const headingId = useId();
  const initialLoading = history.status === "loading" && history.items.length === 0;

  return (
    <section className="grid min-w-0 gap-4 pb-7 pl-7 pr-[18px] max-[860px]:px-[18px]" aria-labelledby={headingId}>
      <div className="grid gap-1">
        <h2 id={headingId} className="m-0 text-xl font-semibold leading-tight max-[860px]:sr-only">История версий</h2>
        <p className="m-0 text-sm text-muted-foreground">Завершённые работы и выпуски платформ, сначала новые.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр истории по типу версии">
        <FilterButton active={history.filter == null} label="Все" onClick={() => history.selectFilter(null)} />
        {history.types.map((type) => (
          <FilterButton key={type.id} active={history.filter === type.id} label={type.title} onClick={() => history.selectFilter(type.id)} />
        ))}
      </div>

      {initialLoading ? (
        <p className="m-0 inline-flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          Загружаем историю…
        </p>
      ) : null}

      {history.items.length ? (
        <ol className="m-0 grid list-none gap-3 p-0" aria-label="Версии">
          {history.items.map((item) => <VersionHistoryCard key={item.id} item={item} types={history.types} />)}
        </ol>
      ) : null}

      {history.status === "ready" && history.items.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground" role="status">Для выбранного типа версий пока нет.</p>
      ) : null}

      {history.status === "error" ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>История не загрузилась</AlertTitle>
          <AlertDescription>Проверьте соединение и попробуйте ещё раз.</AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" size="sm" onClick={() => void history.retry()}>
              <RotateCcw aria-hidden="true" />
              Повторить
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {history.hasMore && history.status !== "error" ? (
        <Button type="button" variant="outline" disabled={history.status === "loading-more"} onClick={() => void history.loadMore()}>
          {history.status === "loading-more" ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> : null}
          {history.status === "loading-more" ? "Загружаем…" : "Показать более ранние"}
        </Button>
      ) : null}
    </section>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Button type="button" variant={active ? "secondary" : "outline"} size="sm" aria-pressed={active} onClick={onClick}>
      {label}
    </Button>
  );
}

function VersionHistoryCard({ item, types }: { item: VersionHistoryItem; types: VersionHistoryType[] }) {
  const titleId = `version-history-${item.id}`;
  const typeTitle = types.find((type) => type.id === item.type)?.title ?? item.type.toUpperCase();

  return (
    <li>
      <Card className="grid min-w-0 gap-4 p-4" render={<article aria-labelledby={titleId} />}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="secondary">{typeTitle} {item.version}</Badge>
          <time className="ml-auto text-xs text-muted-foreground" dateTime={item.released_at_utc}>{moscowDateTime(item.released_at_utc)} МСК</time>
        </div>

        <div className="grid gap-2">
          <h3 id={titleId} className="m-0 text-base font-semibold leading-tight">{item.short_changes}</h3>
          <p className="m-0 text-sm leading-6 text-muted-foreground">{item.detailed_changes}</p>
        </div>

        <Definition label="Причина" value={item.reason} />
        <Definition label="Work ID" value={item.work?.key ?? "Нет — историческая запись без подтверждённой работы"} />

        <div className="grid gap-2">
          <h4 className="m-0 text-sm font-semibold">Изменения</h4>
          <ol className="m-0 grid gap-2 pl-5 text-sm">
            {item.details.map((detail) => (
              <li key={detail.id}>
                <span className="font-medium">{detail.title}.</span>{" "}
                <span className="text-muted-foreground">{detail.description}</span>
              </li>
            ))}
          </ol>
        </div>

        <PullRequests pulls={item.pull_requests} />
        {item.refs.length ? <VersionRefs item={item} /> : null}
      </Card>
    </li>
  );
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm">
      <p className="m-0 font-medium">{label}</p>
      <p className="m-0 break-words text-muted-foreground">{value}</p>
    </div>
  );
}

function PullRequests({ pulls }: { pulls: VersionHistoryPullRequest[] }) {
  return (
    <div className="grid gap-2">
      <h4 className="m-0 text-sm font-semibold">Pull requests</h4>
      {pulls.length === 0 ? <p className="m-0 text-sm text-muted-foreground">Нет связанных pull request.</p> : null}
      {pulls.map((pull) => (
        <div key={pull.id} className="grid gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
          {safePullUrl(pull.url) ? (
            <a className="break-words text-sm font-medium text-primary underline underline-offset-4" href={pull.url} target="_blank" rel="noreferrer">
              PR #{pull.number} — {pull.title}
            </a>
          ) : <p className="m-0 break-words text-sm font-medium">PR #{pull.number} — {pull.title}</p>}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground">Полные данные PR #{pull.number}</summary>
            <div className="mt-3 grid gap-3">
              <dl className="m-0 grid gap-2 text-xs">
                <Metadata label="Repository" value={pull.repository} />
                <Metadata label="Автор" value={pull.author_login} />
                <Metadata label="Роль" value={pull.role} />
                <Metadata label="Состояние" value={`${pull.state}${pull.is_draft ? " · draft" : ""}`} />
                <Metadata label="Ветки" value={`${pull.head_branch} → ${pull.base_branch}`} />
                <Metadata label="Merge SHA" value={pull.merge_commit_sha ?? "—"} />
                <Metadata label="Создан" value={moscowDateTime(pull.created_at_utc)} />
                <Metadata label="Обновлён" value={moscowDateTime(pull.updated_at_utc)} />
                <Metadata label="Закрыт" value={pull.closed_at_utc ? moscowDateTime(pull.closed_at_utc) : "—"} />
                <Metadata label="Объединён" value={pull.merged_at_utc ? moscowDateTime(pull.merged_at_utc) : "—"} />
              </dl>
              <div className="grid gap-1">
                <p className="m-0 text-xs font-medium">Полное описание</p>
                {pull.body ? <MarkdownContent source={pull.body} className="text-sm" /> : <p className="m-0 text-sm text-muted-foreground">Описание отсутствует.</p>}
              </div>
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-2">
      <dt className="font-medium">{label}</dt>
      <dd className="m-0 break-words text-muted-foreground">{value}</dd>
    </div>
  );
}

function VersionRefs({ item }: { item: VersionHistoryItem }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-muted-foreground">Технические ссылки</summary>
      <div className="mt-3 grid gap-3">
        {item.refs.map((ref, index) => (
          <dl key={`${ref.created_at_utc}-${index}`} className="m-0 grid gap-2 text-xs">
            <Metadata label="Источник" value={[ref.source_branch, ref.source_commit].filter(Boolean).join(" · ") || "—"} />
            <Metadata label="Назначение" value={[ref.target_branch, ref.target_commit].filter(Boolean).join(" · ") || "—"} />
            <Metadata label="Записано" value={moscowDateTime(ref.created_at_utc)} />
          </dl>
        ))}
      </div>
    </details>
  );
}

function safePullUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
