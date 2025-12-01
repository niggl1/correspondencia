"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { 
  User, Home, CheckCircle, Clock, FileText, AlertTriangle, Zap, Package, Calendar 
} from "lucide-react";
import { Browser } from '@capacitor/browser';

// Função auxiliar para formatar datas do Firebase ou Strings
const formatarData = (data: any) => {
  if (!data) return "N/A";
  
  // Se for Timestamp do Firebase (tem .seconds)
  if (data.seconds) {
    return new Date(data.seconds * 1000).toLocaleString('pt-BR');
  }
  
  // Se for string ou objeto Date
  try {
    return new Date(data).toLocaleString('pt-BR');
  } catch (e) {
    return data.toString();
  }
};

interface Dados {
  id: string;
  tipo: "correspondencia" | "aviso"; 
  protocolo: string;
  moradorNome: string;
  blocoNome: string;
  apartamento: string;
  status: string;
  
  // Campos adicionados para resolver o "N/A"
  remetente?: string;
  entregador?: string;
  categoria?: string;
  porteiroNome?: string;
  cpfRetirada?: string;
  
  dataChegadaFormatada: string;
  dataRetiradaFormatada?: string;
  
  retiradoPorNome?: string;
  fotoUrl?: string;   
  imagemUrl?: string; 
  reciboUrl?: string; 
  mensagem?: string;
}

