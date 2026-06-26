import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrightOsApp } from "@/features/app/BrightOsApp";
import { pendingInboxEvents } from "@/shared/storage/inboxStore";
import { setupBrightOsAppTest } from "./app-test-support";

describe("BrightOsApp inbox", () => {
  setupBrightOsAppTest();

  it("opens Inbox from the main dock and creates an incoming item without action statuses", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        media: "(max-width: 860px)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1200 });

    render(<BrightOsApp />);

    fireEvent.click(screen.getAllByRole("button", { name: "Inbox" }).at(-1) as HTMLElement);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Входящие" })).toBeInTheDocument());

    const input = screen.getByRole("textbox", { name: "Добавить входящее" });
    fireEvent.change(input, { target: { value: " Новое письмо " } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    const title = await screen.findByRole("textbox", { name: "Название входящего: Новое письмо" });
    expect(screen.queryByRole("checkbox", { name: "Новое письмо" })).not.toBeInTheDocument();
    expect(screen.queryByText("Выполнено")).not.toBeInTheDocument();
    expect(screen.getByText("Тип входящего")).toBeInTheDocument();

    fireEvent.click(title);
    await waitFor(() => expect(screen.getByRole("button", { name: "Закрыть редактор" })).toBeInTheDocument());
    const descriptionEditor = screen.getByRole("textbox", { name: "Описание входящего" });
    fireEvent.change(descriptionEditor, {
      target: { value: "# Контекст\n\n## Источник\n\n**важно**" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Читать описание" }));
    await waitFor(() => expect(screen.getByLabelText("MD просмотр описания входящего")).toHaveTextContent("Контекст"));
    fireEvent.click(screen.getByRole("button", { name: "Закрыть редактор" }));

    await waitFor(async () => {
      expect(await pendingInboxEvents()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "update_description",
            payload: { description_md: "# Контекст\n\n## Источник\n\n**важно**" },
          }),
        ]),
      );
    });
  });
});
