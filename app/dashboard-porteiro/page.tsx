"use client";

import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import { Package, Send, QrCode, ClipboardCheck } from "lucide-react";

function PorteiroPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Painel do Porteiro
        </h1>
        <p className="text-gray-600 mb-8">
          Gerencie as correspondências do condomínio
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nova Correspondência */}
          <button
            onClick={() => router.push("/dashboard-porteiro/nova-correspondencia")}
            className="bg-primary-600 p-8 rounded-lg shadow hover:shadow-lg transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white rounded-full p-4">
                <Package className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Nova Correspondência
                </h2>
                <p className="text-primary-100 mt-2">
                  Registrar chegada de correspondência
                </p>
              </div>
            </div>
          </button>

          {/* Avisos Enviados */}
          <button
            onClick={() => router.push("/dashboard-porteiro/correspondencias")}
            className="bg-primary-600 p-8 rounded-lg shadow hover:shadow-lg transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white rounded-full p-4">
                <Send className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Avisos Enviados
                </h2>
                <p className="text-primary-100 mt-2">
                  Ver todas as correspondências
                </p>
              </div>
            </div>
          </button>

          {/* Ler QR Code */}
          <button
            onClick={() => router.push("/dashboard-porteiro/ler-qrcode")}
            className="bg-primary-600 p-8 rounded-lg shadow hover:shadow-lg transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white rounded-full p-4">
                <QrCode className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Ler QR Code
                </h2>
                <p className="text-primary-100 mt-2">
                  Escanear QR Code da correspondência
                </p>
              </div>
            </div>
          </button>

          {/* Registrar Retirada */}
          <button
            onClick={() => router.push("/dashboard-porteiro/registrar-retirada")}
            className="bg-primary-600 p-8 rounded-lg shadow hover:shadow-lg transition-all"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white rounded-full p-4">
                <ClipboardCheck className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Registrar Retirada
                </h2>
                <p className="text-primary-100 mt-2">
                  Buscar correspondência pelo protocolo
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default withAuth(PorteiroPage, ["porteiro", "responsavel", "adminMaster"]);