"use client";

import HistoricoRetiradas from "@/components/HistoricoRetiradas";
import withAuth from "@/components/withAuth";

function HistoricoPorteiroPage() {
  return (
    <>
      <HistoricoRetiradas 
        voltarUrl="/dashboard-porteiro/avisos-rapidos" 
        tituloPerfil="Histórico de Avisos (Portaria)"
      />
    </>
  );
}

export default withAuth(HistoricoPorteiroPage, ["porteiro", "admin", "adminMaster", "responsavel"]);