import { expect, test } from "@playwright/test";
import { openProfileMenuItem, openSettingsFromProfile } from "./shell-helpers";

test("shows update-focused Settings without duplicate sync", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.locator(".section-page-current .mobile-menu-button").click();
  }
  await openSettingsFromProfile(page);

  await expect(page.getByRole("heading", { name: "Настройки" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Включить темную тему" })).toBeVisible();
  await page.getByRole("button", { name: "Включить темную тему" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Включить светлую тему" })).toBeVisible();
  await expect(page.getByRole("button", { name: /открыть выбор цвета/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Обновление" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Архив" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Синхронизация" })).toHaveCount(0);
  await expect(page.getByText("APK", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Выйти" })).toHaveCount(0);
});

test("opens Archive from the profile menu and restores a deleted action", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop-only archive flow");

  await page.goto("/");
  await page.getByRole("textbox", { name: "Добавить" }).fill("Архивируемое");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("textbox", { name: "Название действия: Архивируемое" })).toBeVisible();

  const row = page.locator(".action-row").first();
  const deleteButton = row.locator(".action-delete-button");
  await row.hover();
  await expect
    .poll(() => deleteButton.evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBeGreaterThan(0.2);
  await deleteButton.click();
  await expect(page.getByRole("textbox", { name: "Название действия: Архивируемое" })).toHaveCount(0);

  await openProfileMenuItem(page, "Архив");
  await expect(page.getByRole("heading", { name: "Архив" })).toBeVisible();
  await expect(page.getByText("Архивируемое")).toBeVisible();

  const archiveRow = page.locator(".action-row").first();
  const restoreButton = archiveRow.locator(".action-delete-button");
  await archiveRow.hover();
  await expect
    .poll(() => restoreButton.evaluate((element) => Number(getComputedStyle(element).opacity)))
    .toBeGreaterThan(0.2);
  await restoreButton.click();
  await expect(page.getByText("Архивируемое")).toHaveCount(0);

  await page.getByRole("button", { name: "Действия" }).last().click();
  await expect(page.getByRole("textbox", { name: "Название действия: Архивируемое" })).toBeVisible();
});

test("applies saved dark theme before client JavaScript runs", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("bright_os_theme_mode", "dark");
  });
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/, (route) => route.abort());

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(5, 6, 7)");
});
