import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setupBraiAppTest, stubAndroidCapacitor } from "./app-test-support";
import { BraiApp } from "@/features/app/BraiApp";
import { ONBOARDING_STORAGE_KEY } from "@/features/onboarding/onboardingModel";

describe("BraiApp onboarding", () => {
  setupBraiAppTest();

  it("shows the commissioning start screen before the normal shell on a fresh install", async () => {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);

    render(<BraiApp />);

    expect(await screen.findByRole("button", { name: "Приступить" })).toBeInTheDocument();
    expect(screen.queryByText("ВВОД В ЭКСПЛУАТАЦИЮ")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Добавить" })).not.toBeInTheDocument();
  });

  it("moves through the first welcome cards into the path choice", async () => {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);

    render(<BraiApp />);

    fireEvent.click(await screen.findByRole("button", { name: "Приступить" }));
    expect(screen.getByText("Brai рядом с вашим экраном")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Далее" }));
    fireEvent.click(screen.getByRole("button", { name: "Далее" }));
    fireEvent.click(screen.getByRole("button", { name: "Далее" }));
    fireEvent.click(screen.getByRole("button", { name: "Начать" }));

    expect(screen.getByText("Как запускаем Brai?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Начать с начала/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Есть профиль/ })).toBeInTheDocument();
  });

  it("keeps unauthenticated users inside the limited access screen after setup", async () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      complete: true,
      history: [],
      name: "Test",
      path: "new",
      profileVersion: null,
      step: "login-check",
      voiceMode: "provider",
    }));
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/auth/session")) {
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected protected request: ${url}`);
    });

    render(<BraiApp />);

    await waitFor(() => expect(screen.getByText("Нужен вход")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByRole("button", { name: "Войти" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Настройки Brai CMD" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Добавить" })).not.toBeInTheDocument();
  }, 10000);

  it("offers cloud and local voice recognition for a new setup", async () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      complete: false,
      history: [],
      name: "Test",
      path: "new",
      profileVersion: "self-hosted",
      step: "voice-choice",
      voiceMode: null,
    }));

    render(<BraiApp />);

    expect(await screen.findByText("Как распознавать голос?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Облачный модуль/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Локальная модель/ })).toBeInTheDocument();
  });

  it("uses a select for provider choice and mutes provider testing until the key is entered", async () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      complete: false,
      history: ["voice-choice"],
      name: "Test",
      path: "new",
      profileVersion: "self-hosted",
      step: "provider-key",
      voiceMode: "provider",
    }));

    render(<BraiApp />);

    expect(await screen.findByRole("combobox", { name: "Поставщик" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();
  });

  it("mutes overlay confirmation before opening Android settings", async () => {
    stubAndroidCapacitor();
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      complete: false,
      history: ["cloud-privacy"],
      name: "Test",
      path: "new",
      profileVersion: "cloud",
      step: "overlay",
      voiceMode: "cloud",
    }));

    render(<BraiApp />);

    expect(await screen.findByRole("button", { name: "Я включил" })).toBeDisabled();
    expect(screen.queryByText("Готово")).not.toBeInTheDocument();
  });

  it("does not pass voice training from manually typed text", async () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
      complete: false,
      history: ["training-start"],
      name: "Test",
      path: "new",
      profileVersion: "self-hosted",
      step: "training-dictate",
      voiceMode: "local",
    }));

    render(<BraiApp />);

    const input = await screen.findByRole("textbox", { name: "Результат голосового ввода" });
    fireEvent.change(input, { target: { value: "ручной текст" } });
    expect(screen.getByRole("button", { name: "Да, вставилось" })).toBeDisabled();
  });
});
