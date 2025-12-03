"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Printer, MessageCircle, Mail, X, FileText, CheckCircle,
  Archive, Search, Filter, Package, Calendar
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
// 1. DEFINIÇÕES DE TIPOS (LOCAIS)
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
  compartilhadoVia?: string[];
  telefoneMorador?: string;
  emailMorador?: string;
  moradorTelefone?: string;
  moradorEmail?: string;
  moradorId?: string;
}

// ============================================================================
// 2. COMPONENTES INTERNOS
// ============================================================================

// --- TABELA INTERNA ---
const TabelaInterna = ({
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

  // Função auxiliar de formatação de data
  const formatarData = (timestamp?: Timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp as any);
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              placeholder="Buscar por protocolo, morador, apartamento..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#057321]/30 focus:border-[#057321]/50 outline-none bg-white text-sm font-medium text-gray-800 placeholder:text-gray-400"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="relative md:w-56">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
          <div
            key={l.id}
            className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex gap-3">
              <div className="shrink-0">
                {l.imagemUrl ? (
                  <img
                    src={l.imagemUrl}
                    alt=""
                    className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                    <Package size={22} className="text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                   <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                      <Calendar size={10} /> {formatarData(l.criadoEm)}
                   </span>
                   
                   {/* STATUS seguindo suas regras */}
                   {l.status === "retirada" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#057321] text-white border border-[#057321] shadow-sm shrink-0">
                      Retirada
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#057321] border border-[#057321] shadow-sm shrink-0">
                      Pendente
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-base truncate">
                    #{l.protocolo}
                  </span>
                </div>

                <p className="text-gray-900 font-semibold text-sm truncate mt-1">
                  {l.moradorNome}
                </p>

                <p className="text-gray-500 text-xs font-medium mt-0.5">
                  {l.blocoNome} • Apto {l.apartamento}
                </p>
              </div>
            </div>

            {/* Botões Mobile iguais */}
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2.5">
              {/* 2ª via aviso - branco com contorno verde */}
              <button
                onClick={() => onAbrirAviso(l)}
                className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm"
              >
                <FileText size={18} /> 2ª via aviso
              </button>

              {/* registrar retirada OU 2ª via recibo */}
              {l.status === "pendente" ? (
                <button
                  onClick={() => onAbrirRetirada(l)}
                  className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-[#057321] text-white border border-[#057321] hover:bg-[#046119] transition shadow-sm"
                >
                  <CheckCircle size={18} className="text-white" />
                  Registrar retirada
                </button>
              ) : (
                <button
                  onClick={() => onAbrirRetirada(l)}
                  className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm"
                >
                  <Archive size={18} className="text-[#057321]" />
                  2ª via recibo
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data / Hora</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Protocolo</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Morador</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {lista.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50/60 transition">
                <td className="px-6 py-4">
                  {l.imagemUrl ? (
                    <img
                      src={l.imagemUrl}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                      <Package className="text-gray-400" size={20} />
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 text-gray-600 font-medium text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {formatarData(l.criadoEm)}
                  </div>
                </td>

                <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                  #{l.protocolo}
                </td>

                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900 text-sm">{l.moradorNome}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    {l.blocoNome} • Apto {l.apartamento}
                  </div>
                </td>

                <td className="px-6 py-4">
                  {/* STATUS estilo botão conforme regras */}
                  {l.status === "retirada" ? (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#057321] text-white border border-[#057321] text-xs font-bold shadow-sm">
                      Retirada
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-white text-[#057321] border border-[#057321] text-xs font-bold shadow-sm">
                      Pendente
                    </span>
                  )}
                </td>

                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    {/* 2ª via aviso */}
                    <button
                      onClick={() => onAbrirAviso(l)}
                      className="h-10 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm whitespace-nowrap"
                      title="Imprimir Aviso de Chegada"
                    >
                      <FileText size={16} className="text-[#057321]" />
                      2ª via aviso
                    </button>

                    {/* registrar retirada / 2ª via recibo */}
                    {l.status === "pendente" ? (
                      <button
                        onClick={() => onAbrirRetirada(l)}
                        className="h-10 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-semibold bg-[#057321] text-white border border-[#057321] hover:bg-[#046119] transition shadow-sm whitespace-nowrap"
                      >
                        <CheckCircle size={16} className="text-white" />
                        Registrar retirada
                      </button>
                    ) : (
                      <button
                        onClick={() => onAbrirRetirada(l)}
                        className="h-10 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm whitespace-nowrap"
                      >
                        <Archive size={16} className="text-[#057321]" />
                        2ª via recibo
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {!lista.length && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package size={40} className="text-gray-300" />
                    <p className="text-gray-700 font-semibold">Nenhuma correspondência encontrada</p>
                    <p className="text-gray-400 text-sm">Ajuste os filtros para refinar a busca.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- MODAL 1: AVISO (Chegada) ---
const ModalAviso = ({ correspondencia, onClose }: { correspondencia: any, onClose: () => void }) => {
  const limparTelefone = (t: string) => t ? t.replace(/\D/g, "") : "";

  // ✅ URL BASE PARA LINK CURTO
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const linkCurto = `${baseUrl}/ver/${correspondencia.id}`;

  const handleWhatsApp = () => {
    const tel = correspondencia.telefoneMorador || correspondencia.moradorTelefone;
    if (!tel) return alert("Sem telefone cadastrado.");
    
    // Data de hoje ou data de criação se existir
    let dataDisplay = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    try {
        if (correspondencia.criadoEm?.toDate) {
            dataDisplay = correspondencia.criadoEm.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        }
    } catch(e){}

    // MENSAGEM PADRONIZADA (CAIXA E NEGRITO)
    const msg = `*AVISO DE CORRESPONDÊNCIA*

Olá, *${correspondencia.moradorNome}*!
Unidade: ${correspondencia.apartamento} (${correspondencia.blocoNome})

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ *PROTOCOLO: ${correspondencia.protocolo}*
│ Local: Portaria
│ Chegada: ${dataDisplay}
━━━━━━━━━━━━━━━━

*FOTO E QR CODE:*
${linkCurto}

Aguardamos a sua retirada`;
    
    const num = limparTelefone(tel).startsWith('55') ? `+${limparTelefone(tel)}` : `+55${limparTelefone(tel)}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEmail = () => {
    const email = correspondencia.emailMorador || correspondencia.moradorEmail;
    if (!email) return alert("Sem e-mail cadastrado.");
    
    const msg = `Olá ${correspondencia.moradorNome}!\nCorrespondência #${correspondencia.protocolo} disponível.\nLink: ${linkCurto}`;
    
    window.open(`mailto:${email}?subject=Aviso Correspondência #${correspondencia.protocolo}&body=${encodeURIComponent(msg)}`);
  };

  const handlePrint = () => {
    if (correspondencia.pdfUrl) window.open(correspondencia.pdfUrl, "_blank");
    else alert("PDF não encontrado.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">2ª via aviso</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X size={20} className="text-gray-600"/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-200">
            <Printer className="text-gray-700" size={26}/>
          </div>

          <h4 className="font-semibold text-xl text-gray-900 text-center">
            {correspondencia.moradorNome}
          </h4>
          <p className="text-gray-500 text-sm text-center font-medium">
            {correspondencia.blocoNome} • Apto {correspondencia.apartamento}
          </p>

          <div className="space-y-2 pt-2">
            <button onClick={handleWhatsApp} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#128C7E] transition">
              <MessageCircle size={18} /> WhatsApp
            </button>

            <button onClick={handleEmail} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
              <Mail size={18} /> E-mail
            </button>

            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition">
              <Printer size={18} /> Imprimir
            </button>

            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition">
              <FileText size={18} /> Ver PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MODAL 2: RECIBO (Retirada) ---
const ModalRecibo = ({ correspondencia, onClose }: { correspondencia: any, onClose: () => void }) => {
  const limparTelefone = (t: string) => t ? t.replace(/\D/g, "") : "";

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const linkCurto = `${baseUrl}/ver/${correspondencia.id}`;

  const handleWhatsApp = () => {
    const tel = correspondencia.telefoneMorador || correspondencia.moradorTelefone;
    if (!tel) return alert("Sem telefone cadastrado.");
    
    // Tenta pegar a data real de retirada
    let dataRetirada = "Data N/A";
    try {
        if (correspondencia.retiradoEm?.toDate) {
            dataRetirada = correspondencia.retiradoEm.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        } else if (correspondencia.retiradoEm) {
             // Caso venha como string ou outro formato
             dataRetirada = new Date(correspondencia.retiradoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        }
    } catch (e) {}
    
    // MENSAGEM PADRONIZADA (CAIXA E NEGRITO)
    const msg = `*AVISO DE RETIRADA*

Olá, *${correspondencia.moradorNome}*!
Unidade: ${correspondencia.apartamento} (${correspondencia.blocoNome})

Sua correspondência foi entregue
━━━━━━━━━━━━━━━━
│ *PROTOCOLO: ${correspondencia.protocolo}*
│ Status: ✅ ENTREGUE
│ Data: ${dataRetirada}
━━━━━━━━━━━━━━━━

Se você não reconhece esta retirada, entre em contato com a portaria imediatamente.\n\nAcesse o recibo digital: ${linkCurto}`;
    
    const num = limparTelefone(tel).startsWith('55') ? `+${limparTelefone(tel)}` : `+55${limparTelefone(tel)}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleEmail = () => {
    const email = correspondencia.emailMorador || correspondencia.moradorEmail;
    if (!email) return alert("Sem e-mail cadastrado.");
    
    const msg = `Olá ${correspondencia.moradorNome}!\nSegue o recibo de retirada da correspondência #${correspondencia.protocolo}.\nLink: ${linkCurto}`;
    
    window.open(`mailto:${email}?subject=Recibo de Retirada #${correspondencia.protocolo}&body=${encodeURIComponent(msg)}`);
  };

  const handlePrint = () => {
    if (correspondencia.reciboUrl) window.open(correspondencia.reciboUrl, "_blank");
    else alert("Recibo não encontrado.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-900">2ª via recibo</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X size={20} className="text-gray-600"/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-200">
            <CheckCircle className="text-gray-700" size={26}/>
          </div>

          <h4 className="font-semibold text-xl text-gray-900 text-center">
            {correspondencia.moradorNome}
          </h4>
          <p className="text-gray-500 text-sm text-center font-medium">
            Retirada em: {correspondencia.retiradoEm?.toDate?.().toLocaleString() || "Data N/A"}
          </p>

          <div className="space-y-2 pt-2">
            <button onClick={handleWhatsApp} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#128C7E] transition">
              <MessageCircle size={18} /> WhatsApp
            </button>

            <button onClick={handleEmail} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
              <Mail size={18} /> E-mail
            </button>

            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition">
              <Printer size={18} /> Imprimir
            </button>

            <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition">
              <FileText size={18} /> Ver PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. PÁGINA PRINCIPAL
// ============================================================================
function CorrespondenciasResponsavelPage() {
  const { user } = useAuth();
  const { listarCorrespondencias, loading } = useCorrespondencias();

  const [dados, setDados] = useState<Linha[]>([]);

  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  const [modalReciboOpen, setModalReciboOpen] = useState(false);
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);

  const carregar = async () => {
    const lista = await listarCorrespondencias();
    const listaCompleta = await Promise.all(lista.map(async (c: any) => {
      let telefoneMorador = c.moradorTelefone || "";
      let emailMorador = c.moradorEmail || "";
      if (c.moradorId && (!telefoneMorador || !emailMorador)) {
        try {
          const uSnap = await getDoc(doc(db, "users", c.moradorId));
          if (uSnap.exists()) {
            const uData = uSnap.data();
            telefoneMorador = uData.whatsapp || uData.telefone || "";
            emailMorador = uData.email || "";
          }
        } catch (e) {}
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
        compartilhadoVia: c.compartilhadoVia || [],
        telefoneMorador,
        emailMorador,
        moradorTelefone: telefoneMorador,
        moradorEmail: emailMorador
      } as Linha;
    }));
    setDados(listaCompleta);
  };

  useEffect(() => { if (user) carregar(); }, [user]);

  const handleAbrirAviso = (linha: Linha) => {
    setItemSelecionado(linha);
    setModalAvisoOpen(true);
  };

  const handleAbrirRetirada = (linha: Linha) => {
    setItemSelecionado(linha);
    if (linha.status === "retirada") {
      setModalReciboOpen(true);
    } else {
      setModalRegistroOpen(true);
    }
  };

  const handleRetiradaSuccess = () => {
    setModalRegistroOpen(false);
    setItemSelecionado(null);
    carregar();
  };

  // ✅ rota de volta fixa para esse perfil
  const backRoute = "/dashboard-responsavel";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-12 space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* ✅ BOTÃO VOLTAR PADRONIZADO */}
          <BotaoVoltar url={backRoute} />

          <button
            onClick={carregar}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#057321] text-white text-sm font-semibold hover:bg-[#046119] transition w-full sm:w-auto shadow-sm"
          >
            Atualizar lista
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Olá, {user?.nome?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 text-sm sm:text-base font-medium mt-1">
            Gestão de correspondências do condomínio
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <TabelaInterna
            dados={dados}
            carregando={loading}
            onAbrirAviso={handleAbrirAviso}
            onAbrirRetirada={handleAbrirRetirada}
          />
        </div>

        {modalAvisoOpen && itemSelecionado && (
          <ModalAviso
            correspondencia={itemSelecionado}
            onClose={() => setModalAvisoOpen(false)}
          />
        )}

        {modalReciboOpen && itemSelecionado && (
          <ModalRecibo
            correspondencia={itemSelecionado}
            onClose={() => setModalReciboOpen(false)}
          />
        )}

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

export default withAuth(CorrespondenciasResponsavelPage, ["responsavel"]);