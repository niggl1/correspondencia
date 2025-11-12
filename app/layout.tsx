import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Código Melhorado",
  description: "Admin de Porteiros - Demo/Real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <div className="container-app">
          {children}
        </div>
      </body>
    </html>
  );
}
