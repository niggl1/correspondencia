import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Painel do Porteiro",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16 px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
