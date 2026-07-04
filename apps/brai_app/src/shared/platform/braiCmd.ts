import { registerPlugin } from "@capacitor/core";
import { isNativeShell, platformName } from "@/shared/platform/platform";

type BraiCmdPlugin = {
  openSettings(): Promise<unknown>;
};

const BraiCmd = registerPlugin<BraiCmdPlugin>("BraiCmd");

/** Opens the Brai Cmd native settings screen when the app runs inside Android. */
export async function openBraiCmdSettings(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    await BraiCmd.openSettings();
    return true;
  } catch {
    return false;
  }
}

function isNativeAndroid(): boolean {
  return isNativeShell() && platformName() === "android";
}
