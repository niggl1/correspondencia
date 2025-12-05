"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { 
  Package, Search, AlertCircle, ArrowLeft, User, Home, Calendar, Clock, QrCode, X, Settings, MessageSquare, Loader2 
} from "lucide-react"; 
import Navbar from "@/components/Navbar"; 
import { useAuth } from "@/hooks/useAuth";
import MessageConfigModal from "@/components/MessageConfigModal";
import { Scanner } from '@yudiel/react-qr-scanner';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [busca, setBusca] = useState<string>(""); 
  
  // Estados de Dados
  const [todosPendentes, setTodosPendentes] = useState<CorrespondenciaDocument[]>([]); // "Memória" local
  const [listaResultados, setListaResultados] = useState<CorrespondenciaDocument[]>([]); // O que aparece na tela
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<CorrespondenciaDocument | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true); // Começa carregando os dados iniciais
  const [error, setError] = useState<string>("");
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  const [mostrarCamera, setMostrarCamera] = useState(false);

  // Função auxiliar para normalizar texto (remover acentos e minúsculas)
  const normalizeText = (text: string) => {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  // --- 1. CARREGAMENTO INICIAL DOS DADOS ---
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
        snapshot.forEach(doc => {
            dados.push({ id: doc.id, ...doc.data() } as CorrespondenciaDocument);
        });

        setTodosPendentes(dados);
        
        // Se tiver parametro na URL, já filtra
        const paramQ = searchParams.get("q");
        if (paramQ) {
            setBusca(paramQ);
        }

      } catch (err) {
          console.error("Erro ao carregar pendentes:", err);
          setError("Falha ao carregar lista de pendências.");
      } finally {
          setLoading(false);
      }
  };

  // --- 2. FILTRAGEM INTELIGENTE (REAL-TIME) ---
  useEffect(() => {
      const termo = normalizeText(busca);

      if (!termo) {
          setListaResultados([]);
          setError("");
          return;
      }

      // Filtra na memória (muito rápido)
      const resultados = todosPendentes.filter(item => {
          const protocolo = String(item.protocolo);
          const apto = normalizeText(String(item.apartamento));
          const bloco = normalizeText(String(item.blocoNome || ""));
          const morador = normalizeText(item.moradorNome || "");

          // Lógica de busca:
          // 1. Protocolo exato ou contendo (se for numero)
          if (protocolo.includes(termo)) return true;
          
          // 2. Apartamento exato
          if (apto === termo) return true;

          // 3. Nome do morador (contém)
          if (morador.includes(termo)) return true;

          // 4. Bloco + Apto (Ex: digitar "bloco A" acha bloco A)
          if (bloco.includes(termo)) return true;

          return false;
      });

      setListaResultados(resultados);
      
      if (resultados.length === 0 && termo.length > 2) {
         // Se digitou algo longo e não achou nada nas pendentes, pode ser que já tenha sido retirado.
         // Não mostramos erro imediatamente para não poluir, apenas se ele apertar ENTER.
      } else {
          setError("");
      }

  }, [busca, todosPendentes]);

  // --- 3. BUSCA NO SERVIDOR (APENAS PARA VERIFICAR RETIRADOS) ---
  // Essa função só é chamada se o usuário apertar ENTER ou clicar em IR
  // e não tiver encontrado nada na lista local de pendentes.
  const verificarSeJaFoiRetirada = async () => {
    if (listaResultados.length > 0) return; // Se já achou pendente, não faz nada

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
                setError(`A correspondência protocolo #${busca} JÁ FOI RETIRADA.`);
            } else {
                setError("Nenhuma correspondência encontrada.");
            }
        } else {
            setError("Nenhuma correspondência pendente encontrada.");
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
    if (codigoLimpo.includes("/")) {
        const partes = codigoLimpo.split("/");
        codigoLimpo = partes[partes.length - 1];
    }

    setMostrarCamera(false);
    setBusca(codigoLimpo);
    // O useEffect vai filtrar automaticamente
  };

  const handleSelecionarDaLista = (item: CorrespondenciaDocument) => {
    setCorrespondenciaSelecionada(item);
    setShowModal(true);
  };

  const handleRetiradaSuccess = () => {
    setShowModal(false);
    setCorrespondenciaSelecionada(null);
    setBusca("");
    // Atualiza a lista local removendo o item retirado sem precisar recarregar tudo do banco
    if (correspondenciaSelecionada) {
        setTodosPendentes(prev => prev.filter(i => i.id !== correspondenciaSelecionada.id));
    }
    setListaResultados([]);
    setError("");
    setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="min-h-screen flex flex-col items-center pt-24 pb-8 px-4">
        <div className="max-w-2xl w-full">
          
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="group flex items-center gap-3 bg-white text-gray-700 px-6 py-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#057321] hover:text-[#057321] transition-all duration-200 font-bold mb-6 text-lg w-fit"
            >
              <ArrowLeft size={20} className="text-gray-500 group-hover:text-[#057321]" />
              Voltar para Dashboard
            </button>
            
            <div className="bg-white border-l-4 border-green-600 rounded-xl shadow-sm p-6 flex items-center gap-4">
              <div className="bg-green-100 text-green-700 p-3 rounded-full">
                <Package size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Registrar Retirada</h1>
                <p className="text-gray-500 text-sm">Busque por protocolo, apartamento ou nome</p>
              </div>
            </div>
          </div>

          {/* --- BOTÕES DE AÇÃO E CONFIGURAÇÃO --- */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
              <button
                onClick={() => router.push("/dashboard-responsavel/configuracoes-retirada")}
                className="flex-1 py-3 bg-white text-[#057321] rounded-lg shadow-sm hover:shadow-md hover:bg-green-50 transition-all flex items-center justify-center gap-2 border border-[#057321]"
              >
                  <Settings size={18} />
                  <span className="font-bold text-sm uppercase">Regras de Retirada</span>
              </button>

              {user?.role !== 'porteiro' && (
                <button
                    onClick={() => setShowConfigModal(true)}
                    className="flex-1 py-3 bg-[#057321] text-white rounded-lg shadow-md hover:bg-[#046019] transition-all flex items-center justify-center gap-2 border border-[#046019]"
                >
                    <MessageSquare size={18} />
                    <span className="font-bold text-sm uppercase">Mensagem WhatsApp</span>
                </button>
              )}
          </div>
        
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            
            {mostrarCamera ? (
               <div className="mb-6 relative bg-black rounded-xl overflow-hidden shadow-inner">
                  <button 
                    onClick={() => setMostrarCamera(false)}
                    className="absolute top-2 right-2 z-20 bg-white/20 text-white p-2 rounded-full backdrop-blur-sm hover:bg-red-500 transition-colors"
                  >
                    <X size={24} />
                  </button>
                  <div className="aspect-square sm:aspect-video w-full max-w-sm mx-auto">
                    <Scanner 
                        onScan={(result) => {
                            if (result && result.length > 0) {
                                processarLeitura(result[0].rawValue);
                            }
                        }}
                        onError={(err) => console.log(err)}
                        components={{ onOff: false, torch: false, zoom: false, finder: true }}
                        styles={{ container: { width: '100%', height: '100%' } }}
                    />
                  </div>
                  <p className="text-center text-white text-sm py-2">Aponte para o QR Code</p>
               </div>
            ) : (
                <>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Buscar Correspondência (Busca Automática)
                    </label>

                    <button
                    onClick={() => setMostrarCamera(true)}
                    className="w-full mb-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <QrCode size={24} />
                        Ler QR Code
                    </button>
                </>
            )}

            <div className="flex flex-col sm:flex-row gap-3 relative">
              <input
                ref={inputRef}
                autoFocus={!mostrarCamera}
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verificarSeJaFoiRetirada()}
                placeholder="Comece a digitar Nome, Protocolo ou Apto..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all pr-10"
              />
              {loading && busca.length === 0 && (
                 <div className="absolute right-28 top-3">
                     <Loader2 size={24} className="text-gray-400 animate-spin" />
                 </div>
              )}

              <button
                onClick={() => verificarSeJaFoiRetirada()}
                disabled={!busca.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
              >
                <Search size={20} />
                Ir
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 animate-fade-in">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>

          {listaResultados.length > 0 ? (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 px-1 flex justify-between items-center">
                <span>Encontramos {listaResultados.length} correspondência(s)</span>
              </h3>
              <div className="grid gap-4">
                {listaResultados.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-green-400 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleSelecionarDaLista(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 h-fit">
                          {item.tipoCorrespondencia?.toLowerCase().includes('encomenda') ? <Package size={32} /> : <Calendar size={24} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            {item.tipoCorrespondencia || "Correspondência"}
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border">
                              #{item.protocolo}
                            </span>
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <User size={14} /> {item.moradorNome}
                            </span>
                            <span className="flex items-center gap-1">
                              <Home size={14} /> Bloco {item.blocoNome} - Apto {item.apartamento}
                            </span>
                            {item.dataChegada && (
                              <span className="flex items-center gap-1">
                                <Clock size={14} /> {item.dataChegada}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button className="text-green-600 font-medium text-sm bg-green-50 px-3 py-1.5 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                        Registrar Saída
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             // Mostra mensagem de "Vazio" apenas se não estiver carregando e tiver digitado algo
             !loading && busca.length > 0 && !error && (
                <div className="text-center py-8 text-gray-400">
                    <p>Nenhuma pendência encontrada com esse termo.</p>
                    <p className="text-xs mt-1">Pressione "Ir" para verificar histórico de retirados.</p>
                </div>
             )
          )}
        
          {/* MODAL DE RETIRADA */}
          {showModal && correspondenciaSelecionada && (
            <ModalRetiradaProfissional
              correspondencia={correspondenciaSelecionada as any} 
              onClose={() => {
                setShowModal(false);
                setCorrespondenciaSelecionada(null);
                setTimeout(() => {
                    if (inputRef.current) inputRef.current.focus();
                }, 100);
              }}
              onSuccess={handleRetiradaSuccess}
            />
          )}

          {/* MODAL DE CONFIGURAÇÃO (PICKUP) */}
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

export default withAuth(RegistrarRetiradaResponsavelPage, [
  "porteiro",
  "responsavel",
  "adminMaster",
]);