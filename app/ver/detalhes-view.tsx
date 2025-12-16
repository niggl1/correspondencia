"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Loader2,
  FileX,
  CheckCircle,
  Image as ImageIcon,
  FileDown,
  MessageSquare,
} from "lucide-react";

export default function DetalhesView({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [isImage, setIsImage] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [isTextOnly, setIsTextOnly] = useState(false);

  useEffect(() => {
    // 1. Log imediato para ver se o ID chegou
    console.log("🚀 [DetalhesView] Iniciando. ID recebido:", id);

    const buscar = async () => {
      try {
        setLoading(true);
        setErro("");

        // Validação inicial do ID
        if (!id || id === "undefined" || id === "null") {
          console.error("❌ ID inválido recebido.");
          setErro("Código de identificação inválido.");
          setLoading(false);
          return;
        }

        const idLimpo = decodeURIComponent(id)
          .split("/")
          .pop()
          ?.replace(/}/g, "")
          .replace(/%7D/g, "")
          .trim() || id;

        console.log("🔍 Buscando no banco pelo ID:", idLimpo);

        // --- BUSCA SEQUENCIAL EXPLÍCITA ---
        // Isso evita erros de sobrescrita de variáveis
        let dadosEncontrados: any = null;
        let colecaoOrigem = "";

        // Passo 1: Tenta em Avisos
        let docRef = doc(db, "avisos", idLimpo);
        let docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          dadosEncontrados = docSnap.data();
          colecaoOrigem = "avisos";
        } else {
          // Passo 2: Tenta em Correspondencias
          docRef = doc(db, "correspondencias", idLimpo);
          docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            dadosEncontrados = docSnap.data();
            colecaoOrigem = "correspondencias";
          } else {
            // Passo 3: Tenta em Avisos Rápidos
            docRef = doc(db, "avisos_rapidos", idLimpo);
            docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
              dadosEncontrados = docSnap.data();
              colecaoOrigem = "avisos_rapidos";
            }
          }
        }

        // Se não achou em nenhum lugar
        if (!dadosEncontrados) {
          console.warn("⚠️ Registro não encontrado em nenhuma coleção.");
          setErro("Registro não encontrado no sistema.");
          return;
        }

        console.log(`✅ Registro encontrado em [${colecaoOrigem}]:`, dadosEncontrados);

        // --- ANÁLISE DO ARQUIVO VS MENSAGEM ---
        const urlArquivo =
          dadosEncontrados?.reciboUrl ||
          dadosEncontrados?.dadosRetirada?.reciboUrl ||
          dadosEncontrados?.pdfUrl ||
          dadosEncontrados?.fotoUrl ||
          dadosEncontrados?.imagemUrl ||
          "";

        // Busca texto em vários campos possíveis
        const textoMensagem = 
          dadosEncontrados?.mensagem || 
          dadosEncontrados?.observacao || 
          dadosEncontrados?.descricao || 
          "";

        const temMensagem = !!textoMensagem;
        const temArquivo = !!urlArquivo;

        console.log(`📂 Tem Arquivo: ${temArquivo}, 📝 Tem Mensagem: ${temMensagem}`);

        // Regra atualizada: Se não tiver nada, dá erro.
        if (!temArquivo && !temMensagem) {
          setErro("O arquivo para este registro ainda não foi gerado.");
          return;
        }

        let ehPdf = false;
        let ehImagem = false;

        if (temArquivo) {
          const urlLower = String(urlArquivo).toLowerCase();
          ehPdf =
            urlLower.includes(".pdf") ||
            urlLower.includes("application/pdf") ||
            urlLower.includes("alt=media&token");

          ehImagem =
            !ehPdf &&
            (urlLower.includes(".jpg") ||
              urlLower.includes(".jpeg") ||
              urlLower.includes(".png") ||
              urlLower.includes("image/"));
        }

        setIsPdf(ehPdf);
        setIsImage(ehImagem);
        setIsTextOnly(!temArquivo && temMensagem);

        setDados({
          ...dadosEncontrados,
          mensagem: textoMensagem, // Garante que a mensagem vá para o campo certo
          urlFinal: urlArquivo,
          moradorNome: dadosEncontrados?.moradorNome || dadosEncontrados?.destinatario || "Morador",
        });

      } catch (e) {
        console.error("❌ Erro fatal na busca:", e);
        setErro("Erro técnico ao carregar o documento.");
      } finally {
        // Garante que o loading pare aconteça o que acontecer
        setLoading(false);
      }
    };

    buscar();
  }, [id]);

  const handleAbrirArquivo = (e: React.MouseEvent) => {
    if (!dados?.urlFinal) return;
    const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;
    if (isCapacitor) {
        e.preventDefault();
        window.open(dados.urlFinal, "_system");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-3">
        <Loader2 size={40} className="animate-spin text-[#057321]" />
        <p>Localizando documento...</p>
        {/* Mostra ID para debug se demorar muito */}
        <p className="text-xs text-gray-300 font-mono mt-4">ID: {id}</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileX className="text-red-600" size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Não Disponível
          </h1>
          <p className="text-gray-600">{erro}</p>
          <p className="text-xs text-gray-400 mt-4">ID: {id}</p>
        </div>
      </div>
    );
  }

  const getHeaderTitle = () => {
    if (isImage) return "Foto do Aviso";
    if (isTextOnly) return "Mensagem do Condomínio";
    return "Recibo Digital";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-[#057321] text-white py-4 px-5 sm:px-6 shadow-md flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-full shadow-sm">
          {isTextOnly ? (
            <MessageSquare className="text-[#057321]" size={20} />
          ) : (
            <CheckCircle className="text-[#057321]" size={20} />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-none truncate">
            {getHeaderTitle()}
          </h1>
          <p className="text-xs text-green-100 mt-0.5 truncate">
            Protocolo: #{dados?.protocolo ?? "-"}
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center gap-3">
            <span className="text-sm text-gray-600 font-medium truncate">
              Destinatário:{" "}
              {dados?.dadosRetirada?.nomeRetirada ||
                dados?.moradorNome ||
                "-"}
            </span>

            {!isTextOnly && dados?.urlFinal && (
              <a
                href={dados.urlFinal}
                onClick={handleAbrirArquivo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#057321] hover:underline uppercase tracking-wide flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                {isImage ? <ImageIcon size={14} /> : <FileDown size={14} />}
                Abrir {isImage ? "Imagem" : "PDF"}
              </a>
            )}
          </div>

          <div className="flex-1 bg-black/5 overflow-auto flex items-center justify-center p-2 min-h-[60vh]">
            
            {/* MENSAGEM DE TEXTO */}
            {isTextOnly && (
              <div className="bg-white p-8 rounded-xl shadow-sm max-w-2xl w-full border border-gray-200 flex flex-col items-center text-center">
                <div className="bg-green-50 p-4 rounded-full mb-4">
                   <MessageSquare size={48} className="text-[#057321]" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 w-full">
                  Comunicado
                </h2>
                <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap text-left w-full">
                  {dados?.mensagem?.replace(/<br\s*\/?>/gi, '\n') || "Sem conteúdo."}
                </div>
              </div>
            )}

            {/* IMAGEM */}
            {isImage && (
              <img
                src={dados.urlFinal}
                alt="Comprovante"
                className="max-w-full max-h-[75vh] object-contain shadow-lg rounded-md"
              />
            )}

            {/* PDF */}
            {isPdf && (
              <>
                <div className="w-full flex flex-col items-center justify-center gap-4 p-6 md:hidden">
                  <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-md p-6 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-3">
                      <FileDown className="text-[#057321]" size={30} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">
                      PDF Disponível
                    </h2>
                    <p className="text-sm text-gray-600">
                      Toque no botão abaixo para abrir o recibo.
                    </p>
                    <a
                      href={dados.urlFinal}
                      onClick={handleAbrirArquivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 w-full bg-[#057321] hover:bg-[#046119] text-white font-bold py-3 rounded-xl shadow-lg transition cursor-pointer"
                    >
                      <FileDown size={18} />
                      Abrir PDF
                    </a>
                  </div>
                </div>
                <iframe
                  src={dados.urlFinal}
                  className="w-full h-[80vh] hidden md:block"
                  title="Comprovante PDF"
                />
              </>
            )}

            {!isImage && !isPdf && !isTextOnly && (
              <div className="text-sm text-gray-500 p-6">
                Não foi possível detectar o tipo do arquivo.
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Sistema de Gestão de Correspondências
        </p>
      </main>
    </div>
  );
}