function ConteudoComprovante() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const carregarDados = async () => {
      let idParaBuscar = searchParams.get("id");

      if (!idParaBuscar) {
        const partes = pathname.split('/');
        const possivelId = partes[partes.length - 1];
        if (possivelId && possivelId !== 'ver') {
          idParaBuscar = possivelId;
        }
      }

      if (!idParaBuscar) {
        setLoading(false);
        setErro("ID não identificado.");
        return;
      }

      try {
        // 1. Tenta buscar na coleção de CORRESPONDÊNCIAS
        let docRef = doc(db, "correspondencias", idParaBuscar);
        let docSnap = await getDoc(docRef);
        let tipoRegistro: "correspondencia" | "aviso" = "correspondencia";

        // 2. Se não achar, tenta buscar na coleção de AVISOS RAPIDOS
        if (!docSnap.exists()) {
          docRef = doc(db, "avisos_rapidos", idParaBuscar);
          docSnap = await getDoc(docRef);
          tipoRegistro = "aviso";
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Mapeamento manual para garantir que os campos apareçam
          setDados({ 
              id: docSnap.id, 
              tipo: tipoRegistro,
              protocolo: data.protocolo || 'S/N',
              status: data.status || 'pendente',
              
              moradorNome: data.moradorNome || data.nomeMorador || "Morador",
              blocoNome: data.blocoNome || data.bloco || "",
              apartamento: data.apartamento || data.unidade || "",
              
              // Busca remetente ou entregador (nomes comuns no banco)
              remetente: data.remetente || data.entregador || "Não informado",
              categoria: data.tipo || data.categoria || "Encomenda",
              
              // Formata as datas aqui para não quebrar o React
              dataChegadaFormatada: formatarData(data.dataChegada || data.criadoEm),
              dataRetiradaFormatada: data.retiradoEm ? formatarData(data.retiradoEm) : undefined,
              
              retiradoPorNome: data.retiradoPorNome || data.nomeRetirada,
              cpfRetirada: data.cpfRetirada || data.documentoRetirada,
              porteiroNome: data.porteiroNome || data.responsavelNome,
              
              fotoUrl: data.fotoUrl,
              imagemUrl: data.imagemUrl,
              reciboUrl: data.reciboUrl,
              mensagem: data.mensagem
          } as Dados);
        } else {
          setErro("Registro não encontrado ou link expirado.");
        }
      } catch (err) {
        console.error(err);
        setErro("Erro ao carregar as informações.");
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [searchParams, pathname]);

  const abrirRecibo = async () => {
    if (dados?.reciboUrl) {
      await Browser.open({ url: dados.reciboUrl });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#057321]"></div>
        <p className="mt-4 text-gray-500 font-medium">Localizando registro...</p>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Atenção</h1>
          <p className="text-gray-600">{erro}</p>
        </div>
      </div>
    );
  }

  const isRetirado = dados.status === "retirada" || dados.status === "entregue";
  const isAviso = dados.tipo === "aviso";

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 flex justify-center items-center">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        
        {/* CABEÇALHO */}
        <div className={`p-8 text-center relative overflow-hidden ${
            isRetirado ? 'bg-[#057321]' : isAviso ? 'bg-blue-600' : 'bg-yellow-500'
        }`}>
          <div className="relative z-10">
            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              {isRetirado ? <CheckCircle size={40} className="text-white" /> : 
               isAviso ? <Zap size={40} className="text-white" /> : 
               <Clock size={40} className="text-white" />}
            </div>
            
            <h1 className="text-2xl font-black text-white tracking-tight">
              {isRetirado ? "ENTREGA CONCLUÍDA" : isAviso ? "AVISO IMPORTANTE" : "AGUARDANDO RETIRADA"}
            </h1>
            
            <div className="mt-2 inline-block bg-black/20 px-3 py-1 rounded-lg">
              <p className="text-white font-mono text-sm tracking-wider">PROTOCOLO: {dados.protocolo}</p>
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="p-6 space-y-6">
          
          {/* CARD DESTINATÁRIO */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start gap-4">
            <div className="bg-white p-2.5 rounded-full shadow-sm text-gray-600"><User size={24} /></div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Destinatário</p>
                <p className="font-bold text-gray-900 text-lg leading-tight">{dados.moradorNome}</p>
                <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <Home size={14} /> 
                    <span>{dados.blocoNome} - Apto {dados.apartamento}</span>
                </div>
            </div>
          </div>

          {/* DETALHES DA ENCOMENDA (NOVO) */}
          {!isAviso && (
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Package size={12}/> Remetente</p>
                    <p className="font-semibold text-gray-800 text-sm truncate">{dados.remetente}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12}/> Chegada</p>
                    <p className="font-semibold text-gray-800 text-sm">{dados.dataChegadaFormatada}</p>
                </div>
            </div>
          )}

          {/* MENSAGEM DO AVISO */}
          {dados.mensagem && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-900 text-sm">
                  <p className="font-bold mb-1 flex items-center gap-2"><Zap size={16}/> Mensagem:</p>
                  {dados.mensagem}
              </div>
          )}

          {/* FOTO DA ENCOMENDA */}
          {(dados.fotoUrl || dados.imagemUrl) && (
            <div className="mt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Registro Visual</p>
                <div className="relative h-56 w-full rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-100 group">
                    <Image 
                        src={dados.fotoUrl || dados.imagemUrl || ""} 
                        alt="Foto" 
                        fill 
                        className="object-contain group-hover:scale-105 transition-transform duration-500" 
                    />
                </div>
            </div>
          )}

          {/* DADOS DA RETIRADA (SE JÁ RETIROU) */}
          {isRetirado && (
             <div className="bg-green-50 p-4 rounded-xl border border-green-100 space-y-2">
                <p className="text-green-800 font-bold text-sm flex items-center gap-2">
                    <CheckCircle size={16}/> Dados da Retirada
                </p>
                <div className="text-sm text-green-900 space-y-1">
                    <p><span className="font-semibold">Retirado por:</span> {dados.retiradoPorNome || "Não informado"}</p>
                    {dados.cpfRetirada && <p><span className="font-semibold">Documento:</span> {dados.cpfRetirada}</p>}
                    <p><span className="font-semibold">Data:</span> {dados.dataRetiradaFormatada}</p>
                    {dados.porteiroNome && <p><span className="font-semibold">Liberado por:</span> {dados.porteiroNome}</p>}
                </div>
             </div>
          )}

          {/* BOTÃO DE PDF */}
          {isRetirado && dados.reciboUrl && (
              <button 
                onClick={abrirRecibo} 
                className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all mt-4 active:scale-95"
              >
                <FileText size={20} /> 
                Baixar Recibo Oficial (PDF)
              </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerComprovantePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Carregando...</div>}>
      <ConteudoComprovante />
    </Suspense>
  );
}
