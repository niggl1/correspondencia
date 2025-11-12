"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { Package, Search, AlertCircle } from "lucide-react";

function RegistrarRetiradaPage() {
  const router = useRouter();
  const [protocolo, setProtocolo] = useState("");
  const [correspondencia, setCorrespondencia] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const buscarCorrespondencia = async () => {
    if (!protocolo.trim()) {
      setError("Digite um número de protocolo");
      return;
    }

    setLoading(true);
    setError("");
    setCorrespondencia(null);

    try {
      const q = query(
        collection(db, "correspondencias"),
        where("protocolo", "==", protocolo.trim())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Correspondência não encontrada");
        setLoading(false);
        return;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      // Verificar se já foi retirada
      if (data.status === "retirada") {
        setError("Esta correspondência já foi retirada");
        setLoading(false);
        return;
      }

      setCorrespondencia({
        id: doc.id,
        ...data,
      });

      setShowModal(true);
    } catch (err) {
      console.error("Erro ao buscar correspondência:", err);
      setError("Erro ao buscar correspondência. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetiradaSuccess = () => {
    setShowModal(false);
    setCorrespondencia(null);
    setProtocolo("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Package className="text-primary-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Registrar Retirada
                </h1>
                <p className="text-sm text-gray-600">
                  Busque a correspondência pelo protocolo
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard-porteiro")}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número do Protocolo
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={protocolo}
              onChange={(e) => {
                setProtocolo(e.target.value);
                setError("");
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  buscarCorrespondencia();
                }
              }}
              placeholder="Digite o protocolo (ex: CORR-2024-001)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              onClick={buscarCorrespondencia}
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Search size={20} />
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
          <h3 className="font-semibold text-primary-900 mb-3">
            Como usar:
          </h3>
          <ol className="space-y-2 text-sm text-primary-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Digite o número do protocolo da correspondência</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Clique em "Buscar" ou pressione Enter</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Preencha os dados de retirada no formulário</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Colete as assinaturas necessárias</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">5.</span>
              <span>Confirme a retirada para gerar o recibo</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Modal */}
      {showModal && correspondencia && (
        <ModalRetiradaProfissional
          correspondencia={correspondencia}
          onClose={() => {
            setShowModal(false);
            setCorrespondencia(null);
          }}
          onSuccess={handleRetiradaSuccess}
        />
      )}
    </div>
  );
}

export default withAuth(RegistrarRetiradaPage, ["porteiro", "responsavel", "adminMaster"]);