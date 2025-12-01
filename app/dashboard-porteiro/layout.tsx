import type { Metadata } from "next";
import Tradutor from "@/components/Tradutor"; 

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

      {/* Adiciona o Tradutor apenas nesta área do porteiro */}
      <Tradutor /> 
    </>
  );
}