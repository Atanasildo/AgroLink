import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Nav } from "@/components/Nav";
import { ServerWakeup } from "@/components/ServerWakeup";
import { WakingBanner } from "@/components/WakingBanner";
import { PWAInit } from "@/components/PWAInit";

export const metadata: Metadata = {
  title: "AgroLink — Da fazenda à mesa, sem perder a carga no caminho",
  description:
    "Marketplace agrícola, logística rural e aluguel de máquinas numa só plataforma. Conectando agricultores, compradores, transportadores e cooperativas em Angola.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AgroLink",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "AgroLink",
    title: "AgroLink — Plataforma AgriTech de Angola",
    description: "Marketplace agrícola, logística rural e aluguel de máquinas em Angola.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2d5016",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <AuthProvider>
          <PWAInit />
          <Nav />
          <ServerWakeup />
          <WakingBanner />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
