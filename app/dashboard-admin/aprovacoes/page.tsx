"use client";

import { Suspense } from "react";
import AprovarMoradores from "@/components/AprovarMoradores";

export default function AprovacoesAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aprovar Moradores</h1>
        <p className="text-gray-600">Aprove ou rejeite cadastros de moradores pendentes</p>
      </div>
      
      <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
        <AprovarMoradores />
      </Suspense>
    </div>
  );
}
