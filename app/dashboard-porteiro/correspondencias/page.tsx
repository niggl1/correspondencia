"use client";

import { useEffect, useState, useMemo, useCallback, memo } from "react";
import {
  Printer, MessageCircle, Mail, X, FileText, CheckCircle,
  Archive, Search, Filter, Package, RefreshCcw, Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCorrespondencias } from "@/hooks/useCorrespondencias";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import withAuth from "@/components/withAuth";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";

// ============================================================================
// 1. DEFINIÇÕES DE TIPOS
// ============================================================================
interface Linha {
  id: string;
  protocolo: string;
  moradorNome?: string;
  apartamento?: string;
  blocoNome?: string;
  condominioId: string;
  status: "pendente" | "retirada";
  imagemUrl?: string;
  pdfUrl?: string;
  reciboUrl?: string;
  criadoEm?: Timestamp;
  retiradoEm?: Timestamp;
  telefoneMorador?: string;
  emailMorador?: string;
  moradorId?: string;
}

// ============================================================================
// 2. COMPONENTES INTERNOS OTIMIZADOS
// ============================================================================

const ImagemComFallback = memo(({ src, classNameWrapper, classNameImg, iconSize = 24 }: any) => {
  const [erro, setErro] = useState(false);

  if (!src || erro) {
    return (
      <div className={`${classNameWrapper} bg-gray-50 flex items-center justify-center border border-gray-200`}>
        <Package size={iconSize} className="text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Foto"
      className={classNameImg}
      onError={() => setErro(true)}
      loading="lazy"
    />
  );
});

ImagemComFallback.displayName = "ImagemComFallback";

const TabelaInterna = memo(({
  dados,
  carregando,
  onAbrirAviso,
  onAbrirRetirada
}: {
  dados: Linha[],
  carregando: boolean,
  onAbrirAviso: (l: Linha) => void,
  onAbrirRetirada: (l: Linha) => void
}) => {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const lista = useMemo(() => {
    return dados.filter((d) => {
      if (filtroStatus && d.status !== filtroStatus) return false;
      if (busca) {
        const termo = busca.toLowerCase();
        const alvo = `${d.protocolo} ${d.moradorNome || ""} ${d.apartamento || ""} ${d.blocoNome || ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [dados, filtroStatus, busca]);

  const formatarData = (timestamp?: Timestamp) => {
    if (!timestamp || !timestamp.toDate) return "-";
    return timestamp.toDate().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  if (carregando && dados.length === 0) {
      return <div className="text-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#057321] mx-auto"></div></div>;
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              placeholder="Buscar por protocolo, morador, apartamento..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#057321]/30 focus:border-[#057321]/50 outline-none bg-white text-sm font-medium text-gray-800 placeholder:text-gray-400"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="relative md:w-56">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              className="w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#057321]/30 focus:border-[#057321]/50 outline-none cursor-pointer text-sm font-semibold text-gray-800"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="retirada">Retiradas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {lista.map((l) => (
          <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
            <div className="flex gap-3">
              <div className="shrink-0">
                <ImagemComFallback 
                  src={l.imagemUrl} 
                  classNameWrapper="w-16 h-16 rounded-xl"
                  classNameImg="w-16 h-16 object-cover rounded-xl border border-gray-200"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-900 text-base truncate">#{l.protocolo}</span>
                  {l.status === "retirada" ? (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-bold bg-[#057321] text-white border border-[#057321] shadow-sm shrink-0">Retirada</span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[12px] font-bold bg-white text-[#057321] border border-[#057321] shadow-sm shrink-0">Pendente</span>
                  )}
                </div>
                <p className="text-gray-900 font-semibold text-sm truncate mt-1">{l.moradorNome}</p>
                <p className="text-gray-500 text-xs font-medium mt-0.5">{l.blocoNome} • Apto {l.apartamento}</p>
                
                {/* Data no Mobile */}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 font-medium">
                   <Clock size={14} className="text-gray-400" />
                   {formatarData(l.criadoEm)}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2.5">
              <button onClick={() => onAbrirAviso(l)} className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-base font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm">
                <FileText size={18} /> 2ª via aviso
              </button>
              {l.status === "pendente" ? (
                <button onClick={() => onAbrirRetirada(l)} className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-base font-semibold bg-[#057321] text-white border border-[#057321] hover:bg-[#046119] transition shadow-sm">
                  <CheckCircle size={18} className="text-white" /> Registrar retirada
                </button>
              ) : (
                <button onClick={() => onAbrirRetirada(l)} className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-base font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm">
                  <Archive size={18} className="text-[#057321]" /> 2ª via recibo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="min-w-full w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Foto</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Protocolo</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Morador</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Chegada</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50/60 transition">
                <td className="px-6 py-4">
                  <ImagemComFallback src={l.imagemUrl} classNameWrapper="w-12 h-12 rounded-lg" classNameImg="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                </td>
                <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">#{l.protocolo}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900 text-sm">{l.moradorNome}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{l.blocoNome} • Apto {l.apartamento}</div>
                </td>
                {/* Coluna Data/Hora Desktop */}
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                      <Clock size={16} className="text-gray-400" />
                      {formatarData(l.criadoEm)}
                   </div>
                </td>
                <td className="px-6 py-4">
                  {l.status === "retirada" ? (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#057321] text-white border border-[#057321] text-xs font-bold shadow-sm">Retirada</span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white text-[#057321] border border-[#057321] text-xs font-bold shadow-sm">Pendente</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onAbrirAviso(l)} className="h-10 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm whitespace-nowrap">
                      <FileText size={18} /> 2ª via aviso
                    </button>
                    {l.status === "pendente" ? (
                      <button onClick={() => onAbrirRetirada(l)} className="h-10 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold bg-[#057321] text-white border border-[#057321] hover:bg-[#046119] transition shadow-sm whitespace-nowrap">
                        <CheckCircle size={20} className="text-white" /> Registrar retirada
                      </button>
                    ) : (
                      <button onClick={() => onAbrirRetirada(l)} className="h-10 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm whitespace-nowrap">
                        <Archive size={24} /> 2ª via recibo
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!lista.length && (
              <tr>
                <td colSpan={18} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package size={48} className="text-gray-300" />
                    <p className="text-gray-700 font-semibold">Nenhuma correspondência encontrada</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

TabelaInterna.displayName = "TabelaInterna";

// --- MODAIS ATUALIZADOS COM MODELO VISUAL SOLICITADO (SEM EMOJIS QUEBRADOS) ---
const ModalAviso = ({ correspondencia, onClose }: { correspondencia: any, onClose: () => void }) => {
  const { user } = useAuth(); // Para pegar o nome do porteiro logado
  
  const limparTelefone = (t: string) => t ? t.replace(/\D/g, "") : "";
  
  const getLink = () => {
     const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
     return `${baseUrl}/ver/${correspondencia.id}`;
  };

  // 📦 MODELO 1: AVISO DE CORRESPONDÊNCIA (LAYOUT LIMPO)
  const handleWhatsApp = () => {
    const tel = correspondencia.telefoneMorador;
    if (!tel) return alert("Sem telefone cadastrado.");
    
    // Formatação da data de criação (chegada)
    const dataChegada = correspondencia.criadoEm?.toDate 
      ? correspondencia.criadoEm.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : "Data N/A";

    // Array de linhas para garantir a formatação
    const linhasMensagem = [
      `*AVISO DE CORRESPONDÊNCIA*`,
      ``,
      `Olá, *${correspondencia.moradorNome?.split(' ')[0]}*!`,
      `Unidade: *${correspondencia.apartamento}* ${correspondencia.blocoNome ? `(${correspondencia.blocoNome})` : ''}`,
      ``,
      `Você recebeu uma correspondência`,
      `━━━━━━━━━━━━━━━━`,
      `│ *PROTOCOLO:* \`${correspondencia.protocolo}\``, // Negrito e código cinza
      `│ Local: Portaria`,
      `│ Recebido por: ${user?.nome || "Portaria"}`,
      `│ Chegada: ${dataChegada}`,
      `━━━━━━━━━━━━━━━━`,
      ``,
      `Foto do pacote:`,
      `${getLink()}`,
      ``,
      `Aguardamos sua retirada.`
    ];

    const msg = linhasMensagem.join('\n');

    const num = limparTelefone(tel).startsWith('55') ? `+${limparTelefone(tel)}` : `+55${limparTelefone(tel)}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEmail = () => {
    const email = correspondencia.emailMorador;
    if (!email) return alert("Sem e-mail cadastrado.");
    
    const msg = `AVISO DE CORRESPONDÊNCIA

Olá, ${correspondencia.moradorNome}!
Recebemos uma correspondência para o Apto ${correspondencia.apartamento} (${correspondencia.blocoNome || ''}).

PROTOCOLO: ${correspondencia.protocolo}

Acesse o link para ver a foto:
${getLink()}

Por favor, compareça à portaria.`;

    window.open(`mailto:${email}?subject=Chegou Encomenda #${correspondencia.protocolo}&body=${encodeURIComponent(msg)}`);
  };

  const handlePrint = () => {
    if (correspondencia.pdfUrl) window.open(correspondencia.pdfUrl, "_blank");
    else alert("PDF não encontrado.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">2ª via aviso</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X size={20} className="text-gray-600"/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-200">
            <Printer className="text-gray-700" size={24}/>
          </div>
          <h4 className="font-semibold text-xl text-gray-900 text-center">{correspondencia.moradorNome}</h4>
          <p className="text-gray-500 text-sm text-center font-medium">{correspondencia.blocoNome} • Apto {correspondencia.apartamento}</p>
          <div className="space-y-2 pt-2">
            <button onClick={handleWhatsApp} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#128C7E] transition"><MessageCircle size={24} /> WhatsApp</button>
            <button onClick={handleEmail} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"><Mail size={18} /> E-mail</button>
            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition"><Printer size={18} /> Imprimir</button>
            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition"><FileText size={18} /> Ver PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalRecibo = ({ correspondencia, onClose }: { correspondencia: any, onClose: () => void }) => {
  const { user } = useAuth();
  const limparTelefone = (t: string) => t ? t.replace(/\D/g, "") : "";
  
  const getLink = () => {
     const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
     return `${baseUrl}/ver/${correspondencia.id}`;
  };

  // ✅ MODELO 1: CONFIRMAÇÃO DE RETIRADA (LAYOUT LIMPO)
  const handleWhatsApp = () => {
    const tel = correspondencia.telefoneMorador;
    if (!tel) return alert("Sem telefone cadastrado.");
    
    const dataRetirada = correspondencia.retiradoEm?.toDate 
      ? correspondencia.retiradoEm.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : "Data N/A";

    const linhasMensagem = [
      `*RECIBO DE RETIRADA*`,
      ``,
      `Olá, *${correspondencia.moradorNome?.split(' ')[0]}*!`,
      `Confirmamos a retirada da sua correspondência.`,
      ``,
      `━━━━━━━━━━━━━━━━`,
      `│ *PROTOCOLO:* \`${correspondencia.protocolo}\``,
      `│ Unidade: ${correspondencia.apartamento} (${correspondencia.blocoNome || ''})`,
      `│ Retirado em: ${dataRetirada}`,
      `━━━━━━━━━━━━━━━━`,
      ``,
      `Acesse o recibo digital:`,
      `${getLink()}`
    ];

    const msg = linhasMensagem.join('\n');

    const num = limparTelefone(tel).startsWith('55') ? `+${limparTelefone(tel)}` : `+55${limparTelefone(tel)}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEmail = () => {
    const email = correspondencia.emailMorador;
    if (!email) return alert("Sem e-mail cadastrado.");
    
    const msg = `RECIBO DE RETIRADA

Olá, ${correspondencia.moradorNome}!
Confirmamos a retirada da sua correspondência.

PROTOCOLO: ${correspondencia.protocolo}
Unidade: ${correspondencia.blocoNome || ''} - Apto ${correspondencia.apartamento}

Acesse o recibo digital:
${getLink()}`;

    window.open(`mailto:${email}?subject=Recibo de Retirada #${correspondencia.protocolo}&body=${encodeURIComponent(msg)}`);
  };

  const handlePrint = () => {
    if (correspondencia.reciboUrl) window.open(correspondencia.reciboUrl, "_blank");
    else alert("Recibo não encontrado.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">2ª via recibo</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X size={20} className="text-gray-600"/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-200">
            <CheckCircle className="text-gray-700" size={24}/>
          </div>
          <h4 className="font-semibold text-xl text-gray-900 text-center">{correspondencia.moradorNome}</h4>
          <p className="text-gray-500 text-sm text-center font-medium">Retirada em: {correspondencia.retiradoEm?.toDate?.().toLocaleString() || "Data N/A"}</p>
          <div className="space-y-2 pt-2">
            <button onClick={handleWhatsApp} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#128C7E] transition"><MessageCircle size={18} /> WhatsApp</button>
            <button onClick={handleEmail} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"><Mail size={18} /> E-mail</button>
            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition"><Printer size={18} /> Imprimir</button>
            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition"><FileText size={18} /> Ver PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. PÁGINA PRINCIPAL (PORTEIRO) OTIMIZADA
// ============================================================================
function CorrespondenciasPorteiroPage() {
  const { user } = useAuth();
  const { listarCorrespondencias, loading } = useCorrespondencias();

  const [dados, setDados] = useState<Linha[]>([]);
  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  const [modalReciboOpen, setModalReciboOpen] = useState(false);
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);

  // OTIMIZAÇÃO: Cache local para não buscar o mesmo morador 50 vezes
  const usersCache = useMemo(() => new Map<string, any>(), []);

  const carregar = useCallback(async () => {
    const lista = await listarCorrespondencias();
    
    // Mapeamento otimizado para evitar N+1 Queries
    const listaCompleta = await Promise.all(lista.map(async (c: any) => {
      let telefoneMorador = c.moradorTelefone || "";
      let emailMorador = c.moradorEmail || "";
      
      // Só busca no banco se não tiver no objeto E não estiver no cache
      if (c.moradorId && (!telefoneMorador || !emailMorador)) {
        if (usersCache.has(c.moradorId)) {
           const uCached = usersCache.get(c.moradorId);
           telefoneMorador = uCached.whatsapp || uCached.telefone || "";
           emailMorador = uCached.email || "";
        } else {
           try {
             const uSnap = await getDoc(doc(db, "users", c.moradorId));
             if (uSnap.exists()) {
               const uData = uSnap.data();
               usersCache.set(c.moradorId, uData); // Salva no cache
               telefoneMorador = uData.whatsapp || uData.telefone || "";
               emailMorador = uData.email || "";
             }
           } catch (e) {
              console.error("Erro busca morador", e);
           }
        }
      }

      return {
        id: c.id,
        protocolo: c.protocolo || "",
        moradorNome: c.moradorNome || "",
        apartamento: c.apartamento || "",
        blocoNome: c.blocoNome || "",
        condominioId: c.condominioId || "",
        status: c.status || "pendente",
        imagemUrl: c.imagemUrl || "",
        pdfUrl: c.pdfUrl || "",
        reciboUrl: c.reciboUrl || "",
        criadoEm: c.criadoEm || null,
        retiradoEm: c.retiradoEm || null,
        telefoneMorador,
        emailMorador
      } as Linha;
    }));
    
    setDados(listaCompleta);
  }, [listarCorrespondencias, usersCache]);

  useEffect(() => { if (user) carregar(); }, [user, carregar]);

  // Callbacks memoizados para evitar re-renders da tabela
  const handleAbrirAviso = useCallback((linha: Linha) => {
    setItemSelecionado(linha);
    setModalAvisoOpen(true);
  }, []);

  const handleAbrirRetirada = useCallback((linha: Linha) => {
    setItemSelecionado(linha);
    if (linha.status === "retirada") {
      setModalReciboOpen(true);
    } else {
      setModalRegistroOpen(true);
    }
  }, []);

  const handleRetiradaSuccess = useCallback(() => {
    setModalRegistroOpen(false);
    setItemSelecionado(null);
    carregar(); 
  }, [carregar]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <BotaoVoltar url="/dashboard-porteiro" />
          <button
            onClick={carregar}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#057321] text-white text-base font-semibold hover:bg-[#046119] transition w-full sm:w-auto shadow-sm gap-2"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> Atualizar lista
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Olá, Porteiro {user?.nome?.split(' ')[0]}!</h1>
          <p className="text-gray-600 text-sm sm:text-base font-medium mt-1">Gestão de correspondências da portaria</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <TabelaInterna
            dados={dados}
            carregando={loading}
            onAbrirAviso={handleAbrirAviso}
            onAbrirRetirada={handleAbrirRetirada}
          />
        </div>

        {modalAvisoOpen && itemSelecionado && <ModalAviso correspondencia={itemSelecionado} onClose={() => setModalAvisoOpen(false)} />}
        {modalReciboOpen && itemSelecionado && <ModalRecibo correspondencia={itemSelecionado} onClose={() => setModalReciboOpen(false)} />}
        {modalRegistroOpen && itemSelecionado && (
          <ModalRetiradaProfissional
            correspondencia={itemSelecionado}
            onClose={() => { setModalRegistroOpen(false); setItemSelecionado(null); }}
            onSuccess={handleRetiradaSuccess}
          />
        )}
      </main>
    </div>
  );
}

export default withAuth(CorrespondenciasPorteiroPage, ["porteiro", "admin", "adminMaster"]);