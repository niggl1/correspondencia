"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { 
  Package, 
  Search, 
  AlertCircle, 
  User, 
  Home, 
  Calendar, 
  Clock, 
  QrCode, 
  X, 
} from "lucide-react"; 
import Navbar from "@/components/Navbar"; 
import BotaoVoltar from "@/components/BotaoVoltar";

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

function RegistrarRetiradaPorteiroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null); 
  
  // --- ESTADOS DE BUSCA ---
  const [busca, setBusca] = useState<string>(""); 
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<CorrespondenciaDocument | null>(null);
  const [listaResultados, setListaResultados] = useState<CorrespondenciaDocument[]>([]); 
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);

  // --- ESTADOS DO SCANNER ---
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // ✅ OTIMIZAÇÃO: Limpeza da câmera ao sair da página (Desmontar componente)
  useEffect(() => {
    return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch((err) => console.warn("Scanner stop error on unmount", err));
            scannerRef.current.clear();
        }
    };
  }, []);

  // EFEITO PRINCIPAL
  useEffect(() => {
    const paramQ = searchParams.get("q");
    
    if (inputRef.current && !showModal && !showScanner) {
      inputRef.current.focus();
    }

    if (paramQ) {
      setBusca(paramQ);
      buscarCorrespondencia(paramQ);
    }
  }, [searchParams]);

  // --- LÓGICA DE BUSCA ---
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
      const termo = termoParaBuscar.trim();
      const resultsMap = new Map<string, CorrespondenciaDocument>();

      // Preparar termos para busca de nome (Case Insensitive workaround)
      // Ex: se digitar "morador", cria também "Morador" para buscar
      const termoCapitalizado = termo.charAt(0).toUpperCase() + termo.slice(1).toLowerCase();

      // 1. Busca por Protocolo
      const qProtocolo = query(
        collection(db, "correspondencias"),
        where("protocolo", "==", termo)
      );

      // 2. Busca por Apartamento (Pendentes)
      const qApartamento = query(
        collection(db, "correspondencias"),
        where("apartamento", "==", termo),
        where("status", "==", "pendente")
      );

      // 3. Busca por Nome (Como digitado)
      const qNome = query(
        collection(db, "correspondencias"),
        where("moradorNome", ">=", termo),
        where("moradorNome", "<=", termo + "\uf8ff"),
        where("status", "==", "pendente")
      );

      // Array de Promises
      const promisesBusca = [
        getDocs(qProtocolo),
        getDocs(qApartamento),
        getDocs(qNome)
      ];

      // 4. Busca por Nome (Capitalizado) - Só adiciona se for diferente do original
      if (termoCapitalizado !== termo) {
        promisesBusca.push(
            getDocs(query(
                collection(db, "correspondencias"),
                where("moradorNome", ">=", termoCapitalizado),
                where("moradorNome", "<=", termoCapitalizado + "\uf8ff"),
                where("status", "==", "pendente")
            ))
        );
      }

      // Executa todas as buscas
      const snapshots = await Promise.all(promisesBusca);

      // Separa o snap de protocolo para verificação específica
      const snapProtocolo = snapshots[0]; 

      const processarDoc = (doc: any) => {
        const data = doc.data();
        
        // Se buscou por protocolo e já foi retirada, avisa o porteiro
        if (data.status === "retirada" && snapProtocolo.docs.some(d => d.id === doc.id)) {
          // Só mostra erro de retirada se não encontrou nada por nome ou apto nas outras queries
          const outrosEncontraram = snapshots.slice(1).some(snap => !snap.empty);
          if (!outrosEncontraram) {
             setError(`A correspondência do protocolo ${termo} já foi retirada.`);
          }
          return;
        }
        
        if (data.status !== "retirada") {
          resultsMap.set(doc.id, { id: doc.id, ...data } as CorrespondenciaDocument);
        }
      };

      snapshots.forEach(snap => snap.forEach(processarDoc));

      const resultados = Array.from(resultsMap.values());

      if (resultados.length === 0) {
        if (!error) setError("Nenhuma correspondência pendente encontrada.");
      } else if (resultados.length === 1) {
        setCorrespondenciaSelecionada(resultados[0]);
        setShowModal(true);
      } else {
        setListaResultados(resultados);
      }

    } catch (err) {
      console.error("Erro ao buscar:", err);
      setError("Erro ao buscar. Verifique os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DO SCANNER ---
  const iniciarScanner = () => {
    setError("");
    setShowScanner(true);
    
    Html5Qrcode.getCameras().then((devices) => {
      if (devices && devices.length) {
        setCameras(devices);
        // Tenta pegar a câmera traseira, se não, pega a primeira
        const backCamera = devices.find((device) => device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("traseira"));
        const cameraId = backCamera?.id || devices[0].id;
        setSelectedCamera(cameraId);
        startHtml5Scanner(cameraId);
      } else {
        setError("Nenhuma câmera encontrada.");
        setShowScanner(false);
      }
    }).catch((err) => {
      console.error("Erro câmeras:", err);
      setError("Erro ao acessar câmeras. Verifique as permissões.");
      setShowScanner(false);
    });
  };

  const startHtml5Scanner = (cameraId: string) => {
    // Garante que não tem instância rodando antes de criar nova
    if(scannerRef.current) {
        scannerRef.current.clear();
    }

    const scanner = new Html5Qrcode("qr-reader-modal");
    scannerRef.current = scanner;

    scanner.start(
      cameraId,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        // Sucesso no Scan
        scanner.stop().then(() => {
          scanner.clear();
          setShowScanner(false);
          setBusca(decodedText);
          buscarCorrespondencia(decodedText);
        }).catch(console.error);
      },
      () => {} 
    ).catch((err) => {
      console.error(err);
      setError("Erro ao iniciar leitura da câmera.");
      setShowScanner(false);
    });
  };

  const pararScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setShowScanner(false);
      }).catch(console.error);
    } else {
      setShowScanner(false);
    }
  };

  // --- MANIPULADORES UI ---
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
    router.replace("/dashboard-porteiro/registrar-retirada");
    
    setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="min-h-screen flex flex-col items-center pt-20 pb-8 px-4">
        <div className="max-w-2xl w-full">
          
          <div className="mb-6">
            <div className="w-full flex justify-start mb-4">
               <BotaoVoltar url="/dashboard-porteiro" />
            </div>
            
            {/* Header Card */}
            <div className="bg-white border-l-4 border-[#057321] rounded-xl shadow-sm p-6 flex items-center gap-4">
              <div className="bg-green-100 text-[#057321] p-3 rounded-full">
                <Package size={32} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Registrar Saída</h1>
                <p className="text-gray-500 text-sm">Busque por protocolo, apartamento ou use o QR Code</p>
              </div>
            </div>
          </div>

          {/* Card de Busca */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Buscar Encomenda
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setError("");
                    setListaResultados([]);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && buscarCorrespondencia()}
                  placeholder="Protocolo, Nome ou Apto..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-[#057321] outline-none transition-all"
                />
              </div>

              {/* Botão Ler QR */}
              <button
                onClick={iniciarScanner}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-2 font-medium shadow-sm whitespace-nowrap"
              >
                <QrCode size={20} className="text-green-400" />
                Ler QR
              </button>

              {/* Botão Buscar */}
              <button
                onClick={() => buscarCorrespondencia()}
                disabled={loading || !busca.trim()}
                className="px-6 py-3 bg-[#057321] text-white rounded-lg hover:bg-[#046019] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
              >
                <Search size={20} />
                {loading ? "..." : "Buscar"}
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
                          {item.tipoCorrespondencia?.toLowerCase().includes('encomenda') ? <Package size={24} /> : <Calendar size={24} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            {item.tipoCorrespondencia || "Correspondência"}
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border font-mono">
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
                                <Clock size={14} /> {new Date(item.dataChegada).toLocaleDateString('pt-BR')}
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
        
          {/* Modal de Retirada */}
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

          {/* Modal/Overlay do SCANNER */}
          {showScanner && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden relative shadow-2xl">
                    <div className="p-4 bg-gray-900 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2">
                           <QrCode className="text-green-400" /> Escanear Código
                        </h3>
                        <button onClick={pararScanner} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-4 bg-black flex justify-center">
                        <div id="qr-reader-modal" className="w-full rounded-lg overflow-hidden border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                    </div>

                    <div className="p-4 bg-gray-100 flex flex-col gap-3">
                          {cameras.length > 1 && (
                             <select 
                                value={selectedCamera}
                                onChange={(e) => {
                                    if (scannerRef.current) {
                                        scannerRef.current.stop().then(() => {
                                            setSelectedCamera(e.target.value);
                                            startHtml5Scanner(e.target.value);
                                        });
                                    }
                                }}
                                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                             >
                                 {cameras.map(cam => (
                                     <option key={cam.id} value={cam.id}>{cam.label || `Câmera ${cam.id.slice(0,5)}...`}</option>
                                 ))}
                             </select>
                          )}
                          <p className="text-center text-sm text-gray-600">
                             Aponte a câmera para o QR Code da etiqueta.
                          </p>
                          <button 
                            onClick={pararScanner}
                            className="w-full py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
                          >
                            Cancelar Leitura
                          </button>
                    </div>
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default withAuth(RegistrarRetiradaPorteiroPage, [
  "porteiro",
  "responsavel",
  "adminMaster",
]);

