"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAvisosRapidos } from "@/hooks/useAvisosRapidos";
import { AvisoRapido } from "@/types/avisoRapido.types";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import BotaoVoltar from "@/components/BotaoVoltar";
import { History, User, Phone, Home, Building2, Clock, Image as ImageIcon, ExternalLink } from "lucide-react";

function HistoricoAvisosResponsavelPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { buscarAvisos, buscarAvisosHoje, loading } = useAvisosRapidos();

  const [avisos, setAvisos] = useState<AvisoRapido[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "hoje">("hoje");

  useEffect(() => {
    if (user?.condominioId) {
      carregarAvisos();
    }
  }, [user, filtro]);

  const carregarAvisos = async () => {
    if (!user?.condominioId) return;

    if (filtro === "hoje") {
      const avisosHoje = await buscarAvisosHoje(user.condominioId);
      setAvisos(avisosHoje);
    } else {
      const todosAvisos = await buscarAvisos({ condominioId: user.condominioId });
      setAvisos(todosAvisos);
    }
  };

  // Função segura para converter Timestamp do Firestore
  const converterData = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate(); 
    if (timestamp instanceof Date) return timestamp; 
    return new Date(timestamp); 
  };

  const formatarData = (timestamp: any) => {
    const data = converterData(timestamp);
    if (!data) return "Data não disponível";
    
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);

    const horaStr = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    if (data.toDateString() === hoje.toDateString()) {
      return `Hoje às ${horaStr}`;
    } else if (data.toDateString() === ontem.toDateString()) {
      return `Ontem às ${horaStr}`;
    } else {
      return `${data.toLocaleDateString("pt-BR")} às ${horaStr}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        
        {/* Botão Voltar e Header */}
        <div className="mb-8">
          <BotaoVoltar url="/dashboard-responsavel" />

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#057321] rounded-xl shadow-sm p-6 mt-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-3 rounded-full shadow-md">
                <History className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Histórico de Avisos (Responsável)
              </h1>
            </div>
            <p className="text-gray-600 ml-14">
              Registro de todos os avisos rápidos enviados via WhatsApp
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFiltro("hoje")}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              filtro === "hoje"
                ? "bg-gradient-to-r from-[#057321] to-[#046119] text-white shadow-md"
                : "bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400"
            }`}
          >
            📅 Hoje
          </button>
          <button
            onClick={() => setFiltro("todos")}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              filtro === "todos"
                ? "bg-gradient-to-r from-[#057321] to-[#046119] text-white shadow-md"
                : "bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400"
            }`}
          >
            📋 Todos
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-md p-5 border-l-4 border-[#057321]">
            <p className="text-gray-600 text-sm font-medium mb-1">Total de Avisos</p>
            <p className="text-3xl font-bold text-[#057321]">{avisos.length}</p>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-md p-5 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Enviados Hoje</p>
            <p className="text-3xl font-bold text-blue-600">
              {avisos.filter(a => {
                 const data = converterData(a.dataEnvio);
                 if (!data) return false;
                 return data.toDateString() === new Date().toDateString();
              }).length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-md p-5 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Moradores Notificados</p>
            <p className="text-3xl font-bold text-purple-600">
              {new Set(avisos.map(a => a.moradorId)).size}
            </p>
          </div>
        </div>

        {/* Lista de Avisos */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando avisos...</p>
          </div>
        ) : avisos.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl p-8 text-center">
            <p className="text-yellow-800 font-semibold text-lg">
              📭 Nenhum aviso encontrado
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              {filtro === "hoje" 
                ? "Nenhum aviso foi enviado hoje ainda."
                : "Nenhum aviso foi registrado no sistema."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {avisos.map((aviso) => {
              const linkFoto = aviso.fotoUrl || aviso.imagemUrl;
              
              return (
                <div
                  key={aviso.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-6 border-l-4 border-[#057321]"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    
                    {/* Informações Principais */}
                    <div className="flex-1 space-y-3">
                      
                      {/* Morador */}
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-2 rounded-full">
                          <User className="text-white" size={18} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Morador</p>
                          <p className="font-bold text-gray-900 text-lg">{aviso.moradorNome}</p>
                        </div>
                      </div>

                      {/* Localização */}
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="text-gray-500" size={16} />
                          <span className="text-sm text-gray-700">
                            <strong>Bloco:</strong> {aviso.blocoNome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Home className="text-gray-500" size={16} />
                          <span className="text-sm text-gray-700">
                            <strong>Apto:</strong> {aviso.apartamento}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="text-gray-500" size={16} />
                          <span className="text-sm text-gray-700">
                            <strong>Tel:</strong> {aviso.moradorTelefone}
                          </span>
                        </div>
                      </div>

                      {/* Mensagem */}
                      {aviso.mensagem && (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-gray-600 mb-1">💬 Mensagem enviada:</p>
                          <p className="text-sm text-gray-800 italic">"{aviso.mensagem}"</p>
                          </div>
                      )}

                      {/* Link da Foto (Corrigido para evitar erro de window) */}
                      {linkFoto && (
                          <a 
                             href={`/ver/${aviso.id}`}
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-[#057321] border border-green-200 rounded-lg hover:bg-green-100 text-sm font-bold transition-colors mt-2"
                          >
                              <ImageIcon size={16} /> Ver foto anexada <ExternalLink size={12} />
                          </a>
                      )}

                    </div>

                    {/* Informações Secundárias */}
                    <div className="md:text-right space-y-2 md:min-w-[200px]">
                      
                      {/* Data e Hora */}
                      <div className="flex md:justify-end items-center gap-2">
                        <Clock className="text-[#057321]" size={16} />
                        <span className="text-sm font-semibold text-[#057321]">
                          {formatarData(aviso.dataEnvio)}
                        </span>
                      </div>

                      {/* Enviado Por */}
                      <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                        <p className="text-xs text-gray-600">Enviado por:</p>
                        <p className="text-sm font-bold text-gray-900">{aviso.enviadoPorNome}</p>
                        <p className="text-xs text-gray-500 capitalize">{aviso.enviadoPorRole}</p>
                      </div>

                      {/* Status */}
                      <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                        ✅ Enviado
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}

export default withAuth(HistoricoAvisosResponsavelPage, ["responsavel", "admin", "adminMaster"]);