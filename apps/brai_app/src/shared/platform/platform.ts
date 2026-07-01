declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
    BraiAndroidBack?: () => boolean;
    BraiAndroidTimerStop?: () => boolean;
  }
}

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

export function platformName(): "android" | "web" {
  if (typeof window === "undefined") return "web";
  return window.Capacitor?.getPlatform?.() === "android" ? "android" : "web";
}

const androidBackHandlers: Array<() => boolean> = [];
let previousAndroidBackHandler: (() => boolean) | undefined;

function runAndroidBackHandlers(): boolean {
  for (let index = androidBackHandlers.length - 1; index >= 0; index -= 1) {
    if (androidBackHandlers[index]()) return true;
  }
  return previousAndroidBackHandler?.() ?? false;
}

export function installAndroidBackHandler(handler: () => boolean): () => void {
  if (typeof window === "undefined") return () => {};
  if (androidBackHandlers.length === 0) {
    previousAndroidBackHandler = window.BraiAndroidBack;
    window.BraiAndroidBack = runAndroidBackHandlers;
  }
  androidBackHandlers.push(handler);
  return () => {
    const index = androidBackHandlers.lastIndexOf(handler);
    if (index >= 0) androidBackHandlers.splice(index, 1);
    if (androidBackHandlers.length === 0 && window.BraiAndroidBack === runAndroidBackHandlers) {
      window.BraiAndroidBack = previousAndroidBackHandler;
      previousAndroidBackHandler = undefined;
    }
  };
}
