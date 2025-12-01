"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { 
  Package, Search, AlertCircle, ArrowLeft, User, Home, Calendar, Clock, QrCode, X, Settings 
} from "lucide-react"; 
import Navbar from "@/components/Navbar"; 

// Biblioteca de Scanner compatível com Web e Mobile
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
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [busca, setBusca] = useState<string>(""); 
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<CorrespondenciaDocument | null>(null);
  const [listaResultados, setListaResultados] = useState<CorrespondenciaDocument[]>([]); 
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  // Estado para controlar se mostra a câmera ou não
  const [mostrarCamera, setMostrarCamera] = useState(false);

  const processarLeitura = (conteudo: string) => {
    if (!conteudo) return;

    // Tenta vibrar ao ler (feedback tátil)
    try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) {}

    let codigoLimpo = conteudo.trim();

    // Se for URL completa (https://...), pega só o final
    if (codigoLimpo.includes("/")) {
        const partes = codigoLimpo.split("/");
        codigoLimpo = partes[partes.length - 1];
    }

    setMostrarCamera(false); // Fecha a câmera ao ler
    setBusca(codigoLimpo);
    buscarCorrespondencia(codigoLimpo);
  };

  useEffect(() => {
    const paramQ = searchParams.get("q");
    // CORREÇÃO AQUI: trocado showScanner por mostrarCamera
    if (inputRef.current && !showModal && !mostrarCamera) {
      inputRef.current.focus();
    }
    if (paramQ) {
      setBusca(paramQ);
      buscarCorrespondencia(paramQ);
    }
  }, [searchParams, mostrarCamera, showModal]);

  const buscarCorrespondencia = async (termoAutomatico?: string) => {
    const termoParaBuscar = termoAutomatico || busca;

    if (!termoParaBuscar?.trim()) {
      setError("Digite um protocolo, apartamento ou nome do morador");
      return;
    }

    setLoading(true);
    setError("");
    setListaResultados([]);
    setCorrespondenciaSelecionada(null);

    try {
      const termoString = termoParaBuscar.trim();
      const resultsMap = new Map<string, CorrespondenciaDocument>();

      // --- PASSO 1: BUSCA INTELIGENTE POR PROTOCOLO (Texto e Número) ---
      const queriesProtocolo = [];
      
      // 1.1 Busca como Texto
      queriesProtocolo.push(
        getDocs(query(collection(db, "correspondencias"), where("protocolo", "==", termoString)))
      );

      // 1.2 Se for número válido, busca como Número
      const termoNumero = Number(termoString);
      if (!isNaN(termoNumero)) {
        queriesProtocolo.push(
          getDocs(query(collection(db, "correspondencias"), where("protocolo", "==", termoNumero)))
        );
      }

      const snapsProtocolo = await Promise.all(queriesProtocolo);
      let achouPeloProtocolo = false;

      snapsProtocolo.forEach((snap) => {
        snap.forEach((doc) => {
          const data = doc.data();
          // Se achou e já foi retirada
          if (data.status === "retirada") {
             setError(`A correspondência do protocolo ${data.protocolo} já foi retirada.`);
             achouPeloProtocolo = true;
             return; 
          }
          // Se achou e está pendente
          resultsMap.set(doc.id, { id: doc.id, ...data } as CorrespondenciaDocument);
          achouPeloProtocolo = true;
        });
      });

      if (achouPeloProtocolo && !error) {
        const resultados = Array.from(resultsMap.values());
        if (resultados.length === 1) {
            setCorrespondenciaSelecionada(resultados[0]);
            setShowModal(true);
        } else if (resultados.length > 1) {
            setListaResultados(resultados);
        }
        setLoading(false);
        return; 
      }
      
      if (error) {
        setLoading(false);
        return;
      }

      // --- PASSO 2: Busca por Nome ou Apartamento ---
      
      const qApartamento = query(
        collection(db, "correspondencias"),
        where("apartamento", "==", termoString),
        where("status", "==", "pendente")
      );

      const qNome = query(
        collection(db, "correspondencias"),
        where("moradorNome", ">=", termoString),
        where("moradorNome", "<=", termoString + "\uf8ff"),
        where("status", "==", "pendente")
      );

      const [snapApartamento, snapNome] = await Promise.all([
        getDocs(qApartamento),
        getDocs(qNome)
      ]);

      const processarDoc = (doc: any) => {
        const data = doc.data();
        if (data.status !== "retirada") {
          resultsMap.set(doc.id, { id: doc.id, ...data } as CorrespondenciaDocument);
        }
      };

      snapApartamento.forEach(processarDoc);
      snapNome.forEach(processarDoc);

      const resultados = Array.from(resultsMap.values());

      if (resultados.length === 0) {
        setError("Nenhuma correspondência pendente encontrada.");
      } else if (resultados.length === 1) {
        setCorrespondenciaSelecionada(resultados[0]);
        setShowModal(true);
      } else {
        setListaResultados(resultados);
      }

    } catch (err: any) {
      console.error("Erro ao buscar:", err);
      if (err.message && err.message.includes("index")) {
        setError("Configuração de índice pendente no Firebase. Verifique o Console (F12).");
      } else {
        setError("Erro ao buscar. Verifique os dados e tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarDaLista = (item: CorrespondenciaDocument) => {
    setCorrespondenciaSelecionada(item);
    setShowModal(true);
  };

  const handleRetiradaSuccess = () => {
    setShowModal(false);
    setCorrespondenciaSelecionada(null);
    setListaResultados([]);
    setBusca("");
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
            {/* Botão Voltar */}
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

          {/* Botão de Configurações (Centralizado) */}
          <div className="flex justify-center mb-6">
             <button
                onClick={() => router.push("/dashboard-responsavel/configuracoes-retirada")}
                className="w-1/2 py-2 bg-[#057321] text-white rounded-lg shadow-md hover:bg-[#046019] transition-all flex items-center justify-center gap-2 border-2 border-[#046019]"
              >
                 <Settings size={18} />
                 <span className="font-bold text-sm uppercase">Configurar Regras</span>
              </button>
          </div>
        
          {/* Card de Busca */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            
            {/* ÁREA DA CÂMERA */}
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
                        components={{
                          onOff: false,
                          torch: false,
                          zoom: false,
                          finder: true 
                        }}
                        styles={{
                          container: { width: '100%', height: '100%' }
                        }}
                    />
                  </div>
                  <p className="text-center text-white text-sm py-2">Aponte para o QR Code</p>
               </div>
            ) : (
                <>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Buscar Correspondência
                    </label>

                    <button
                    onClick={() => setMostrarCamera(true)}
                    className="w-full mb-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {/* CORREÇÃO: Usando QrCode no lugar de ScanLine */}
                        <QrCode size={24} />
                        Ler QR Code
                    </button>
                </>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                ref={inputRef}
                autoFocus={!mostrarCamera}
                type="text"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setError("");
                  setListaResultados([]);
                }}
                onKeyDown={(e) => e.key === "Enter" && buscarCorrespondencia()}
                placeholder="Ou digite Protocolo, Nome ou Apto"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
              <button
                onClick={() => buscarCorrespondencia()}
                disabled={loading || !busca.trim()}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
              >
                <Search size={20} />
                {loading ? "..." : "Ir"}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 animate-fade-in">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Lista de Resultados */}
          {listaResultados.length > 0 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 px-1">
                Encontramos {listaResultados.length} correspondências:
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
          )}
        
          {/* Modal */}
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