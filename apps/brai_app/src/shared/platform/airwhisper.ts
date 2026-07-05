import { registerPlugin } from "@capacitor/core";
import { isNativeShell, platformName } from "@/shared/platform/platform";

export type BraiAirWhisperState = {
  native?: boolean;
  settingsDeclared?: boolean;
  accessibilityServiceDeclared?: boolean;
  accessibilityServiceEnabled?: boolean;
  recordingServiceDeclared?: boolean;
  overlayDeclared?: boolean;
  overlayGranted?: boolean;
  microphoneDeclared?: boolean;
  microphoneForegroundServiceDeclared?: boolean;
  microphoneGranted?: boolean;
  notificationsDeclared?: boolean;
  notificationsGranted?: boolean;
  dataSyncForegroundServiceDeclared?: boolean;
  networkStateDeclared?: boolean;
  vibrateDeclared?: boolean;
};

type BraiAirWhisperPlugin = {
  getState(): Promise<BraiAirWhisperState>;
  openSettings(): Promise<BraiAirWhisperState>;
  openAccessibilitySettings(): Promise<BraiAirWhisperState>;
  openOverlaySettings(): Promise<BraiAirWhisperState>;
  requestMicrophone(): Promise<BraiAirWhisperState>;
  requestNotifications(): Promise<BraiAirWhisperState>;
};

const BraiAirWhisper = registerPlugin<BraiAirWhisperPlugin>("BraiAirWhisper");

/** Returns the native AirWhisper permission/service state inside the Android APK. */
export async function getAirWhisperState(): Promise<BraiAirWhisperState | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await BraiAirWhisper.getState();
  } catch {
    return null;
  }
}

/** Opens the native AirWhisper settings screen bundled into Brai Android. */
export async function openAirWhisperSettings(): Promise<BraiAirWhisperState | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await BraiAirWhisper.openSettings();
  } catch {
    return null;
  }
}

/** Opens Android accessibility settings for enabling the AirWhisper service. */
export async function openAirWhisperAccessibilitySettings(): Promise<BraiAirWhisperState | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await BraiAirWhisper.openAccessibilitySettings();
  } catch {
    return null;
  }
}

/** Opens Android overlay permission settings for AirWhisper floating controls. */
export async function openAirWhisperOverlaySettings(): Promise<BraiAirWhisperState | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await BraiAirWhisper.openOverlaySettings();
  } catch {
    return null;
  }
}

/** Requests Android microphone permission for AirWhisper recording. */
export async function requestAirWhisperMicrophone(): Promise<BraiAirWhisperState | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await BraiAirWhisper.requestMicrophone();
  } catch {
    return null;
  }
}

/** Requests Android notification permission for AirWhisper foreground recording status. */
export async function requestAirWhisperNotifications(): Promise<BraiAirWhisperState | null> {
  if (!isNativeAndroid()) return null;
  try {
    return await BraiAirWhisper.requestNotifications();
  } catch {
    return null;
  }
}

function isNativeAndroid(): boolean {
  return isNativeShell() && platformName() === "android";
}
