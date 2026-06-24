import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const appInitScript = `(function(){try{var root=document.documentElement;var theme=window.localStorage.getItem("bright_os_theme_mode");var systemDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;root.dataset.theme=theme==="dark"||theme==="light"?theme:(systemDark?"dark":"light");root.dataset.sidebarState=/(^|; )sidebar_state=false(;|$)/.test(document.cookie)?"collapsed":"expanded";}catch(error){}})();`;

export const metadata: Metadata = {
  title: "Bright OS",
  description: "Приватное приложение Bright OS",
  applicationName: "Bright OS",
  appleWebApp: {
    capable: true,
    title: "Bright OS",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-dark.png", sizes: "64x64", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/icons/Icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6e6e6" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="dark" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: appInitScript,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
