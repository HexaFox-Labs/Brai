import { registerPlugin } from "@capacitor/core";
import { isNativeShell, platformName } from "@/shared/platform/platform";

type BrightTimerNotificationPlugin = {
  start(options: { startedAtUtc: string }): Promise<void>;
  stop(): Promise<void>;
  consumeStopRequest(): Promise<{ requested: boolean }>;
};

const BrightTimerNotification = registerPlugin<BrightTimerNotificationPlugin>("BrightTimerNotification");

export async function startAndroidTimerNotification(startedAtUtc: string | null | undefined): Promise<void> {
  if (!startedAtUtc || !isAndroidShell()) return;
  try {
    await BrightTimerNotification.start({ startedAtUtc });
  } catch {
    // Old APKs, denied notification permission, and browser-like shells keep the timer working.
  }
}

export async function stopAndroidTimerNotification(): Promise<void> {
  if (!isAndroidShell()) return;
  try {
    await BrightTimerNotification.stop();
  } catch {
    // Notification bridge is best-effort; the timer state remains source of truth.
  }
}

export async function consumeAndroidTimerStopRequest(): Promise<boolean> {
  if (!isAndroidShell()) return false;
  try {
    return Boolean((await BrightTimerNotification.consumeStopRequest()).requested);
  } catch {
    return false;
  }
}

function isAndroidShell(): boolean {
  return isNativeShell() && platformName() === "android";
}
