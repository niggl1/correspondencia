"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UploadImagem from "@/components/UploadImagem";
import SelectCondominioBlocoMorador from "@/components/SelectCondominioBlocoMorador";
import { LoadingOverlay } from "@/components/LoadingOverlay"; 
import ModalSucessoEntrada from "@/components/ModalSucessoEntrada";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/app/lib/firebase";
import { doc, getDoc, collection, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import { Package, FileText, CheckCircle, Loader2 } from "lucide-react";
import { gerarEtiquetaPDF } from "@/utils/gerarEtiquetaPDF"; 
import { useCorrespondencias } from "@/hooks/useCorrespondencias";
import BotaoVoltar from "@/components/BotaoVoltar";

// --- FUNÇÃO DE COMPRESSÃO ---
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 500; 
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, width, height);
        }
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            resolve(file);
          }
        }, "image/jpeg", 0.6);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
};

function NovaCorrespondenciaPage() {
  const router = useRouter();
  const { role, condominioId, user } = useAuth() as any;
  const { enviarEmailViaAPI } = useCorrespondencias();
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Processando...");
  
  const [selectedCondominio, setSelectedCondominio] = useState("");
  const [selectedBloco, setSelectedBloco] = useState("");
  const [selectedMorador, setSelectedMorador] = useState("");
  const [observacao, setObservacao] = useState("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [moradorNome, setMoradorNome] = useState("");
  const [telefoneMorador, setTelefoneMorador] = useState("");
  const [emailMorador, setEmailMorador] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");        
  const [linkPublico, setLinkPublico] = useState(""); 
  
  // NOVO: Estado para a mensagem formatada
  const [mensagemFormatada, setMensagemFormatada] = useState("");
  
  const backgroundTaskRef = useRef<Promise<void> | null>(null);

  const backRoute = role === 'porteiro' ? '/dashboard-porteiro' : '/dashboard-responsavel';
  const efetivoCondominioId = (role === "adminMaster" || role === "admin") ? selectedCondominio : condominioId || "";

  const handleUpload = (file: File | null) => setImagemFile(file);
  const limparTelefone = (telefone: string) => telefone.replace(/\D/g, "");

  useEffect(() => {
    if (!selectedMorador) {
      setTelefoneMorador("");
      setEmailMorador("");
      return;
    }
    const fetchDadosMorador = async () => {
      try {
          const mRef = doc(db, "users", selectedMorador);
          const mSnap = await getDoc(mRef);
          if (mSnap.exists()) {
            const data = mSnap.data();
            setTelefoneMorador(limparTelefone(data.whatsapp || ""));
            setEmailMorador(data.email || "");
            setMoradorNome(data.nome || "");
          }
      } catch (err) {
          console.error(err);
      }
    };
    fetchDadosMorador();
  }, [selectedMorador]);

  const buscarNomes = async () => {
    let condominioNome = "", blocoNome = "", nomeMorador = "", apartamento = "";
    
    if (efetivoCondominioId) {
       const cSnap = await getDoc(doc(db, "condominios", efetivoCondominioId));
       condominioNome = cSnap.data()?.nome || efetivoCondominioId;
    }
    if (selectedBloco) {
       const bSnap = await getDoc(doc(db, "blocos", selectedBloco));
       blocoNome = bSnap.data()?.nome || selectedBloco;
    }
    if (selectedMorador) {
       const mSnap = await getDoc(doc(db, "users", selectedMorador));
       if (mSnap.exists()) {
           const data = mSnap.data();
           nomeMorador = data.nome || selectedMorador;
           apartamento = data.apartamento || data.unidade || data.unidadeNome || data.numero || "";
       }
    }
    return { condominioNome, blocoNome, moradorNome: nomeMorador, apartamento };
  };

  const salvar = async () => {
    if (!efetivoCondominioId || !selectedBloco || !selectedMorador) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    setMessage("Preparando arquivos...");
    setProgress(10);
    setLinkPublico(""); 

    try {
      const nomes = await buscarNomes();
      const novoProtocolo = `${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
      
      // GERA O ID E O LINK IMEDIATAMENTE
      const docRef = doc(collection(db, "correspondencias"));
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const novoLinkPublico = `${baseUrl}/ver/${docRef.id}`;
      setLinkPublico(novoLinkPublico);

      let arquivoFinal = imagemFile;
      let fotoBase64ParaPDF = "";

      if (imagemFile) {
         setMessage("Otimizando imagem...");
         try {
             arquivoFinal = await compressImage(imagemFile);
             setProgress(30);
             fotoBase64ParaPDF = await fileToBase64(arquivoFinal);
         } catch (e) {
             console.error("Erro img:", e);
             fotoBase64ParaPDF = await fileToBase64(imagemFile);
         }
      }

      const nomeUser = user?.nome || "Não identificado";
      const roleMap: Record<string, string> = { 'porteiro': 'Porteiro', 'responsavel': 'Responsável', 'admin': 'Admin', 'adminMaster': 'Admin Master' };
      const cargoUser = roleMap[role] || role;
      const responsavelRegistro = `${nomeUser} (${cargoUser})`;

      setMessage("Gerando etiqueta...");
      const pdfBlob = await gerarEtiquetaPDF({
          protocolo: novoProtocolo,
          condominioNome: nomes.condominioNome,
          moradorNome: nomes.moradorNome,
          bloco: nomes.blocoNome,
          apartamento: nomes.apartamento, 
          dataChegada: new Date().toISOString(),
          recebidoPor: responsavelRegistro,
          observacao,
          fotoUrl: fotoBase64ParaPDF,
          logoUrl: "/logo-app-correspondencia.png"
      });
      
      const localPdfUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(localPdfUrl);
      setProtocolo(novoProtocolo);
      setProgress(100);

      // -------------------------------------------------------
      // NOVO: GERAÇÃO DA MENSAGEM FORMATADA PARA WHATSAPP
      // -------------------------------------------------------
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
      const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const msgTemplate = `*AVISO DE CORRESPONDÊNCIA*

Olá, *${nomes.moradorNome}*!
Unidade: ${nomes.apartamento} (${nomes.blocoNome})

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ *PROTOCOLO: ${novoProtocolo}*
│ Local: Portaria
│ Recebido por: ${nomeUser}
│ Chegada: ${dataFormatada}, ${horaFormatada}
━━━━━━━━━━━━━━━━

*FOTO E QR CODE:*
${novoLinkPublico}

Aguardamos a sua retirada`;

      setMensagemFormatada(msgTemplate);
      // -------------------------------------------------------

      setLoading(false);
      setShowSuccessModal(true);

      // BACKGROUND TASK
      backgroundTaskRef.current = (async () => {
          try {
              const pdfRef = ref(storage, `correspondencias/entrada_${novoProtocolo}_${Date.now()}.pdf`);
              await uploadBytes(pdfRef, pdfBlob);
              const publicPdfUrl = await getDownloadURL(pdfRef);
              
              let publicFotoUrl = "";
              if (arquivoFinal) {
                  const fotoRef = ref(storage, `correspondencias/foto_${novoProtocolo}_${Date.now()}.jpg`);
                  await uploadBytes(fotoRef, arquivoFinal);
                  publicFotoUrl = await getDownloadURL(fotoRef);
              }

              await setDoc(docRef, {
                  condominioId: efetivoCondominioId,
                  blocoId: selectedBloco,
                  blocoNome: nomes.blocoNome,
                  moradorId: selectedMorador,
                  moradorNome: nomes.moradorNome,
                  apartamento: nomes.apartamento,
                  protocolo: novoProtocolo,
                  observacao,
                  status: "pendente",
                  criadoEm: Timestamp.now(),
                  criadoPor: user?.email || "sistema",
                  criadoPorNome: nomeUser, 
                  criadoPorCargo: cargoUser,
                  imagemUrl: publicFotoUrl,
                  pdfUrl: publicPdfUrl,
                  moradorTelefone: telefoneMorador,
                  moradorEmail: emailMorador
              });

              console.log("✅ [Background] Salvo com sucesso! ID:", docRef.id);

          } catch (err) {
              console.error("❌ [Background] Erro ao salvar:", err);
          }
      })();

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Erro ao processar. Tente novamente.");
    }
  };

  // --- CORREÇÃO DO FECHAMENTO DO MODAL ---
  const handleCloseSuccess = async () => {
      // Aguarda o upload terminar para evitar dados inconsistentes
      if (backgroundTaskRef.current) await backgroundTaskRef.current;
      
      // Limpa todos os campos
      setObservacao("");
      setImagemFile(null);
      setPdfUrl("");
      setLinkPublico("");
      setMensagemFormatada(""); // Limpa a mensagem
      
      // Limpa seleções para forçar o usuário a selecionar novamente (segurança)
      setSelectedMorador(""); 
      // Opcional: setSelectedBloco(""); 
      
      // Fecha o modal
      setShowSuccessModal(false);
  };

  const handleImprimir = () => {
      if (pdfUrl) window.open(pdfUrl, "_blank");
  };

  const handleReenviarEmail = async () => {
      alert("O sistema envia e-mails automaticamente em background.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <LoadingOverlay isVisible={loading} progress={progress} message={message} />

      {showSuccessModal && (
          <ModalSucessoEntrada 
             protocolo={protocolo}
             moradorNome={moradorNome}
             telefoneMorador={telefoneMorador}
             emailMorador={emailMorador}
             pdfUrl={pdfUrl}
             linkPublico={linkPublico} 
             mensagemFormatada={mensagemFormatada} // Passando a mensagem
             onClose={handleCloseSuccess}
             onImprimir={handleImprimir}
             onReenviarEmail={handleReenviarEmail}
          />
      )}
      
      <main className="max-w-4xl mx-auto px-4 pt-12 mt-8 pb-12">
        
        <BotaoVoltar url={backRoute} />
        
        <div className="mb-8 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #057321 0%, #0a9f2f 100%)' }}>
            <Package className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nova Correspondência</h1>
            <p className="text-gray-600">Painel do Responsável</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #057321 0%, #0a9f2f 100%)' }}></div>
          <div className="p-6 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><Package size={18} color='#057321' /> Destinatário</label>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <SelectCondominioBlocoMorador onSelect={({ condominioId, blocoId, moradorId }) => { setSelectedCondominio(condominioId); setSelectedBloco(blocoId); setSelectedMorador(moradorId); }} />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><FileText size={18} color='#057321' /> Observações</label>
              <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex.: Caixa média..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#057321] outline-none" rows={3} />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><Package size={18} color='#057321' /> Foto do pacote (opcional)</label>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <UploadImagem onUpload={handleUpload} />
              </div>
            </div>
            <div className="pt-2">
              <button onClick={salvar} disabled={loading} className="w-full py-4 text-white rounded-xl font-semibold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: loading ? '#9ca3af' : 'linear-gradient(135deg, #057321 0%, #0a9f2f 100%)' }}>
                {loading ? <Loader2 className="animate-spin" size={22} /> : <CheckCircle size={22} />} {loading ? "Processando..." : "Registrar correspondência"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(NovaCorrespondenciaPage, ['responsavel', 'admin', 'adminMaster', 'porteiro']);