"use client";

export default function DashboardResponsavelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Conteúdo */}
      <main>{children}</main>
    </div>
  );
}