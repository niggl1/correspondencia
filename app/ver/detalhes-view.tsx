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
} from "lucide-react";

export default function DetalhesView({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [isImage, setIsImage] = useState(false);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    if (!id) return;

    const buscar = async () => {
      try {
        setLoading(true);
        setErro("");

        // --- CORREÇÃO ROBUSTA ---
        // Se vier algo tipo "abc/def", pega só o último pedaço.
        // Remove sujeiras de URL/encode.
        
        const idLimpo = decodeURIComponent(id)
        .split("/")      // se tiver barra no meio, quebra
        .pop()           // pega só o final
        ?.replace(/}/g, "")
        .replace(/%7D/g, "")
        .trim() || id;

        // 1) avisos
        let docSnap = await getDoc(doc(db, "avisos", idLimpo));
        // 2) correspondencias
        if (!docSnap.exists())
        docSnap = await getDoc(doc(db, "correspondencias", idLimpo));
        // 3) avisos_rapidos
        if (!docSnap.exists())
        docSnap = await getDoc(doc(db, "avisos_rapidos", idLimpo));

        if (!docSnap.exists()) {
        setErro("Registro não encontrado no sistema.");
        return;
        }

        const data: any = docSnap.data();

        const urlArquivo =
          data?.reciboUrl ||
          data?.dadosRetirada?.reciboUrl ||
          data?.pdfUrl ||
          data?.fotoUrl ||
          data?.imagemUrl ||
          "";

        if (!urlArquivo) {
          setErro("O arquivo para este registro ainda não foi gerado.");
          return;
        }

        const urlLower = String(urlArquivo).toLowerCase();

        const ehPdf =
          urlLower.includes(".pdf") ||
          urlLower.includes("application/pdf") ||
          urlLower.includes("alt=media&token");

        const ehImagem =
          !ehPdf &&
          (urlLower.includes(".jpg") ||
            urlLower.includes(".jpeg") ||
            urlLower.includes(".png") ||
            urlLower.includes("image/"));

        setIsPdf(ehPdf);
        setIsImage(ehImagem);

        setDados({
          ...data,
          urlFinal: urlArquivo,
          moradorNome: data?.moradorNome || data?.destinatario || "Morador",
        });
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar o documento.");
      } finally {
        setLoading(false);
      }
    };

    buscar();
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
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Não Disponível
          </h1>
          <p className="text-gray-600">{erro}</p>
          <p className="text-xs text-gray-400 mt-4">ID: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* HEADER */}
      <header className="bg-[#057321] text-white py-4 px-5 sm:px-6 shadow-md flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-full shadow-sm">
          <CheckCircle className="text-[#057321]" size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-lg leading-none truncate">
            {isImage ? "Foto do Aviso" : "Recibo Digital"}
          </h1>
          <p className="text-xs text-green-100 mt-0.5 truncate">
            Protocolo: #{dados?.protocolo ?? "-"}
          </p>
        </div>
      </header>

      {/* BODY */}
      <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col border border-gray-200">
          {/* TOP BAR */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center gap-3">
            <span className="text-sm text-gray-600 font-medium truncate">
              Destinatário:{" "}
              {dados?.dadosRetirada?.nomeRetirada ||
                dados?.moradorNome ||
                "-"}
            </span>

            <a
              href={dados.urlFinal}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#057321] hover:underline uppercase tracking-wide flex items-center gap-1 whitespace-nowrap"
            >
              {isImage ? <ImageIcon size={14} /> : <FileDown size={14} />}
              Abrir {isImage ? "Imagem" : "PDF"}
            </a>
          </div>

          {/* CONTENT */}
          <div className="flex-1 bg-black/5 overflow-auto flex items-center justify-center p-2 min-h-[60vh]">
            {/* IMAGEM (desktop e mobile ok) */}
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
                {/* ✅ MOBILE: card + botão abrir */}
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
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 w-full bg-[#057321] hover:bg-[#046119] text-white font-bold py-3 rounded-xl shadow-lg transition"
                    >
                      <FileDown size={18} />
                      Abrir PDF
                    </a>
                  </div>
                </div>

                {/* ✅ DESKTOP: iframe normal */}
                <iframe
                  src={dados.urlFinal}
                  className="w-full h-[80vh] hidden md:block"
                  title="Comprovante PDF"
                />
              </>
            )}

            {/* fallback */}
            {!isImage && !isPdf && (
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
