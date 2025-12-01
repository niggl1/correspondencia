"use client";

import { Suspense } from "react";
import GerenciarResponsaveis from "@/components/GerenciarResponsaveis";

// Aqui não precisamos pegar o ID do condomínio da URL obrigatoriamente,
// pois o Admin Master pode querer ver TODOS os responsáveis de TODOS os condomínios.
// Mas se quisermos filtrar, podemos usar a mesma lógica.
// Por padrão, a página de responsáveis costuma listar todos.

export default function ResponsaveisAdminPage() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Responsáveis</h1>
        <p className="text-gray-600">Adicione, edite ou remova síndicos e zeladores.</p>
      </div>
      
      <GerenciarResponsaveis />
    </div>
  );
}