"use client";

import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import { Package, Send, ClipboardCheck, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";

function PorteiroPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* 1. Navbar Fixa */}
      <Navbar />

      {/* 2. Espaçamento Ajustado */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Painel do Porteiro
          </h1>
          <p className="text-gray-600">
            Gerencie as correspondências do condomínio
          </p>
        </div>

        {/* Grid 2x2 Perfeito */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Nova Correspondência */}
          <button
            onClick={() => router.push("/dashboard-porteiro/nova-correspondencia")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <Package className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Nova Correspondência
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Registrar chegada de correspondência
                </p>
              </div>
            </div>
          </button>

          {/* 2. Avisos Rápidos (TROCA FEITA AQUI) */}
          <button
            onClick={() => router.push("/dashboard-porteiro/avisos-rapidos")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Avisos Rápidos
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Enviar avisos via WhatsApp e Histórico
                </p>
              </div>
            </div>
          </button>

          {/* 3. Avisos Enviados */}
          <button
            onClick={() => router.push("/dashboard-porteiro/correspondencias")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <Send className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Avisos Enviados
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Ver todas as correspondências
                </p>
              </div>
            </div>
          </button>

          {/* 4. Registrar Retirada (TROCA FEITA AQUI) */}
          <button
            onClick={() => router.push("/dashboard-porteiro/registrar-retirada")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <ClipboardCheck className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Registrar Retirada
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Buscar por Nome, Apto ou QR Code
                </p>
              </div>
            </div>
          </button>

        </div>
      </main>
    </div>
  );
}

export default withAuth(PorteiroPage, ["porteiro", "responsavel", "adminMaster"]);