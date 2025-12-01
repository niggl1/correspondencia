"use client";

import Navbar from "@/components/Navbar";
import MinhasCorrespondencias from "@/components/MinhasCorrespondencias"; // Certifique-se que o nome do arquivo é esse
import withAuth from "@/components/withAuth";

function MinhasCorrespondenciasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <MinhasCorrespondencias />
    </div>
  );
}

export default withAuth(MinhasCorrespondenciasPage, ["morador"]);