import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VersionHistoryItem, VersionHistoryPage } from "@/shared/api/braiApi";
import { VersionHistoryPanel } from "@/features/app/sections/engine/VersionHistoryPanel";

describe("VersionHistoryPanel", () => {
  it("filters future types, paginates, and exposes complete safe PR metadata", async () => {
    const api = {
      versionHistory: vi.fn()
        .mockResolvedValueOnce(page([historyItem(3, "build", {
          pull_requests: [pullRequest("javascript:alert(1)", "Текст\n<script>alert('x')</script>")],
        })], "older"))
        .mockResolvedValueOnce(page([historyItem(2, "apk")]))
        .mockResolvedValueOnce(page([historyItem(1, "macos")], null)),
    };
    const view = render(<VersionHistoryPanel api={api} />);

    expect(screen.getByRole("status")).toHaveTextContent("Загружаем историю");
    expect(await screen.findByRole("heading", { name: "Работа 3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Все" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("PR #303 — PR 303").closest("a")).toBeNull();
    expect(view.container.querySelector("script")).toBeNull();
    expect(screen.getByText("Полные данные PR #303")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Показать более ранние" }));
    expect(await screen.findByRole("heading", { name: "Работа 2" })).toBeInTheDocument();
    expect(api.versionHistory).toHaveBeenLastCalledWith({ type: null, cursor: "older", limit: 30 });

    fireEvent.click(screen.getByRole("button", { name: "macOS" }));
    expect(await screen.findByRole("heading", { name: "Работа 1" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Работа 3" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "macOS" })).toHaveAttribute("aria-pressed", "true");
    expect(api.versionHistory).toHaveBeenLastCalledWith({ type: "macos", cursor: null, limit: 30 });
  });

  it("keeps loaded versions when pagination fails and retries the failed cursor", async () => {
    const api = {
      versionHistory: vi.fn()
        .mockResolvedValueOnce(page([historyItem(3, "build")], "older"))
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(page([historyItem(2, "build")], null)),
    };
    render(<VersionHistoryPanel api={api} />);

    expect(await screen.findByRole("heading", { name: "Работа 3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Показать более ранние" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("История не загрузилась");
    expect(screen.getByRole("heading", { name: "Работа 3" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByRole("heading", { name: "Работа 2" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.versionHistory).toHaveBeenLastCalledWith({ type: null, cursor: "older", limit: 30 });
  });

  it("ignores a stale filter response and explains empty and no-PR states", async () => {
    const build = deferred<VersionHistoryPage>();
    const macos = deferred<VersionHistoryPage>();
    const api = {
      versionHistory: vi.fn()
        .mockResolvedValueOnce(page([historyItem(3, "build", { pull_requests: [] })]))
        .mockImplementationOnce(() => build.promise)
        .mockImplementationOnce(() => macos.promise),
    };
    render(<VersionHistoryPanel api={api} />);

    expect(await screen.findByText("Нет связанных pull request.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Сборка" }));
    await waitFor(() => expect(api.versionHistory).toHaveBeenLastCalledWith({ type: "build", cursor: null, limit: 30 }));
    fireEvent.click(screen.getByRole("button", { name: "macOS" }));
    macos.resolve(page([], null));
    expect(await screen.findByText("Для выбранного типа версий пока нет.")).toBeInTheDocument();
    build.resolve(page([historyItem(9, "build")], null));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Работа 9" })).not.toBeInTheDocument());
  });
});

function page(items: VersionHistoryItem[], nextCursor: string | null = null): VersionHistoryPage {
  return {
    items,
    types: [
      { id: "build", title: "Сборка" },
      { id: "apk", title: "APK" },
      { id: "macos", title: "macOS" },
    ],
    next_cursor: nextCursor,
  };
}

function historyItem(id: number, type: string, patch: Partial<VersionHistoryItem> = {}): VersionHistoryItem {
  return {
    id,
    type,
    version: id,
    short_changes: `Работа ${id}`,
    detailed_changes: `Подробности работы ${id}`,
    reason: `Причина ${id}`,
    released_at_utc: `2026-07-${String(10 + id).padStart(2, "0")}T10:00:00.000Z`,
    created_at_utc: `2026-07-${String(10 + id).padStart(2, "0")}T10:00:00.000Z`,
    work: { key: `work_${id}`, status: "finalized", created_at_utc: "2026-07-10T10:00:00.000Z", updated_at_utc: "2026-07-10T10:00:00.000Z", finalized_at_utc: "2026-07-10T10:00:00.000Z" },
    details: [{ id, title: `Изменение ${id}`, description: `Результат ${id}`, display_order: 1, pull_request_id: null }],
    pull_requests: [],
    refs: [{ source_branch: `codex/work-${id}`, source_commit: `source-${id}`, target_branch: "main", target_commit: `target-${id}`, created_at_utc: "2026-07-10T10:00:00.000Z" }],
    ...patch,
  };
}

function pullRequest(url: string, body: string) {
  return {
    id: 303,
    role: "owner" as const,
    repository: "sergobright/Brai",
    number: 303,
    url,
    title: "PR 303",
    body,
    author_login: "sergobright",
    state: "MERGED",
    is_draft: false,
    head_branch: "codex/work-303",
    base_branch: "main",
    merge_commit_sha: "abc303",
    created_at_utc: "2026-07-10T10:00:00.000Z",
    updated_at_utc: "2026-07-11T10:00:00.000Z",
    closed_at_utc: "2026-07-11T10:00:00.000Z",
    merged_at_utc: "2026-07-11T10:00:00.000Z",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
