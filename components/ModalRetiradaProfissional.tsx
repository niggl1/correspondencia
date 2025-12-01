"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db, storage } from "@/app/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { X, Save, AlertCircle } from "lucide-react";
import AssinaturaDigitalPro from "./AssinaturaDigitalPro";
import UploadImagem from "./UploadImagem";
import { gerarReciboPDF } from "@/utils/gerarReciboPDF";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import ModalSucessoRetirada from "./ModalSucessoRetirada";
import type { ConfiguracoesRetirada, DadosRetirada } from "@/types/retirada.types";

interface Props {
  correspondencia: any;
  onClose: () => void;
  onSuccess: () => void;
  embedded?: boolean; 
}

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
            const newFile = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
            resolve(newFile);
          } else { resolve(file); }
        }, "image/jpeg", 0.6);
      };
    };
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

export default function ModalRetiradaProfissional({
  correspondencia,
  onClose,
  onSuccess,
  embedded = false, 
}: Props) {
  const { user } = useAuth(); // O hook pode retornar user undefined
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Processando...");
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState("");
  
  // ESTADO DA MENSAGEM
  const [mensagemFormatada, setMensagemFormatada] = useState("");

  const [moradorPhone, setMoradorPhone] = useState(
      correspondencia.telefoneMorador || correspondencia.moradorTelefone || ""
  );
  const [moradorEmail, setMoradorEmail] = useState(
      correspondencia.emailMorador || correspondencia.moradorEmail || ""
  );

  const backgroundTaskRef = useRef<Promise<void> | null>(null);

  const [config, setConfig] = useState<ConfiguracoesRetirada>({
    assinaturaMoradorObrigatoria: true,
    assinaturaPorteiroObrigatoria: true,
    fotoDocumentoObrigatoria: false,
    selfieObrigatoria: false,
    geolocalizacaoObrigatoria: false,
    enviarWhatsApp: true,
    enviarEmail: true,
    enviarSMS: false,
    verificarMoradorAutorizado: true,
    permitirRetiradaTerceiro: false,
    exigirCodigoConfirmacao: false,
    incluirFotoCorrespondencia: true,
    incluirQRCode: true,
    incluirLogoCondominio: false,
    permitirRetiradaParcial: false,
    exigirAvaliacaoServico: false,
  });

  const [nomeQuemRetirou, setNomeQuemRetirou] = useState("");
  const [cpfQuemRetirou, setCpfQuemRetirou] = useState("");
  const [telefoneQuemRetirou, setTelefoneQuemRetirou] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [assinaturaMorador, setAssinaturaMorador] = useState<string>("");
  const [assinaturaPorteiro, setAssinaturaPorteiro] = useState<string>("");
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [salvarPadrao, setSalvarPadrao] = useState(false);

  useEffect(() => {
    if (user?.condominioId) carregarConfiguracoes();
    if (user?.uid) carregarAssinaturaPorteiro();
    
    if (!moradorPhone && correspondencia?.moradorId) {
        carregarDadosMorador();
    }
  }, [user, correspondencia]);

  async function carregarDadosMorador() {
     try {
       if(correspondencia.moradorId) {
           const docSnap = await getDoc(doc(db, "users", correspondencia.moradorId));
           if(docSnap.exists()) {
               const data = docSnap.data();
               if (data.whatsapp || data.telefone) setMoradorPhone(data.whatsapp || data.telefone);
               if (data.email) setMoradorEmail(data.email);
           }
       }
    } catch (e) { console.error(e); }
  }

  async function carregarConfiguracoes() {
    if (!user?.condominioId) return;
    try {
      const docRef = doc(db, "condominios", user.condominioId, "configuracoes", "retirada");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setConfig(docSnap.data() as ConfiguracoesRetirada);
    } catch (error) { console.error(error); }
  }

  async function carregarAssinaturaPorteiro() {
    if (!user?.uid) return;
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data()?.assinaturaPadrao) {
          setAssinaturaPorteiro(docSnap.data()?.assinaturaPadrao);
      }
    } catch (error) { console.error(error); }
  }

  function gerarCodigoVerificacao(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  const handleUpload = (file: File | null) => setImagemFile(file);

  function removerUndefined(obj: any): any {
    const resultado: any = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) resultado[key] = obj[key];
    });
    return resultado;
  }

  async function handleConfirmar() {
    if (!nomeQuemRetirou.trim()) { setError("Nome de quem retirou é obrigatório"); return; }
    if (config.assinaturaMoradorObrigatoria && !assinaturaMorador) { setError("Assinatura do morador é obrigatória"); return; }
    if (!user?.uid || !user?.nome || !user?.condominioId) { setError("Erro de autenticação"); return; }

    setLoading(true);
    setMessage("Preparando arquivos...");
    setProgress(5);
    setError("");

    try {
      if (salvarPadrao && assinaturaPorteiro && user.uid) {
         updateDoc(doc(db, "users", user.uid), {
             assinaturaPadrao: assinaturaPorteiro
         }).catch(e => console.error("Erro ao salvar assinatura padrão:", e));
      }

      let arquivoImagemFinal = imagemFile;
      if (imagemFile) {
        setMessage("Otimizando foto...");
        arquivoImagemFinal = await compressImage(imagemFile);
        setProgress(15);
      }

      const dadosRetiradaBruto: DadosRetirada = {
        nomeQuemRetirou: nomeQuemRetirou.trim(),
        cpfQuemRetirou: cpfQuemRetirou.trim() || undefined,
        telefoneQuemRetirou: telefoneQuemRetirou.trim() || undefined,
        // CORREÇÃO 1: Adicionado fallback (|| "Porteiro") para evitar erro
        nomePorteiro: user?.nome || "Porteiro", 
        dataHoraRetirada: new Date().toISOString(),
        assinaturaMorador: assinaturaMorador || undefined,
        assinaturaPorteiro: assinaturaPorteiro || undefined,
        observacoes: observacoes.trim() || undefined,
        codigoVerificacao: gerarCodigoVerificacao(),
      };

      if (arquivoImagemFinal) {
        const localBase64 = await fileToBase64(arquivoImagemFinal);
        dadosRetiradaBruto.fotoComprovanteUrl = localBase64;
      }

      setMessage("Gerando recibo...");
      const pdfBlob = await gerarReciboPDF({
        correspondencia,
        dadosRetirada: dadosRetiradaBruto,
        nomeCondominio: correspondencia.condominioNome || "Condomínio",
        logoUrl: "/logo-app-correspondencia.png",
        onProgress: (val) => setProgress(20 + (val * 0.4)) 
      });

      setMessage("Finalizando...");
      const timestamp = Date.now();
      const pdfFileName = `recibo_${correspondencia.protocolo}_${timestamp}.pdf`;
      const pdfStorageRef = ref(storage, `correspondencias/${pdfFileName}`);
      
      await uploadBytes(pdfStorageRef, pdfBlob);
      const publicPdfUrl = await getDownloadURL(pdfStorageRef);
      
      setFinalPdfUrl(publicPdfUrl); 
      setProgress(100);
      
      // --- MENSAGEM FORMATADA ---
      const dataHoje = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      
      const textoQuemRetirou = nomeQuemRetirou.trim().toLowerCase() === correspondencia.moradorNome?.toLowerCase() 
          ? `Retirado por: ${correspondencia.moradorNome}`
          : `Retirado por: ${nomeQuemRetirou}`;

      const msg = `*AVISO DE RETIRADA*

Olá, *${correspondencia.moradorNome}*!
Unidade: ${correspondencia.apartamento} (${correspondencia.blocoNome})

Sua correspondência foi entregue
━━━━━━━━━━━━━━━━
│ *PROTOCOLO: ${correspondencia.protocolo}*
│ Status: ✅ ENTREGUE
│ ${textoQuemRetirou}
│ Data: ${dataHoje}
━━━━━━━━━━━━━━━━

Se você não reconhece esta retirada, entre em contato com a portaria imediatamente.`;

      setMensagemFormatada(msg);
      // --------------------------

      setLoading(false);
      setShowSuccessModal(true);

      backgroundTaskRef.current = (async () => {
          try {
              let fotoUrlFirebase = "";
              if (arquivoImagemFinal) {
                  const fotoFileName = `retirada_${correspondencia.protocolo}_${timestamp}.jpg`;
                  const fotoStorageRef = ref(storage, `retiradas/${fotoFileName}`);
                  await uploadBytes(fotoStorageRef, arquivoImagemFinal);
                  fotoUrlFirebase = await getDownloadURL(fotoStorageRef);
              }

              if (fotoUrlFirebase) dadosRetiradaBruto.fotoComprovanteUrl = fotoUrlFirebase;
              else delete dadosRetiradaBruto.fotoComprovanteUrl; 
              
              const dadosRetirada = removerUndefined(dadosRetiradaBruto);
              const batchWrites = [];
              
              const corrRef = doc(db, "correspondencias", correspondencia.id);
              batchWrites.push(setDoc(corrRef, {
                  status: "retirada",
                  retiradoEm: Timestamp.now(),
                  dadosRetirada,
                  reciboUrl: publicPdfUrl,
              }, { merge: true }));

              const retiradaRef = doc(db, "retiradas", `${correspondencia.id}_${Date.now()}`);
              batchWrites.push(setDoc(retiradaRef, removerUndefined({
                correspondenciaId: correspondencia.id,
                protocolo: correspondencia.protocolo,
                // CORREÇÃO 2: Adicionado fallback (|| "") para evitar erro
                condominioId: user?.condominioId || "", 
                ...dadosRetirada,
                status: "concluida",
                criadoEm: new Date().toISOString(),
              })));

              await Promise.all(batchWrites);
          } catch (bgError) { console.error("❌ [Background] Erro:", bgError); }
      })();

    } catch (err: any) {
      console.error("Erro crítica:", err);
      setError(`Erro: ${err?.message || "Falha ao processar"}`);
      setLoading(false);
    }
  }

  const handleCloseSuccess = async () => {
      if (backgroundTaskRef.current) await backgroundTaskRef.current;
      onSuccess(); 
  };

  if (showSuccessModal) {
      return (
          <ModalSucessoRetirada
            id={correspondencia.id}
            protocolo={correspondencia.protocolo}
            moradorNome={correspondencia.moradorNome}
            telefoneMorador={moradorPhone}
            emailMorador={moradorEmail}
            pdfUrl={finalPdfUrl}
            mensagemFormatada={mensagemFormatada}
            onClose={handleCloseSuccess} 
          />
      );
  }

  const wrapperClass = embedded 
      ? "w-full h-full bg-white flex flex-col"
      : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";

  const containerClass = embedded
      ? "flex-1 overflow-y-auto"
      : "bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto";

  return (
    <div className={wrapperClass}>
      <LoadingOverlay isVisible={loading} progress={progress} message={message} />
      <div className={containerClass}>
        {!embedded && (
          <div className="bg-primary-600 text-white p-6 rounded-t-lg flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Registrar Retirada</h2>
              <p className="text-primary-100 text-sm mt-1">Protocolo: {correspondencia.protocolo}</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-primary-700 p-2 rounded-lg" disabled={loading}>
              <X size={24} />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
           <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Dados da Correspondência</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-600">Morador:</span><span className="ml-2 font-medium">{correspondencia.moradorNome}</span></div>
              <div><span className="text-gray-600">Bloco/Apto:</span><span className="ml-2 font-medium">{correspondencia.blocoNome} - {correspondencia.apartamento}</span></div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome de quem retirou *</label>
              <input type="text" value={nomeQuemRetirou} onChange={(e) => setNomeQuemRetirou(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Nome completo" disabled={loading} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                <input type="text" value={cpfQuemRetirou} onChange={(e) => setCpfQuemRetirou(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="000.000.000-00" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                <input type="text" value={telefoneQuemRetirou} onChange={(e) => setTelefoneQuemRetirou(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="(00) 00000-0000" disabled={loading} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto da Retirada (opcional)</label>
              <UploadImagem onUpload={handleUpload} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={loading} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Assinaturas</h3>
            
            {config.assinaturaMoradorObrigatoria && (
              <AssinaturaDigitalPro 
                onSave={setAssinaturaMorador} 
                label="Assinatura do Morador *" 
                obrigatorio={true} 
              />
            )}
            
            <div className="space-y-2">
                <AssinaturaDigitalPro 
                    onSave={setAssinaturaPorteiro} 
                    label="Assinatura do Porteiro"
                />
                <div className="flex items-center gap-2 pt-1">
                    <input 
                        type="checkbox" 
                        id="salvarPadrao"
                        checked={salvarPadrao}
                        onChange={(e) => setSalvarPadrao(e.target.checked)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                    />
                    <label htmlFor="salvarPadrao" className="text-sm text-gray-600 cursor-pointer select-none flex items-center gap-1">
                        Salvar esta assinatura como padrão para <strong>{user?.nome?.split(' ')[0]}</strong>
                    </label>
                </div>
            </div>

          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-b-lg flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100" disabled={loading}>Cancelar</button>
          <button onClick={handleConfirmar} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400">
            <Save size={20} />
            {loading ? "Processando..." : "Confirmar Retirada"}
          </button>
        </div>
      </div>
    </div>
  );
}



