import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "world.brightos.brai",
  appName: "Brai",
  webDir: "out",
  android: {
    path: "android",
    appendUserAgent: " BraiNative/1",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
