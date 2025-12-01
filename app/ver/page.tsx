"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { 
  User, Home, CheckCircle, Clock, FileText, AlertTriangle 
} from "lucide-react";
// 👇 Importação do Plugin para abrir PDF no Android
import { Browser } from '@capacitor/browser';

// Interface dos dados
interface Dados {
  id: string;
  protocolo: string;
  moradorNome: string;
  blocoNome: string;
  apartamento: string;
  status: string;
  dataChegada?: any;
  criadoEm?: any;
  retiradoEm?: any;
  retiradoPorNome?: string;
  fotoUrl?: string;   
  imagemUrl?: string; 
  reciboUrl?: string; 
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

      // --- LÓGICA HÍBRIDA: Tenta recuperar ID de links antigos ---
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
        const docRef = doc(db, "correspondencias", idParaBuscar);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setDados({ id: docSnap.id, ...docSnap.data() } as Dados);
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

  // Formata datas
  const formatarData = (timestamp: any) => {
    if (!timestamp) return "---";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return isNaN(date.getTime()) ? "---" : date.toLocaleString('pt-BR');
  };

  // 👇 FUNÇÃO ESPECIAL PARA ABRIR PDF NO ANDROID
  const abrirRecibo = async () => {
    if (dados?.reciboUrl) {
      await Browser.open({ url: dados.reciboUrl });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#057321]"></div>
        <p className="mt-4 text-gray-500 font-medium">Localizando correspondência...</p>
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

  const isRetirado = dados.status === "retirada";

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 flex justify-center items-center">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        
        {/* Cabeçalho */}
        <div className={`p-8 text-center relative overflow-hidden ${isRetirado ? 'bg-[#057321]' : 'bg-yellow-500'}`}>
          <div className="relative z-10">
            <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm shadow-inner">
              {isRetirado ? <CheckCircle size={40} className="text-white" /> : <Clock size={40} className="text-white" />}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {isRetirado ? "ENTREGA CONCLUÍDA" : "AGUARDANDO RETIRADA"}
            </h1>
            <div className="mt-2 inline-block bg-black/20 px-3 py-1 rounded-lg">
              <p className="text-white font-mono text-sm tracking-wider">PROTOCOLO: {dados.protocolo}</p>
            </div>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-6">
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

          {/* Foto */}
          {(dados.fotoUrl || dados.imagemUrl) && (
            <div className="mt-4">
                <div className="relative h-56 w-full rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-100">
                    <Image src={dados.fotoUrl || dados.imagemUrl || ""} alt="Foto" fill className="object-contain" />
                </div>
            </div>
          )}

          {/* Botão de Ação (Agora usando Browser.open) */}
          {isRetirado && dados.reciboUrl && (
              <button 
                onClick={abrirRecibo} 
                className="flex items-center justify-center gap-2 w-full py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg hover:bg-black transition-all mt-4 active:scale-95"
              >
                <FileText size={20} /> 
                Baixar Recibo PDF
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