"use client";

import { Suspense } from "react";
import GerenciarUnidades from "@/components/GerenciarUnidades";

export default function UnidadesAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Unidades</h1>
        <p className="text-gray-600">Gerencie as unidades do condomínio selecionado</p>
      </div>
      
      <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
        <GerenciarUnidades />
      </Suspense>
    </div>
  );
}
