import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "App Correspondência",
  description: "Sistema de Gestão de Correspondência",
  manifest: "/manifest.json",
  // 👇 Instrução para o Google não oferecer tradução
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 👇 Adicionado translate="no"
    <html lang="pt-BR" translate="no">
      {/* 👇 Adicionado a classe 'notranslate' que força o bloqueio visual */}
      <body className="min-h-screen bg-gray-50 antialiased notranslate">
        {children}
      </body>
    </html>
  );
}