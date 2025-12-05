"use client";

import { useState, useEffect } from "react";
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
import { Package, FileText, CheckCircle, Loader2, Building2, Camera, MapPin, MessageCircle } from "lucide-react"; 
import { gerarEtiquetaPDF } from "@/utils/gerarEtiquetaPDF"; 
import BotaoVoltar from "@/components/BotaoVoltar";
import { useTemplates } from "@/hooks/useTemplates"; 
import MessageConfigModal from "@/components/MessageConfigModal"; 

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

function NovaCorrespondenciaResponsavelPage() {
  const router = useRouter();
  const { role, condominioId, user } = useAuth() as any;
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Processando...");
  
  // --- Configuração de Mensagens ---
  const { getFormattedMessage } = useTemplates(condominioId || "");
  const [showConfigModal, setShowConfigModal] = useState(false);
  // --------------------------------

  // Estados do formulário
  const [selectedCondominio, setSelectedCondominio] = useState("");
  const [selectedBloco, setSelectedBloco] = useState("");
  const [selectedMorador, setSelectedMorador] = useState("");
  const [observacao, setObservacao] = useState("");
  
  // ATUALIZADO: Valor padrão e opções corrigidas
  const [localArmazenamento, setLocalArmazenamento] = useState("Portaria"); 
  
  const [imagemFile, setImagemFile] = useState<File | null>(null);

  // Estados de sucesso/modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [moradorNome, setMoradorNome] = useState("");
  const [telefoneMorador, setTelefoneMorador] = useState("");
  const [emailMorador, setEmailMorador] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");        
  const [linkPublico, setLinkPublico] = useState(""); 
  
  const [mensagemFormatada, setMensagemFormatada] = useState("");
  
  const backRoute = '/dashboard-responsavel';
  const efetivoCondominioId = condominioId || "";

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
        console.error("Erro ao buscar morador:", err);
      }
    };
    fetchDadosMorador();
  }, [selectedMorador]);

  const buscarNomes = async () => {
    let condominioNome = "", blocoNome = "", nomeMorador = "", apartamento = "";
    
    try {
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
    } catch (err) {
        console.error("Erro ao buscar nomes:", err);
    }
    return { condominioNome, blocoNome, moradorNome: nomeMorador, apartamento };
  };

  const salvar = async () => {
    if (!efetivoCondominioId || !selectedBloco || !selectedMorador) {
      alert("Selecione o Bloco e o Morador.");
      return;
    }

    setLoading(true);
    setMessage("Iniciando registro...");
    setProgress(10);
    setLinkPublico(""); 

    try {
      const nomes = await buscarNomes();
      const novoProtocolo = `${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
      
      const docRef = doc(collection(db, "correspondencias"));
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const novoLinkPublico = `${baseUrl}/ver/${docRef.id}`;
      setLinkPublico(novoLinkPublico);

      let arquivoFinal = imagemFile;
      let fotoBase64ParaPDF = "";

      if (imagemFile) {
         setMessage("Processando foto...");
         try {
             arquivoFinal = await compressImage(imagemFile);
             setProgress(30);
             fotoBase64ParaPDF = await fileToBase64(arquivoFinal);
         } catch (e) {
             console.error("Erro na compressão, usando original:", e);
             fotoBase64ParaPDF = await fileToBase64(imagemFile);
         }
      }

      const nomeUser = user?.nome || "Responsável";
      const responsavelRegistro = `${nomeUser} (Gestão)`;

      setMessage("Gerando etiqueta...");
      
      // --- GERAÇÃO DO PDF COM O NOVO CAMPO ---
      const pdfBlob = await gerarEtiquetaPDF({
          protocolo: novoProtocolo,
          condominioNome: nomes.condominioNome,
          moradorNome: nomes.moradorNome,
          bloco: nomes.blocoNome,
          apartamento: nomes.apartamento, 
          dataChegada: new Date().toISOString(),
          recebidoPor: responsavelRegistro,
          observacao: observacao, // Observação limpa
          localRetirada: localArmazenamento, // Passando o local separado
          fotoUrl: fotoBase64ParaPDF,
          logoUrl: "/logo-app-correspondencia.png"
      });
      
      const localPdfUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(localPdfUrl);
      setProtocolo(novoProtocolo);
      setProgress(60);

      setMessage("Salvando no sistema...");
      
      let publicPdfUrl = "";
      let publicFotoUrl = "";

      // 1. Upload PDF
      const pdfRef = ref(storage, `correspondencias/entrada_${novoProtocolo}_${Date.now()}.pdf`);
      await uploadBytes(pdfRef, pdfBlob);
      publicPdfUrl = await getDownloadURL(pdfRef);

      // 2. Upload Foto (Se houver)
      if (arquivoFinal) {
          const fotoRef = ref(storage, `correspondencias/foto_${novoProtocolo}_${Date.now()}.jpg`);
          await uploadBytes(fotoRef, arquivoFinal);
          publicFotoUrl = await getDownloadURL(fotoRef);
      }

      // 3. Salvar no Banco
      await setDoc(docRef, {
          condominioId: efetivoCondominioId,
          blocoId: selectedBloco,
          blocoNome: nomes.blocoNome,
          moradorId: selectedMorador,
          moradorNome: nomes.moradorNome,
          apartamento: nomes.apartamento,
          protocolo: novoProtocolo,
          observacao,
          localArmazenamento, // Salva no banco também
          status: "pendente", 
          criadoEm: Timestamp.now(),
          criadoPor: user?.email || "responsavel",
          criadoPorNome: nomeUser, 
          criadoPorCargo: "Responsável",
          imagemUrl: publicFotoUrl,
          pdfUrl: publicPdfUrl,
          moradorTelefone: telefoneMorador,
          moradorEmail: emailMorador
      });

      console.log("✅ Correspondência salva com sucesso! ID:", docRef.id);
      setProgress(100);

      // Mensagem Whatsapp
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
      const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const variaveis = {
        MORADOR: nomes.moradorNome,
        UNIDADE: nomes.apartamento,
        BLOCO: nomes.blocoNome,
        PROTOCOLO: novoProtocolo,
        LOCAL: localArmazenamento,
        RECEBIDO_POR: nomeUser,
        DATA_HORA: `${dataFormatada}, ${horaFormatada}`,
        CONDOMINIO: nomes.condominioNome || "Condomínio" 
      };

      const msgBase = await getFormattedMessage('ARRIVAL', variaveis);
      setMensagemFormatada(`${msgBase}\n${novoLinkPublico}`);

      setLoading(false);
      setShowSuccessModal(true);

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Ocorreu um erro ao processar. Tente novamente.");
    }
  };

  const handleCloseSuccess = () => {
      setObservacao("");
      setImagemFile(null);
      setPdfUrl("");
      setLinkPublico("");
      setMensagemFormatada("");
      setSelectedMorador(""); 
      setShowSuccessModal(false);
  };

  const handleImprimir = () => {
      if (pdfUrl) window.open(pdfUrl, "_blank");
  };

  const handleReenviarEmail = async () => {
      alert("O e-mail já está sendo enviado automaticamente pelo sistema.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
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
              mensagemFormatada={mensagemFormatada} 
              onClose={handleCloseSuccess}
              onImprimir={handleImprimir}
              onReenviarEmail={handleReenviarEmail}
          />
      )}
      
      <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        
        <BotaoVoltar url={backRoute} />
        
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-[#057321] to-[#046119]">
              <Building2 className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nova Encomenda</h1>
              <p className="text-gray-600">Gestão de Entrada</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowConfigModal(true)}
            className="px-4 py-2.5 bg-[#057321] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#046119] transition-all flex items-center gap-2 uppercase tracking-wide"
            title="Configurar Mensagem Automática"
          >
            <MessageCircle size={20} />
            Mensagem Whatsapp
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#057321] to-[#0a9f2f]"></div>
          <div className="p-6 space-y-6">
            
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                <Package size={20} className="text-[#057321]" /> Destinatário
              </label>
              <SelectCondominioBlocoMorador 
                  onSelect={({ condominioId, blocoId, moradorId }) => { 
                      setSelectedCondominio(condominioId); 
                      setSelectedBloco(blocoId); 
                      setSelectedMorador(moradorId); 
                  }} 
              />
            </div>

            {/* --- NOVA SEÇÃO DE LOCAL DE RETIRADA --- */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin size={18} className="text-[#057321]" /> Local de Retirada
              </label>
              <select
                value={localArmazenamento}
                onChange={(e) => setLocalArmazenamento(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#057321] focus:ring-4 focus:ring-[#057321]/10 outline-none transition-all bg-white text-gray-800 font-medium cursor-pointer"
              >
                <option value="Portaria">Portaria</option>
                <option value="Administração">Administração</option>
                <option value="Sala de Correspondência">Sala de Correspondência</option>
                <option value="Recepção">Recepção</option>
                <option value="Smart Lockers">Smart Lockers</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FileText size={18} className="text-[#057321]" /> Detalhes / Observação
              </label>
              <textarea 
                value={observacao} 
                onChange={(e) => setObservacao(e.target.value)} 
                placeholder="Ex: Caixa grande Amazon, Envelope bancário..." 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#057321] focus:ring-4 focus:ring-[#057321]/10 outline-none transition-all placeholder:text-gray-400" 
                rows={3} 
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Camera size={18} className="text-[#057321]" /> Foto da Encomenda (Opcional)
              </label>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 border-dashed hover:border-[#057321] transition-colors">
                <UploadImagem onUpload={handleUpload} />
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={salvar} 
                disabled={loading} 
                className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-[#057321] to-[#046119]"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />} 
                {loading ? "Registrando..." : "Registrar Entrada"}
              </button>
            </div>

          </div>
        </div>

        <MessageConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          condoId={efetivoCondominioId}
          category="ARRIVAL"
        />

      </main>
    </div>
  );
}

export default withAuth(NovaCorrespondenciaResponsavelPage, ['responsavel', 'adminMaster']);