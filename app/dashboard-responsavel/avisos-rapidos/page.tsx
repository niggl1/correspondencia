"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAvisosRapidos } from "@/hooks/useAvisosRapidos";
import { db, storage } from "@/app/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";
import withAuth from "@/components/withAuth";
import UploadImagem from "@/components/UploadImagem";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import {
  Building2,
  User,
  Phone,
  Home,
  X,
  Zap,
  CheckCircle,
  AlertCircle,
  Settings,
  Save,
  RotateCcw,
  AlertTriangle,
  History,
  Search,
  Send,
} from "lucide-react";

// --- FUNÇÃO DE COMPRESSÃO OTIMIZADA PARA CELULAR ---
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.4
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
};

interface Bloco {
  id: string;
  nome: string;
  condominioId: string;
}

interface Morador {
  id: string;
  nome: string;
  apartamento: string;
  telefone?: string;
  blocoId?: string;
  blocoNome?: string;
  condominioId?: string;
  role?: string;
  aprovado?: boolean;
}

function AvisosRapidosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { registrarAviso } = useAvisosRapidos();

  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [blocoSelecionado, setBlocoSelecionado] = useState<Bloco | null>(null);
  const [modalAberto, setModalAberto] = useState<boolean>(false);

  const [termoBusca, setTermoBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<Morador[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [termoBuscaModal, setTermoBuscaModal] = useState("");

  const [loadingTela, setLoadingTela] = useState<boolean>(true);
  const [sucesso, setSucesso] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  const [modalEnvioAberto, setModalEnvioAberto] = useState(false);
  const [moradorParaEnvio, setMoradorParaEnvio] = useState<Morador | null>(null);
  const [imagemAviso, setImagemAviso] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [protocoloGerado, setProtocoloGerado] = useState("");

  // ✅ Overlay padrão
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Processando...");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const LINK_SISTEMA_FALLBACK = `${baseUrl}/login`;

  // ✅ PADRÃO NOVO
  const MSG_PADRAO = `*AVISO DE CORRESPONDÊNCIA*

Olá, *{{NOME}}*!
Unidade: {{APTO}} ({{BLOCO}})

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ *PROTOCOLO: {{PROTOCOLO}}*
│ Enviado por: {{ENVIADO_POR}}
━━━━━━━━━━━━━━━━

🔗 *Acessar no sistema:*
{{LINK}}

Aguardamos a sua retirada`;

  const [mensagemTemplate, setMensagemTemplate] = useState<string>(MSG_PADRAO);
  const [mostrarConfigMsg, setMostrarConfigMsg] = useState(false);

  const STORAGE_KEY = "aviso_msg_template_v4";

  const getBackUrl = () => {
    if (user?.role === "responsavel") return "/dashboard-responsavel";
    return "/dashboard-porteiro";
  };

  const getHistoricoUrl = () => {
    if (user?.role === "responsavel") return "/dashboard-responsavel/historico-avisos";
    return "/dashboard-porteiro/historico-avisos";
  };

  useEffect(() => {
    const msgSalva = localStorage.getItem(STORAGE_KEY);
    if (msgSalva) setMensagemTemplate(msgSalva);
    else setMensagemTemplate(MSG_PADRAO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvarMensagem = () => {
    localStorage.setItem(STORAGE_KEY, mensagemTemplate);
    setSucesso("Modelo de mensagem salvo!");
    setTimeout(() => setSucesso(""), 3000);
    setMostrarConfigMsg(false);
  };

  const resetarMensagem = () => {
    setMensagemTemplate(MSG_PADRAO);
    localStorage.removeItem(STORAGE_KEY);
    setSucesso("Mensagem restaurada.");
    setTimeout(() => setSucesso(""), 3000);
  };

  useEffect(() => {
    if (user?.condominioId) carregarBlocos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.condominioId]);

  const carregarBlocos = async () => {
    try {
      setLoadingTela(true);
      const blocosRef = collection(db, "blocos");
      const q = query(blocosRef, where("condominioId", "==", user?.condominioId));
      const snapshot = await getDocs(q);

      const blocosData: Bloco[] = [];
      snapshot.forEach((d) => {
        blocosData.push({
          id: d.id,
          nome: d.data().nome,
          condominioId: d.data().condominioId,
        });
      });

      blocosData.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
      setBlocos(blocosData);
    } catch (error) {
      console.error(error);
      setErro("Erro ao carregar blocos");
    } finally {
      setLoadingTela(false);
    }
  };

  const realizarBusca = async () => {
    if (!termoBusca.trim()) {
      setResultadosBusca([]);
      return;
    }

    setBuscando(true);
    setErro("");

    try {
      const termoLimpo = termoBusca.toLowerCase().trim();
      const q = query(
        collection(db, "users"),
        where("condominioId", "==", user?.condominioId),
        where("role", "==", "morador")
      );

      const snapshot = await getDocs(q);
      const resultados: Morador[] = [];

      snapshot.forEach((d) => {
        const data = d.data() as any;
        const nome = (data.nome || "").toLowerCase();
        const apto = (data.unidadeNome || data.apartamento || "").toString().toLowerCase();

        if (nome.includes(termoLimpo) || apto.includes(termoLimpo)) {
          resultados.push({
            id: d.id,
            nome: data.nome,
            apartamento: data.unidadeNome || data.apartamento || "?",
            telefone: data.whatsapp || data.telefone || "",
            blocoId: data.blocoId,
            blocoNome: data.blocoNome,
            condominioId: data.condominioId,
            role: data.role,
            aprovado: data.aprovado,
          });
        }
      });

      const listaFiltrada = resultados.filter((m) => m.aprovado === true || m.aprovado === undefined);
      setResultadosBusca(listaFiltrada);
      if (listaFiltrada.length === 0) setErro("Nenhum morador encontrado.");
    } catch (err) {
      console.error(err);
      setErro("Erro ao buscar morador.");
    } finally {
      setBuscando(false);
    }
  };

  const carregarMoradoresDoBloco = async (bloco: Bloco) => {
    try {
      setLoadingTela(true);
      setBlocoSelecionado(bloco);
      setTermoBuscaModal("");

      const q = query(
        collection(db, "users"),
        where("condominioId", "==", user?.condominioId),
        where("blocoId", "==", bloco.id),
        where("role", "==", "morador")
      );

      const snapshot = await getDocs(q);

      let moradoresData: Morador[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        moradoresData.push({
          id: d.id,
          nome: data.nome,
          apartamento: data.unidadeNome || data.apartamento || "?",
          telefone: data.whatsapp || data.telefone || "",
          blocoId: data.blocoId,
          blocoNome: data.blocoNome || bloco.nome,
          condominioId: data.condominioId,
          role: data.role,
          aprovado: data.aprovado,
        });
      });

      moradoresData = moradoresData.filter((m) => m.aprovado === true || m.aprovado === undefined);
      moradoresData.sort((a, b) => a.apartamento.localeCompare(b.apartamento, "pt-BR", { numeric: true }));

      setMoradores(moradoresData);
      setModalAberto(true);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar moradores.");
    } finally {
      setLoadingTela(false);
    }
  };

  const prepararEnvio = (morador: Morador) => {
    if (!morador.telefone) {
      setErro(`O morador ${morador.nome} não possui WhatsApp.`);
      setTimeout(() => setErro(""), 3000);
      return;
    }
    const protocolo = `AV-${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
    setMoradorParaEnvio(morador);
    setProtocoloGerado(protocolo);
    setImagemAviso(null);
    setModalEnvioAberto(true);
  };

  const confirmarEnvio = async () => {
    if (!moradorParaEnvio) return;

    // ✅ DETECÇÃO CAPACITOR/WEB
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
    let whatsappWindow: Window | null = null;

    // SE FOR WEB: Abre janela IMEDIATAMENTE para evitar bloqueio de popup
    if (!isCapacitor) {
        whatsappWindow = window.open("", "_blank");
        if (whatsappWindow) {
          whatsappWindow.document.write(`
            <html>
              <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f0f2f5;">
                <h2 style="color: #057321;">Gerando mensagem...</h2>
                <p style="color: #666;">Por favor, aguarde enquanto preparamos o envio.</p>
              </body>
            </html>
          `);
        }
    }

    setEnviando(true);
    setErro("");
    setLoading(true);
    setMessage("Iniciando envio...");
    setProgress(10);

    try {
      setProgress(20);
      setMessage("Validando número...");

      const telefoneDoMorador = moradorParaEnvio.telefone || "";
      let cleanPhone = telefoneDoMorador.replace(/\D/g, "");

      if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
      if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = "55" + cleanPhone;

      if (cleanPhone.length < 12) throw new Error("Número de telefone inválido.");

      // ✅ 1) upload da imagem (se houver)
      let publicFotoUrl = "";
      if (imagemAviso) {
        setProgress(35);
        setMessage("Processando imagem...");

        const arquivoFinal = await compressImage(imagemAviso);

        setProgress(50);
        setMessage("Enviando imagem...");

        const storageRef = ref(storage, `avisos/temp_${Date.now()}_${moradorParaEnvio.id}.jpg`);
        await uploadBytes(storageRef, arquivoFinal);
        publicFotoUrl = await getDownloadURL(storageRef);
      }

      setProgress(70);
      setMessage("Salvando no sistema...");

      // ✅ 2) cria doc primeiro (pra pegar ID)
      const avisoId = await registrarAviso({
        enviadoPorId: user?.uid || "",
        enviadoPorNome: user?.nome || "Usuário",
        enviadoPorRole: user?.role || "porteiro",

        moradorId: moradorParaEnvio.id,
        moradorNome: moradorParaEnvio.nome,
        moradorTelefone: moradorParaEnvio.telefone || "",

        condominioId: user?.condominioId || "",
        blocoId: moradorParaEnvio.blocoId || "",
        blocoNome: blocoSelecionado?.nome || moradorParaEnvio.blocoNome || "",
        apartamento: moradorParaEnvio.apartamento,

        // placeholder (será atualizado com a mensagem final)
        mensagem: "Gerando...",
        protocolo: protocoloGerado,
        fotoUrl: publicFotoUrl,
      });

      setProgress(85);
      setMessage("Gerando link do WhatsApp...");

      const linkDoAviso = `${baseUrl}/ver/${avisoId}`;
      const enviadoPorNome = user?.nome || "Usuário";
      const blocoNomeFinal = blocoSelecionado?.nome || moradorParaEnvio.blocoNome || "";

      // ✅ 3) substitui variáveis
      let mensagemFinal = mensagemTemplate;
      mensagemFinal = mensagemFinal.replaceAll("{{NOME}}", moradorParaEnvio.nome);
      mensagemFinal = mensagemFinal.replaceAll("{{APTO}}", moradorParaEnvio.apartamento);
      mensagemFinal = mensagemFinal.replaceAll("{{BLOCO}}", blocoNomeFinal || "");
      mensagemFinal = mensagemFinal.replaceAll("{{PROTOCOLO}}", protocoloGerado);
      mensagemFinal = mensagemFinal.replaceAll("{{ENVIADO_POR}}", enviadoPorNome);

      mensagemFinal = mensagemFinal.replaceAll("{{LINK}}", linkDoAviso || LINK_SISTEMA_FALLBACK);
      
      // ✅ REMOVIDO: Link da foto não vai mais no texto do WhatsApp para evitar URL longa
      mensagemFinal = mensagemFinal.replaceAll("{{FOTO}}", "");

      // ✅ 4) salva mensagem final no Firestore
      await updateDoc(doc(db, "avisos_rapidos", avisoId), {
        mensagem: mensagemFinal,
        linkUrl: linkDoAviso,
        fotoUrl: publicFotoUrl || null, // garante padrão
      });

      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensagemFinal)}`;

      setProgress(100);
      setMessage("Abrindo WhatsApp...");

      // ✅ ABERTURA INTELIGENTE
      if (isCapacitor) {
         // App Nativo: Usa _system
         window.open(whatsappLink, "_system");
      } else {
         // Web: Usa a janela que já foi aberta
         if (whatsappWindow) whatsappWindow.location.href = whatsappLink;
         else window.open(whatsappLink, "_blank");
      }

      setSucesso(`Aviso enviado para ${moradorParaEnvio.nome}!`);
      setTimeout(() => setSucesso(""), 4000);

      setModalEnvioAberto(false);
      setModalAberto(false);
    } catch (error) {
      console.error("Erro envio:", error);
      setErro("Erro ao processar envio.");
      // Se deu erro na web, fecha a janela que ficou "loading"
      if (whatsappWindow) whatsappWindow.close();
    } finally {
      setEnviando(false);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setMessage("Processando...");
      }, 400);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setBlocoSelecionado(null);
    setMoradores([]);
    setTermoBuscaModal("");
  };

  const moradoresFiltradosNoModal = moradores.filter((m) => {
    const busca = termoBuscaModal.toLowerCase();
    return m.nome.toLowerCase().includes(busca) || m.apartamento.toLowerCase().includes(busca);
  });

  const renderCardMorador = (morador: Morador) => (
    <button
      key={morador.id}
      onClick={() => prepararEnvio(morador)}
      className="bg-white border border-[#057321] rounded-xl p-4 transition-all text-left shadow-sm hover:shadow-md group w-full hover:bg-gray-50"
      disabled={enviando}
    >
      <div className="flex items-start gap-3">
        <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
          <Home className="text-white" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col mb-1">
            {morador.blocoNome ? (
              <span className="text-xs font-bold text-[#057321] uppercase w-fit mb-1">Bloco {morador.blocoNome}</span>
            ) : (
              <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded w-fit mb-1">
                Sem Bloco
              </span>
            )}
            <span className="font-bold text-gray-900 text-lg leading-tight">Apto {morador.apartamento}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <User className="text-gray-500 flex-shrink-0" size={14} />
            <p className="text-gray-700 text-sm truncate">{morador.nome}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className={`flex-shrink-0 ${morador.telefone ? "text-green-600" : "text-red-500"}`} size={14} />
            <p className={`text-xs ${morador.telefone ? "text-green-700" : "text-red-600"}`}>
              {morador.telefone || "Sem WhatsApp"}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 self-center">
          <div className="bg-[#057321] text-white px-3 py-1 rounded-full text-xs font-bold group-hover:bg-[#046119] transition-all">
            Avisar
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />

      <LoadingOverlay isVisible={loading} progress={progress} message={message} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <BotaoVoltar url={getBackUrl()} />

        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#057321] rounded-xl shadow-sm p-6 mt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-3 rounded-full shadow-md">
              <Zap className="text-white" size={28} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Avisos Rápidos</h1>
          </div>
          <p className="text-gray-600 ml-14">Gerencie os avisos e envie mensagens rapidamente.</p>
        </div>

        {sucesso && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-xl p-4 flex items-center gap-3 animate-pulse">
            <CheckCircle className="text-green-600" size={24} />
            <p className="font-bold text-green-800">✅ {sucesso}</p>
          </div>
        )}

        {erro && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={24} />
            <p className="font-bold text-red-800">❌ {erro}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => router.push(getHistoricoUrl())}
            className="bg-[#057321] border-2 border-[#046019] text-white px-6 py-4 rounded-xl shadow-md hover:bg-[#046019] transition-all flex items-center justify-center gap-3 h-20"
            disabled={enviando}
          >
            <History size={24} /> <span className="font-bold text-sm uppercase">Histórico</span>
          </button>

          <button
            onClick={() => setMostrarConfigMsg(!mostrarConfigMsg)}
            className={`bg-[#057321] border-2 border-[#046019] text-white px-6 py-4 rounded-xl shadow-md hover:bg-[#046019] transition-all flex items-center justify-center gap-3 h-20 ${
              mostrarConfigMsg ? "ring-4 ring-green-200" : ""
            }`}
            disabled={enviando}
          >
            <Settings size={24} /> <span className="font-bold text-sm uppercase">Configurar msg WhatsApp</span>
          </button>
        </div>

        {/* ✅ MODAL PADRÃO (Configurar msg WhatsApp) */}
        {mostrarConfigMsg && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#057321] to-[#046119] px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    <Settings className="text-[#057321]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-bold leading-tight">Configurar Mensagem do WhatsApp</h3>
                    <p className="text-green-100 text-xs mt-0.5">Ajuste o modelo usando as variáveis disponíveis</p>
                  </div>
                </div>

                <button
                  onClick={() => setMostrarConfigMsg(false)}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
                  disabled={enviando}
                  aria-label="Fechar"
                >
                  <X className="text-white" size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg flex items-start gap-3 mb-5">
                  <AlertTriangle className="text-yellow-700 flex-shrink-0 mt-0.5" size={18} />
                  <div className="text-sm text-yellow-900">
                    <p className="font-bold mb-1">Variáveis disponíveis:</p>
                    <p className="leading-relaxed">
                      <strong>{"{{NOME}}"}</strong>, <strong>{"{{APTO}}"}</strong>, <strong>{"{{BLOCO}}"}</strong>,{" "}
                      <strong>{"{{PROTOCOLO}}"}</strong>, <strong>{"{{ENVIADO_POR}}"}</strong>,{" "}
                      <strong>{"{{LINK}}"}</strong>.
                    </p>
                  </div>
                </div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Modelo da Mensagem:</label>
                <textarea
                  value={mensagemTemplate}
                  onChange={(e) => setMensagemTemplate(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-4 h-96 focus:ring-2 focus:ring-[#057321] outline-none"
                  disabled={enviando}
                />

                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <button
                    onClick={salvarMensagem}
                    className="sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#057321] text-white rounded-xl hover:bg-[#046119] font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={enviando}
                  >
                    <Save size={18} /> Salvar
                  </button>

                  <button
                    onClick={resetarMensagem}
                    className="sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={enviando}
                  >
                    <RotateCcw size={18} /> Padrão
                  </button>

                  <button
                    onClick={() => setMostrarConfigMsg(false)}
                    className="sm:flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={enviando}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Buscar Morador</h2>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  if (!e.target.value) setResultadosBusca([]);
                }}
                onKeyDown={(e) => e.key === "Enter" && realizarBusca()}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] outline-none"
                placeholder="Buscar por Nome ou Apto..."
                disabled={enviando}
              />
            </div>
            <button
              onClick={realizarBusca}
              className="bg-[#057321] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#046019]"
              disabled={buscando || enviando}
            >
              {buscando ? "..." : "Buscar"}
            </button>
          </div>
        </div>

        {resultadosBusca.length > 0 ? (
          <div className="animate-fade-in mb-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Resultados ({resultadosBusca.length})</h2>
              <button
                onClick={() => {
                  setTermoBusca("");
                  setResultadosBusca([]);
                }}
                className="text-red-600 text-sm underline"
                disabled={enviando}
              >
                Limpar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resultadosBusca.map(renderCardMorador)}
            </div>
          </div>
        ) : loadingTela && blocos.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {blocos.map((bloco) => (
              <button
                key={bloco.id}
                onClick={() => carregarMoradoresDoBloco(bloco)}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-2 border-gray-100 hover:border-[#057321] flex flex-col items-center gap-3"
                disabled={enviando}
              >
                <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-4 rounded-full shadow-md group-hover:scale-110 transition-transform">
                  <Building2 className="text-white" size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-900 text-lg">{bloco.nome}</p>
                  <p className="text-xs text-gray-500 mt-1">Ver moradores</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {modalAberto && blocoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#057321] to-[#046119] p-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-full">
                  <Building2 className="text-[#057321]" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{blocoSelecionado.nome}</h2>
                  <p className="text-green-100 text-sm">{moradores.length} moradores</p>
                </div>
              </div>
              <button
                onClick={fecharModal}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full"
                disabled={enviando}
              >
                <X className="text-white" size={24} />
              </button>
            </div>

            <div className="p-4 bg-gray-50 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Filtrar no ${blocoSelecionado.nome}...`}
                  value={termoBuscaModal}
                  onChange={(e) => setTermoBuscaModal(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg pl-10 p-3 focus:ring-2 focus:ring-[#057321] outline-none"
                  autoFocus
                  disabled={enviando}
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingTela ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#057321] mx-auto"></div>
                </div>
              ) : moradoresFiltradosNoModal.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhum morador.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{moradoresFiltradosNoModal.map(renderCardMorador)}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {modalEnvioAberto && moradorParaEnvio && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Confirmar Aviso</h3>
            <p className="text-gray-500 text-sm mb-4">
              Enviar mensagem para <strong>{moradorParaEnvio.nome}</strong>?
            </p>

            <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200">
              <p className="text-sm font-bold text-gray-700">Protocolo Gerado:</p>
              <p className="text-2xl font-mono text-[#057321] tracking-wider">{protocoloGerado}</p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Adicionar Foto</label>
                <span className="text-sm font-extrabold text-red-600 bg-red-50 px-3 py-1 rounded border border-red-100">
                  (FOTO OPCIONAL)
                </span>
              </div>
              <UploadImagem onUpload={setImagemAviso} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalEnvioAberto(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50"
                disabled={enviando}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEnvio}
                className="flex-1 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={enviando}
              >
                <Send size={20} /> Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(AvisosRapidosPage, ["porteiro", "responsavel"]);