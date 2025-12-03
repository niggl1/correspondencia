import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "App Correspondência",
  description: "Gestão inteligente de condomínios",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Renderiza o conteúdo da página */}
      {children}
    </>
  );
}