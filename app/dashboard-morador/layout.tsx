"use client";
import Navbar from "@/components/Navbar";

export default function DashboardMoradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar padrão do sistema */}
      <Navbar />

      {/* Conteúdo */}
      <main className="container mx-auto px-6 py-8 pt-20">{children}</main>
    </div>
  );
}