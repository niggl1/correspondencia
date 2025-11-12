"use client";

import { Suspense } from "react";
import GerenciarPorteiros from "@/components/GerenciarPorteiros";

export default function PorteirosResponsavelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Porteiros</h1>
        <p className="text-gray-600">Gerencie os porteiros do seu condomínio</p>
      </div>
      
      <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
        <GerenciarPorteiros />
      </Suspense>
    </div>
  );
}