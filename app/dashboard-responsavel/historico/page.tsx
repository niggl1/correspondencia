"use client";

import HistoricoRetiradas from "@/components/HistoricoRetiradas";
import withAuth from "@/components/withAuth";

function HistoricoResponsavelPage() {
  return (
    <>
      {/* Componente de Navbar pode ser incluído aqui se necessário, ou já vir do layout */}
      <HistoricoRetiradas 
        voltarUrl="/dashboard-responsavel" 
        tituloPerfil="Administração/Síndico"
      />
    </>
  );
}

export default withAuth(HistoricoResponsavelPage, ["responsavel", "admin", "adminMaster"]);