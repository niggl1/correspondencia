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

      {/* Conteúdo Otimizado para Mobile e Desktop */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {children}
      </main>
    </div>
  );
}