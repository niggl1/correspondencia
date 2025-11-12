import GerenciarBlocos from "@/components/GerenciarBlocos";
import Navbar from "@/components/Navbar";

export default function BlocosPage() {
  return (
    <div className="space-y-4">
      <Navbar />
      <main className="p-6 max-w-7xl mx-auto">
        <GerenciarBlocos />
      </main>
    </div>
  );
}