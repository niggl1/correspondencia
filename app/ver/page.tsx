"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, FileX, CheckCircle, Image as ImageIcon } from "lucide-react";

function VerReciboContent() {
  // Correção: Para URLs como /ver/CODIGO, usamos useParams e não useSearchParams
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    if (!id) {
      setErro("Identificador do recibo não fornecido.");
      setLoading(false);
      return;
    }

    const buscarRecibo = async () => {
      try {
        // 1. Tenta buscar na coleção de AVISOS (onde Avisos Rápidos salvam)
        let docRef = doc(db, "avisos", id);
        let docSnap = await getDoc(docRef);

        // 2. Se não achar, tenta na coleção de CORRESPONDÊNCIAS
        if (!docSnap.exists()) {
          docRef = doc(db, "correspondencias", id);
          docSnap = await getDoc(docRef);
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Prioriza fotoUrl (Avisos), depois tenta outros campos (Correspondências)
          const urlArquivo = data.fotoUrl || data.reciboUrl || data.dadosRetirada?.reciboUrl || data.pdfUrl;

          if (urlArquivo) {
            // Verifica se é imagem baseado na extensão ou origem
            const ehImagem = 
              urlArquivo.includes(".jpg") || 
              urlArquivo.includes(".jpeg") || 
              urlArquivo.includes(".png") || 
              (urlArquivo.includes("firebasestorage") && !urlArquivo.includes(".pdf"));

            setIsImage(ehImagem);
            setDados({
              ...data,
              urlFinal: urlArquivo,
              moradorNome: data.moradorNome || data.destinatario || "Morador"
            });
          } else {
            setErro("O arquivo para este registro ainda não foi gerado.");
          }
        } else {
          setErro("Registro não encontrado no sistema.");
        }
      } catch (error) {
        console.error(error);
        setErro("Erro ao carregar o documento.");
      } finally {
        setLoading(false);
      }
    };

    buscarRecibo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-3">
        <Loader2 size={40} className="animate-spin text-[#057321]" />
        <p>Localizando documento...</p>
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
          <h1 className="text-xl font-bold text-gray-800 mb-2">Não Disponível</h1>
          <p className="text-gray-600">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#057321] text-white py-4 px-6 shadow-md flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-full shadow-sm">
            <CheckCircle className="text-[#057321]" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">
              {isImage ? "Foto do Aviso" : "Recibo Digital"}
            </h1>
            <p className="text-xs text-green-100 mt-0.5">Protocolo: #{dados.protocolo}</p>
          </div>
      </header>

      {/* Visualizador */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 h-full">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl overflow-hidden h-[80vh] flex flex-col border border-gray-200">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">
                    Destinatário: {dados.dadosRetirada?.nomeRetirada || dados.moradorNome}
                </span>
                <a 
                  href={dados.urlFinal} 
                  download={`documento_${dados.protocolo}.${isImage ? 'jpg' : 'pdf'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#057321] hover:underline uppercase tracking-wide flex items-center gap-1"
                >
                  {isImage ? <ImageIcon size={14} /> : null}
                  Baixar {isImage ? "Imagem" : "PDF"}
                </a>
            </div>
            
            <div className="flex-1 bg-black/5 overflow-auto flex items-center justify-center p-2">
              {isImage ? (
                // Renderiza como Imagem
                <img 
                  src={dados.urlFinal} 
                  alt="Comprovante" 
                  className="max-w-full max-h-full object-contain shadow-lg rounded-md"
                />
              ) : (
                // Renderiza como PDF (iframe)
                <iframe 
                  src={dados.urlFinal} 
                  className="w-full h-full" 
                  title="Comprovante PDF"
                />
              )}
            </div>
        </div>
        <p className="mt-4 text-xs text-gray-400">Sistema de Gestão de Correspondências</p>
      </main>
    </div>
  );
}

export default function VerPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Carregando...</div>}>
      <VerReciboContent />
    </Suspense>
  );
}