"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Router importado
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { 
  Package, Search, AlertCircle, ArrowLeft, User, Home, Calendar, Clock, QrCode, X, Settings, MessageSquare, Loader2,
  FileDown, FileSpreadsheet, CheckSquare, Square, Filter
} from "lucide-react"; 
import Navbar from "@/components/Navbar"; 
import { useAuth } from "@/hooks/useAuth";
import MessageConfigModal from "@/components/MessageConfigModal";
import { Scanner } from '@yudiel/react-qr-scanner';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CorrespondenciaDocument extends DocumentData {
  id: string;
  protocolo: string;
  moradorNome: string;
  blocoNome: string;
  apartamento: string;
  condominioId: string;
  condominioNome: string;
  moradorId: string;
  status: string;
  dataChegada?: string; 
  tipoCorrespondencia?: string;
}

function RegistrarRetiradaResponsavelPage() {
  const router = useRouter(); // Hook de navegação
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [busca, setBusca] = useState<string>(""); 
  
  // --- ESTADOS REGISTRO (PENDENTES) ---
  const [todosPendentes, setTodosPendentes] = useState<CorrespondenciaDocument[]>([]);
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<CorrespondenciaDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [mostrarCamera, setMostrarCamera] = useState(false);
  
  // Filtros Pendentes
  const [filtroPendenteData, setFiltroPendenteData] = useState(""); 
  const [filtroPendenteBloco, setFiltroPendenteBloco] = useState("");
  const [filtroPendenteApto, setFiltroPendenteApto] = useState("");
  const [filtroPendenteMorador, setFiltroPendenteMorador] = useState("");
  const [selectedIdsPendentes, setSelectedIdsPendentes] = useState<string[]>([]);
  const [mostrarFiltrosPendentes, setMostrarFiltrosPendentes] = useState(false);

  const normalizeText = (text: string) => {
    return String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    if (user?.condominioId) {
        carregarDadosIniciais();
    }
  }, [user?.condominioId]);

  const carregarDadosIniciais = async () => {
      setLoading(true);
      try {
        const q = query(
            collection(db, "correspondencias"),
            where("condominioId", "==", user?.condominioId),
            where("status", "==", "pendente")
        );
        const snapshot = await getDocs(q);
        const dados: CorrespondenciaDocument[] = [];
        snapshot.forEach(doc => dados.push({ id: doc.id, ...doc.data() } as CorrespondenciaDocument));
        setTodosPendentes(dados);
        
        const paramQ = searchParams.get("q");
        if (paramQ) setBusca(paramQ);

      } catch (err) {
          console.error(err);
          setError("Falha ao carregar lista de pendências.");
      } finally {
          setLoading(false);
      }
  };

  // --- LÓGICA DE FILTRAGEM ---
  const pendentesFiltrados = useMemo(() => {
      return todosPendentes.filter(item => {
          const termo = normalizeText(busca);
          const matchBusca = 
            normalizeText(item.protocolo).includes(termo) ||
            normalizeText(item.apartamento).includes(termo) ||
            normalizeText(item.moradorNome).includes(termo) ||
            normalizeText(item.blocoNome || "").includes(termo);

          const matchBloco = normalizeText(item.blocoNome || "").includes(normalizeText(filtroPendenteBloco));
          const matchApto = normalizeText(item.apartamento).includes(normalizeText(filtroPendenteApto));
          const matchMorador = normalizeText(item.moradorNome || "").includes(normalizeText(filtroPendenteMorador));

          let matchData = true;
          if (filtroPendenteData && item.dataChegada) {
              const parts = item.dataChegada.split(" ")[0].split("/");
              if(parts.length === 3) {
                  const [dia, mes, ano] = parts;
                  const dataItemIso = `${ano}-${mes}-${dia}`;
                  matchData = dataItemIso === filtroPendenteData;
              }
          }

          return matchBusca && matchBloco && matchApto && matchMorador && matchData;
      });
  }, [todosPendentes, busca, filtroPendenteBloco, filtroPendenteApto, filtroPendenteMorador, filtroPendenteData]);

  // --- SELEÇÃO ---
  const toggleSelect = (id: string) => {
      setSelectedIdsPendentes(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedIdsPendentes.length === pendentesFiltrados.length && pendentesFiltrados.length > 0) {
          setSelectedIdsPendentes([]);
      } else {
          setSelectedIdsPendentes(pendentesFiltrados.map(i => i.id));
      }
  };

  // --- EXPORTAÇÃO ---
  const exportarExcel = () => {
      if (selectedIdsPendentes.length === 0) return alert("Selecione itens para exportar.");
      
      const dadosExportar = todosPendentes
          .filter(i => selectedIdsPendentes.includes(i.id))
          .map(i => ({
              Protocolo: i.protocolo,
              Data_Chegada: i.dataChegada,
              Morador: i.moradorNome,
              Unidade: `${i.blocoNome || ''} - ${i.apartamento}`,
              Status: 'Pendente'
          }));

      const ws = XLSX.utils.json_to_sheet(dadosExportar);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pendentes");
      XLSX.writeFile(wb, `Inventario_Pendentes_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarPDF = () => {
      if (selectedIdsPendentes.length === 0) return alert("Selecione itens para exportar.");
      const doc = new jsPDF();
      
      doc.text("Relatório de Pendências (Inventário)", 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

      const dados = todosPendentes.filter(i => selectedIdsPendentes.includes(i.id));
      const tableData = dados.map(i => [
          i.protocolo,
          i.dataChegada || "-",
          i.moradorNome,
          `${i.blocoNome || ''} - ${i.apartamento}`,
          "Aguardando Retirada"
      ]);

      autoTable(doc, {
          head: [['Protocolo', 'Data Chegada', 'Morador', 'Unidade', 'Status']],
          body: tableData,
          startY: 25,
      });

      doc.save(`Inventario_Pendentes.pdf`);
  };

  const verificarSeJaFoiRetirada = async () => {
    if (pendentesFiltrados.length > 0) return;
    setLoading(true);
    try {
        const termoNumero = Number(busca);
        if (!isNaN(termoNumero)) {
            const q = query(
                collection(db, "correspondencias"),
                where("condominioId", "==", user?.condominioId),
                where("protocolo", "==", termoNumero),
                where("status", "==", "retirada")
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                setError(`Protocolo #${busca} JÁ RETIRADO.`);
            } else {
                setError("Nada encontrado.");
            }
        } else {
            setError("Nada encontrado.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const processarLeitura = (conteudo: string) => {
    if (!conteudo) return;
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) {}
    let codigoLimpo = conteudo.trim();
    if (codigoLimpo.includes("/")) codigoLimpo = codigoLimpo.split("/").pop()!;
    setMostrarCamera(false);
    setBusca(codigoLimpo);
  };

  const handleRetiradaSuccess = () => {
    setShowModal(false);
    setCorrespondenciaSelecionada(null);
    setBusca("");
    if (correspondenciaSelecionada) {
        setTodosPendentes(prev => prev.filter(i => i.id !== correspondenciaSelecionada.id));
    }
    setError("");
    setSelectedIdsPendentes([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="min-h-screen flex flex-col items-center pt-24 pb-8 px-4">
        <div className="max-w-4xl w-full">
          
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard-responsavel')}
              className="group flex items-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:text-[#057321] transition-all font-bold mb-4 w-fit"
            >
              <ArrowLeft size={20} className="text-gray-500 group-hover:text-[#057321]" />
              Voltar para Dashboard
            </button>
            
            <div className="bg-white border-l-4 border-green-600 rounded-xl shadow-sm p-6 flex items-center justify-between flex-wrap gap-4">
               <div className="flex items-center gap-4">
                  <div className="bg-green-100 text-green-700 p-3 rounded-full">
                    <Package size={32} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Registrar Retirada
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Inventário e Baixas
                    </p>
                  </div>
               </div>
               
               {/* BOTÕES ALTERADOS PARA REDIRECIONAMENTO */}
               <div className="flex bg-gray-100 p-1 rounded-lg">
                  {/* Botão Pendentes (Esta página) - Fica sempre Ativo visualmente */}
                  <button 
                    disabled 
                    className="px-4 py-2 rounded-md text-sm font-bold bg-white text-green-700 shadow-sm cursor-default"
                  >
                    Pendentes
                  </button>
                  
                  {/* Botão Histórico - Redireciona para a outra página */}
                  <button 
                    onClick={() => router.push('/dashboard-responsavel/historico')}
                    className="px-4 py-2 rounded-md text-sm font-bold text-gray-500 hover:text-gray-700 transition-all hover:bg-gray-200/50"
                  >
                    Histórico
                  </button>
               </div>
            </div>
          </div>

            <div className="animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
                    <button onClick={() => router.push("/dashboard-responsavel/configuracoes-retirada")} className="flex-1 py-3 bg-white text-[#057321] rounded-lg shadow-sm border border-[#057321] hover:bg-green-50 transition-all flex items-center justify-center gap-2">
                        <Settings size={18} /> <span className="font-bold text-sm uppercase">Regras</span>
                    </button>
                    {user?.role !== 'porteiro' && (
                        <button onClick={() => setShowConfigModal(true)} className="flex-1 py-3 bg-[#057321] text-white rounded-lg shadow-md hover:bg-[#046019] transition-all flex items-center justify-center gap-2">
                            <MessageSquare size={18} /> <span className="font-bold text-sm uppercase">Mensagem</span>
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
                    {mostrarCamera ? (
                        <div className="mb-6 relative bg-black rounded-xl overflow-hidden shadow-inner aspect-video">
                        <button onClick={() => setMostrarCamera(false)} className="absolute top-2 right-2 z-20 bg-white/20 text-white p-2 rounded-full backdrop-blur-sm"><X size={24} /></button>
                        <Scanner onScan={(result) => result?.[0] && processarLeitura(result[0].rawValue)} styles={{ container: { width: '100%', height: '100%' } }} />
                        </div>
                    ) : (
                        <button onClick={() => setMostrarCamera(true)} className="w-full mb-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition-all">
                            <QrCode size={24} /> Ler QR Code
                        </button>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 relative mb-4">
                        <input
                            ref={inputRef}
                            autoFocus={!mostrarCamera}
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && verificarSeJaFoiRetirada()}
                            placeholder="Buscar Nome, Protocolo..."
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                        {loading && busca.length === 0 && <div className="absolute right-28 top-3"><Loader2 size={24} className="text-gray-400 animate-spin" /></div>}
                        <button onClick={() => verificarSeJaFoiRetirada()} disabled={!busca.trim() && pendentesFiltrados.length === 0} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium">
                            <Search size={20} /> Ir
                        </button>
                    </div>

                    <button onClick={() => setMostrarFiltrosPendentes(!mostrarFiltrosPendentes)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-700 mb-2">
                        <Filter size={16} /> {mostrarFiltrosPendentes ? "Ocultar Filtros" : "Filtros Avançados"}
                    </button>

                    {mostrarFiltrosPendentes && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 animate-in slide-in-from-top-2">
                             <div><label className="text-xs text-gray-500 font-semibold block mb-1">Data</label><input type="date" value={filtroPendenteData} onChange={(e) => setFiltroPendenteData(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /></div>
                             <div><label className="text-xs text-gray-500 font-semibold block mb-1">Bloco</label><input type="text" value={filtroPendenteBloco} onChange={(e) => setFiltroPendenteBloco(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /></div>
                             <div><label className="text-xs text-gray-500 font-semibold block mb-1">Apto</label><input type="text" value={filtroPendenteApto} onChange={(e) => setFiltroPendenteApto(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /></div>
                             <div><label className="text-xs text-gray-500 font-semibold block mb-1">Morador</label><input type="text" value={filtroPendenteMorador} onChange={(e) => setFiltroPendenteMorador(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /></div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 animate-fade-in">
                            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}
                </div>

                {pendentesFiltrados.length > 0 ? (
                    <div className="animate-fade-in space-y-4 pb-20">
                        <div className="flex justify-between items-center mb-2 px-2">
                            <h3 className="text-lg font-semibold text-gray-800">{pendentesFiltrados.length} encontrados</h3>
                            <button onClick={() => toggleSelectAll()} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-green-700">
                                {selectedIdsPendentes.length === pendentesFiltrados.length ? <CheckSquare size={20} className="text-green-600" /> : <Square size={20} />}
                                Todos
                            </button>
                        </div>

                        {pendentesFiltrados.map((item) => {
                             const isSelected = selectedIdsPendentes.includes(item.id);
                             return (
                                <div key={item.id} className={`bg-white p-5 rounded-xl border transition-all relative ${isSelected ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 hover:shadow-md'}`}>
                                    <div onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className="absolute top-5 right-5 cursor-pointer z-10">
                                        {isSelected ? <CheckSquare size={24} className="text-green-600" /> : <Square size={24} className="text-gray-300 hover:text-green-600" />}
                                    </div>

                                    <div onClick={() => { setCorrespondenciaSelecionada(item); setShowModal(true); }} className="cursor-pointer pr-10">
                                        <div className="flex gap-3">
                                            <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 h-fit">
                                                {item.tipoCorrespondencia?.toLowerCase().includes('encomenda') ? <Package size={32} /> : <Calendar size={24} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                    {item.tipoCorrespondencia || "Correspondência"} <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border">#{item.protocolo}</span>
                                                </p>
                                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1"><User size={14} /> {item.moradorNome}</span>
                                                    <span className="flex items-center gap-1"><Home size={14} /> {item.blocoNome} - {item.apartamento}</span>
                                                    {item.dataChegada && <span className="flex items-center gap-1"><Clock size={14} /> {item.dataChegada}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 ml-14">
                                            <span className="text-green-600 font-medium text-xs bg-green-50 px-3 py-1 rounded-lg">Clique para registrar saída</span>
                                        </div>
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                ) : (
                    !loading && (busca.length > 0 || filtroPendenteBloco) && !error && (
                        <div className="text-center py-8 text-gray-400">Nada encontrado.</div>
                    )
                )}

                 {selectedIdsPendentes.length > 0 && (
                      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                          <span className="font-bold whitespace-nowrap text-sm">{selectedIdsPendentes.length} Sel.</span>
                          <button onClick={exportarPDF} className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors text-sm"><FileDown size={16} /> PDF</button>
                          <button onClick={exportarExcel} className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors text-sm"><FileSpreadsheet size={16} /> Excel</button>
                          <button onClick={() => setSelectedIdsPendentes([])} className="ml-2 text-xs underline opacity-80 hover:opacity-100">Limpar</button>
                      </div>
                  )}
            </div>

          {showModal && correspondenciaSelecionada && (
            <ModalRetiradaProfissional
              correspondencia={correspondenciaSelecionada as any} 
              onClose={() => { setShowModal(false); setCorrespondenciaSelecionada(null); setTimeout(() => inputRef.current?.focus(), 100); }}
              onSuccess={handleRetiradaSuccess}
            />
          )}

          {user?.condominioId && (
            <MessageConfigModal
              isOpen={showConfigModal}
              onClose={() => setShowConfigModal(false)}
              condoId={user.condominioId}
              category="PICKUP"
            />
          )}

        </div>
      </div>
    </div>
  );
}

export default withAuth(RegistrarRetiradaResponsavelPage, ["porteiro", "responsavel", "adminMaster"]);