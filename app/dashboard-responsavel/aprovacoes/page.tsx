import AprovarMoradores from "@/components/AprovarMoradores";
import Navbar from "@/components/Navbar";

export default function AprovacoesPage() {
  return (
    <div className="space-y-4">
      <Navbar />
      <main className="p-6 max-w-7xl mx-auto">
        <AprovarMoradores />
      </main>
    </div>
  );
}