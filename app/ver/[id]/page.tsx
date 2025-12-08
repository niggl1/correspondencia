"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, FileX, CheckCircle, Image as ImageIcon } from "lucide-react";

export default function VerPorIdPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    if (!id) return;

    const buscarRecibo = async () => {
      try {
        setLoading(true);
        setErro("");

        // 1) tenta "avisos"
        let docSnap = await getDoc(doc(db, "avisos", id));

        // 2) fallback: "correspondencias"
        if (!docSnap.exists()) {
          docSnap = await getDoc(doc(db, "correspondencias", id));
        }

        if (!docSnap.exists()) {
          setErro("Registro não encontrado no sistema.");
          return;
        }

        const data = docSnap.data();

        // Prioriza fotoUrl, depois outros
        const urlArquivo =
          data?.fotoUrl ||
          data?.reciboUrl ||
          data?.dadosRetirada?.reciboUrl ||
          data?.pdfUrl ||
          "";

        if (!urlArquivo) {
          setErro("O arquivo para este registro ainda não foi gerado.");
          return;
        }

        const urlLower = String(urlArquivo).toLowerCase();

        const ehPdf = urlLower.includes(".pdf") || urlLower.includes("application/pdf");
        const ehImagem =
          !ehPdf &&
          (urlLower.includes(".jpg") ||
            urlLower.includes(".jpeg") ||
            urlLower.includes(".png") ||
            urlLower.includes("image/"));

        setIsImage(ehImagem);

        setDados({
          ...data,
          urlFinal: urlArquivo,
          moradorNome: data?.moradorNome || data?.destinatario || "Morador",
        });
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
      <header className="bg-[#057321] text-white py-4 px-6 shadow-md flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-full shadow-sm">
          <CheckCircle className="text-[#057321]" size={20} />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none">
            {isImage ? "Foto do Aviso" : "Recibo Digital"}
          </h1>
          <p className="text-xs text-green-100 mt-0.5">
            Protocolo: #{dados?.protocolo ?? "-"}
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 h-full">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl overflow-hidden h-[80vh] flex flex-col border border-gray-200">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center gap-3">
            <span className="text-sm text-gray-500 font-medium truncate">
              Destinatário: {dados?.dadosRetirada?.nomeRetirada || dados?.moradorNome || "-"}
            </span>

            <a
              href={dados.urlFinal}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#057321] hover:underline uppercase tracking-wide flex items-center gap-1 whitespace-nowrap"
            >
              {isImage ? <ImageIcon size={14} /> : null}
              Abrir {isImage ? "Imagem" : "PDF"}
            </a>
          </div>

          <div className="flex-1 bg-black/5 overflow-auto flex items-center justify-center p-2">
            {isImage ? (
              <img
                src={dados.urlFinal}
                alt="Comprovante"
                className="max-w-full max-h-full object-contain shadow-lg rounded-md"
              />
            ) : (
              <iframe src={dados.urlFinal} className="w-full h-full" title="Comprovante PDF" />
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">Sistema de Gestão de Correspondências</p>
      </main>
    </div>
  );
}