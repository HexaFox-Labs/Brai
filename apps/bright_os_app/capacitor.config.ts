import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "world.brightos.bright_os_client",
  appName: "Bright OS",
  webDir: "out",
  android: {
    path: "android",
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
