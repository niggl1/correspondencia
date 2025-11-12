"use client";

import { useState, useEffect } from "react";
import UploadImagem from "@/components/UploadImagem";
import SelectCondominioBlocoMorador from "@/components/SelectCondominioBlocoMorador";
import { ProgressBar } from "@/components/ProgressBar";
import { useCorrespondencias } from "@/hooks/useCorrespondencias";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";

function NovaCorrespondenciaResponsavelPage() {
  const { role, condominioId } = useAuth() as any;
  
  const { 
    criarCorrespondenciaCompleta, 
    gerarPDFSobDemanda,
    loading, 
    error,
    progress,
    progressMessage
  } = useCorrespondencias();

  const [selectedCondominio, setSelectedCondominio] = useState("");
  const [selectedBloco, setSelectedBloco] = useState("");
  const [selectedMorador, setSelectedMorador] = useState("");
  const [observacao, setObservacao] = useState("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);

  const [correspondenciaId, setCorrespondenciaId] = useState<string>("");
  const [protocolo, setProtocolo] = useState<string>("");
  const [moradorNome, setMoradorNome] = useState<string>("");
  
  // ✅ NOVO: Estado para monitorar PDF
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [pdfEmProcessamento, setPdfEmProcessamento] = useState(false);

  const efetivoCondominioId =
    (role === "adminMaster" || role === "admin") ? selectedCondominio : condominioId || "";

  const handleUpload = (file: File | null) => setImagemFile(file);

  // ✅ NOVO: Monitora quando PDF fica pronto em background
  useEffect(() => {
    if (!correspondenciaId) return;

    console.log("👀 Monitorando PDF para correspondência:", correspondenciaId);
    setPdfEmProcessamento(true);

    const unsubscribe = onSnapshot(
      doc(db, "correspondencias", correspondenciaId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.pdfUrl) {
            console.log("✅ PDF pronto detectado:", data.pdfUrl);
            setPdfUrl(data.pdfUrl);
            setPdfEmProcessamento(false);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [correspondenciaId]);

  const buscarNomes = async () => {
    let condominioNome = "";
    let blocoNome = "";
    let moradorNome = "";
    let apartamento = "";

    if (efetivoCondominioId) {
      const cRef = doc(db, "condominios", efetivoCondominioId);
      const cSnap = await getDoc(cRef);
      condominioNome = (cSnap.data()?.nome as string) || efetivoCondominioId;
    }
    if (selectedBloco) {
      const bRef = doc(db, "blocos", selectedBloco);
      const bSnap = await getDoc(bRef);
      blocoNome = (bSnap.data()?.nome as string) || selectedBloco;
    }
    if (selectedMorador) {
      const mRef = doc(db, "users", selectedMorador);
      const mSnap = await getDoc(mRef);
      moradorNome = (mSnap.data()?.nome as string) || selectedMorador;
      apartamento = (mSnap.data()?.apartamento as string) || "";
    }

    return { condominioNome, blocoNome, moradorNome, apartamento };
  };

  const salvar = async () => {
    // Validação
    if (!efetivoCondominioId) {
      alert("Selecione o condomínio.");
      return;
    }
    if (!selectedBloco) {
      alert("Selecione o bloco.");
      return;
    }
    if (!selectedMorador) {
      alert("Selecione o morador.");
      return;
    }

    const nomes = await buscarNomes();

    const res = await criarCorrespondenciaCompleta({
      condominioId: efetivoCondominioId,
      blocoId: selectedBloco,
      moradorId: selectedMorador,
      observacao,
      imagemFile,
      ...nomes,
    });

    if (res) {
      setCorrespondenciaId(res.id);
      setProtocolo(res.protocolo);
      setMoradorNome(nomes.moradorNome);
      
      alert(`Correspondência registrada com sucesso!\nProtocolo: #${res.protocolo}\n\nPDF sendo gerado em background...`);
      
      // Limpar campos
      setObservacao("");
      setImagemFile(null);
      setPdfUrl(""); // Limpa PDF anterior
      setPdfEmProcessamento(true); // Marca como processando
    }
  };

  // ✅ OTIMIZADO: Baixar PDF (espera se necessário)
  const handleBaixarPDF = async () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else if (pdfEmProcessamento) {
      alert("PDF está sendo gerado em background. Aguarde alguns segundos...");
      // Espera até 15 segundos
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (pdfUrl) {
          window.open(pdfUrl, "_blank");
          return;
        }
      }
      alert("PDF ainda não está pronto. Tente novamente em alguns segundos.");
    } else {
      // Gera manualmente se não estiver em processamento
      const url = await gerarPDFSobDemanda(correspondenciaId);
      if (url) {
        setPdfUrl(url);
        window.open(url, "_blank");
      }
    }
  };

  // ✅ OTIMIZADO: Imprimir PDF (espera se necessário)
  const handleImprimir = async () => {
    await handleBaixarPDF(); // Reutiliza lógica
  };

  // ✅ OTIMIZADO: WhatsApp (usa PDF se pronto, senão envia texto)
  const handleWhatsApp = async () => {
    let url = pdfUrl;
    
    // Se PDF não está pronto, envia mensagem sem PDF
    if (!url && pdfEmProcessamento) {
      const mensagem = `Olá ${moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${protocolo}\n\nRetire na portaria.`;
      const whatsLink = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
      window.open(whatsLink, "_blank");
      alert("PDF ainda está sendo gerado. Mensagem enviada sem comprovante.");
      return;
    }
    
    // Se PDF está pronto, envia com PDF
    if (url) {
      const mensagem = `Olá ${moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${protocolo}\n\nVeja o comprovante: ${url}`;
      const whatsLink = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
      window.open(whatsLink, "_blank");
    } else {
      // Gera PDF se não estiver em processamento
      url = await gerarPDFSobDemanda(correspondenciaId);
      if (url) {
        setPdfUrl(url);
        const mensagem = `Olá ${moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${protocolo}\n\nVeja o comprovante: ${url}`;
        const whatsLink = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
        window.open(whatsLink, "_blank");
      }
    }
  };

  // ✅ OTIMIZADO: Email (usa PDF se pronto, senão envia texto)
  const handleEmail = async () => {
    let url = pdfUrl;
    
    if (!url && pdfEmProcessamento) {
      const mensagem = `Olá ${moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${protocolo}\n\nRetire na portaria.`;
      const mailtoLink = `mailto:?subject=Nova Correspondência - Protocolo ${protocolo}&body=${encodeURIComponent(mensagem)}`;
      window.open(mailtoLink);
      alert("PDF ainda está sendo gerado. Email enviado sem comprovante.");
      return;
    }
    
    if (url) {
      const mensagem = `Olá ${moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${protocolo}\n\nVeja o comprovante: ${url}`;
      const mailtoLink = `mailto:?subject=Nova Correspondência - Protocolo ${protocolo}&body=${encodeURIComponent(mensagem)}`;
      window.open(mailtoLink);
    } else {
      url = await gerarPDFSobDemanda(correspondenciaId);
      if (url) {
        setPdfUrl(url);
        const mensagem = `Olá ${moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${protocolo}\n\nVeja o comprovante: ${url}`;
        const mailtoLink = `mailto:?subject=Nova Correspondência - Protocolo ${protocolo}&body=${encodeURIComponent(mensagem)}`;
        window.open(mailtoLink);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Navbar role="responsavel" />
      <main className="space-y-6 p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Nova Correspondência</h1>

      {/* Seletor hierárquico */}
      <div className="p-4 border rounded bg-white">
        <label className="block text-sm font-medium mb-2">Destinatário</label>
        <SelectCondominioBlocoMorador
          onSelect={({ condominioId, blocoId, moradorId }) => {
            setSelectedCondominio(condominioId);
            setSelectedBloco(blocoId);
            setSelectedMorador(moradorId);
          }}
        />
      </div>

      {/* Observações */}
      <div className="p-4 border rounded bg-white">
        <label className="block text-sm font-medium mb-1">Observações</label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex.: Caixa média com etiqueta da Amazon"
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      {/* Upload da foto */}
      <div className="p-4 border rounded bg-white">
        <label className="block text-sm font-medium mb-2">Foto do pacote (opcional)</label>
        <UploadImagem onUpload={handleUpload} />
      </div>

      {/* Ações */}
      <div className="flex gap-3 items-center">
        <button
          onClick={salvar}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Salvando..." : "Registrar correspondência"}
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      {/* Barra de Progresso */}
      <ProgressBar 
        progress={progress} 
        message={progressMessage} 
        show={loading} 
      />

      {/* Botões aparecem após registrar */}
      {correspondenciaId && (
        <div className="p-4 border rounded bg-white space-y-3">
          <p className="font-semibold">
            Correspondência registrada! Protocolo: <span className="text-blue-600">#{protocolo}</span>
          </p>
          
          {/* ✅ NOVO: Status do PDF */}
          {pdfEmProcessamento && !pdfUrl && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
              <span>PDF sendo gerado em background...</span>
            </div>
          )}
          
          {pdfUrl && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span>✅ PDF pronto!</span>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleBaixarPDF}
              className="px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-900 transition"
            >
              {pdfUrl ? "Baixar PDF" : pdfEmProcessamento ? "Aguardar PDF..." : "Gerar PDF"}
            </button>
            
            <button
              onClick={handleImprimir}
              className="px-4 py-2 rounded bg-gray-100 border hover:bg-gray-200 transition"
            >
              Imprimir
            </button>
            
            <button
              onClick={handleWhatsApp}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
            >
              Enviar via WhatsApp
            </button>
            
            <button
              onClick={handleEmail}
              className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              Enviar por e-mail
            </button>
          </div>
          
          {pdfUrl && (
            <p className="text-xs text-gray-500 break-all">
              ✅ PDF: {pdfUrl}
            </p>
          )}
        </div>
      )}
      </main>
    </div>
  );
}

export default withAuth(NovaCorrespondenciaResponsavelPage, ['responsavel', 'admin', 'adminMaster']);