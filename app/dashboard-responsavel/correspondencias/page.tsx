"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MessageCircle,
  X,
  FileText,
  CheckCircle,
  Archive,
  Search,
  Filter,
  Package,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCorrespondencias } from "@/hooks/useCorrespondencias";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, Timestamp, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import withAuth from "@/components/withAuth";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";

// Importações para Exportação
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ============================================================================
// 1. DEFINIÇÕES DE TIPOS
// ============================================================================
interface Linha {
  id: string;
  protocolo: string;
  moradorNome?: string;
  apartamento?: string;
  blocoNome?: string;
  blocoId?: string;
  unidadeId?: string;
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

interface Bloco {
  id: string;
  nome: string;
}

interface Unidade {
  id: string;
  identificacao: string;
  blocoId: string;
}

// ============================================================================
// 2. COMPONENTES INTERNOS
// ============================================================================

// --- TABELA INTERNA COM FILTROS AVANÇADOS ---
const TabelaInterna = ({
  dados,
  blocos,
  unidades,
  carregando,
  onAbrirAviso,
  onAbrirRetirada,
}: {
  dados: Linha[];
  blocos: Bloco[];
  unidades: Unidade[];
  carregando: boolean;
  onAbrirAviso: (l: Linha) => void;
  onAbrirRetirada: (l: Linha) => void;
}) => {
  // Estados dos Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroBloco, setFiltroBloco] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todos");

  // ✅ Não muta array original + ✅ protege identificacao undefined
  function unitsSort(list: Unidade[]) {
    return [...list].sort((a, b) => {
      const ai = (a?.identificacao ?? "").toString();
      const bi = (b?.identificacao ?? "").toString();
      return ai.localeCompare(bi, undefined, { numeric: true });
    });
  }

  // Filtro de Unidades baseado no Bloco selecionado
  const unidadesFiltradasOpcoes = useMemo(() => {
    const base =
      filtroBloco === "todos"
        ? unidades
        : unidades.filter((u) => (u?.blocoId ?? "") === filtroBloco);

    return unitsSort(base);
  }, [unidades, filtroBloco]);

  // Lógica de Filtragem dos Dados
  const lista = useMemo(() => {
    return dados.filter((d) => {
      // 1. Filtro de Texto (Busca)
      if (busca) {
        const termo = busca.toLowerCase();
        const alvo = `${d.protocolo} ${d.moradorNome || ""} ${d.apartamento || ""} ${
          d.blocoNome || ""
        }`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }

      // 2. Filtro de Status
      if (filtroStatus && d.status !== filtroStatus) return false;

      // 3. Filtro de Bloco
      if (
        filtroBloco !== "todos" &&
        d.blocoId !== filtroBloco &&
        d.blocoNome !== blocos.find((b) => b.id === filtroBloco)?.nome
      ) {
        if (d.blocoId && d.blocoId !== filtroBloco) return false;
      }

      // 4. Filtro de Unidade
      if (filtroUnidade !== "todos") {
        const unidadeObj = unidades.find((u) => u.id === filtroUnidade);

        if (d.unidadeId && d.unidadeId !== filtroUnidade) return false;
        if (!d.unidadeId && unidadeObj && d.apartamento !== unidadeObj.identificacao) return false;
      }

      // 5. Filtro de Data
      if (dataInicio || dataFim) {
        if (!d.criadoEm) return false;
        const dataItem = d.criadoEm.toDate();
        dataItem.setHours(0, 0, 0, 0);

        if (dataInicio) {
          const dtInicio = new Date(dataInicio + "T00:00:00");
          if (dataItem < dtInicio) return false;
        }
        if (dataFim) {
          const dtFim = new Date(dataFim + "T00:00:00");
          if (dataItem > dtFim) return false;
        }
      }

      return true;
    });
  }, [dados, filtroStatus, busca, filtroBloco, filtroUnidade, dataInicio, dataFim, blocos, unidades]);

  // Função auxiliar de formatação de data
  const formatarData = (timestamp?: Timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp as any);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- EXPORTAÇÃO PDF ---
  const gerarPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Relatório de Correspondências", 14, 10);

    docPdf.setFontSize(10);
    const statusTxt =
      filtroStatus === "pendente" ? "Pendentes" : filtroStatus === "retirada" ? "Retiradas" : "Todas";
    docPdf.text(`Status: ${statusTxt} | Gerado em: ${new Date().toLocaleDateString()}`, 14, 16);

    const dadosPDF = lista.map((l) => [
      formatarData(l.criadoEm),
      l.protocolo,
      l.moradorNome || "-",
      `${l.blocoNome || ""} - ${l.apartamento || ""}`,
      l.status === "pendente" ? "Pendente" : "Retirada",
    ]);

    autoTable(docPdf, {
      head: [["Data/Hora", "Protocolo", "Morador", "Unidade", "Status"]],
      body: dadosPDF,
      startY: 20,
    });

    docPdf.save("correspondencias.pdf");
  };

  // --- EXPORTAÇÃO EXCEL ---
  const gerarExcel = () => {
    const dadosExcel = lista.map((l) => ({
      "Data Chegada": formatarData(l.criadoEm),
      Protocolo: l.protocolo,
      Morador: l.moradorNome ?? "",
      Bloco: l.blocoNome ?? "",
      Unidade: l.apartamento ?? "",
      Status: l.status === "pendente" ? "Pendente" : "Retirada",
      "Retirado Em": formatarData(l.retiradoEm),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Correspondencias");
    XLSX.writeFile(workbook, "correspondencias.xlsx");
  };

  return (
    <div className="space-y-5">
      {/* --- ÁREA DE FILTROS E BOTÕES --- */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Linha 1: Busca e Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              placeholder="Buscar por protocolo, morador..."
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#057321]/30 focus:border-[#057321]/50 outline-none bg-white text-sm"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="relative">
            <Filter
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <select
              className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-[#057321]/30"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos os Status</option>
              <option value="pendente">Avisos Enviados (Pendentes)</option>
              <option value="retirada">Avisos Retirados (Histórico)</option>
            </select>
          </div>
        </div>

        {/* Linha 2: Datas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Data Inicial</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Data Final</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          {/* Botões de Exportação */}
          <div className="sm:col-span-2 flex gap-2">
            <button
              onClick={gerarPDF}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold shadow-sm transition-colors text-sm"
            >
              <FileText size={18} /> PDF
            </button>
            <button
              onClick={gerarExcel}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold shadow-sm transition-colors text-sm"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
          </div>
        </div>

        {/* Linha 3: Bloco e Unidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Filtrar por Bloco</label>
            <select
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm"
              value={filtroBloco}
              onChange={(e) => {
                setFiltroBloco(e.target.value);
                setFiltroUnidade("todos");
              }}
            >
              <option value="todos">Todos os Blocos</option>
              {blocos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Filtrar por Unidade</label>
            <select
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm"
              value={filtroUnidade}
              onChange={(e) => setFiltroUnidade(e.target.value)}
            >
              <option value="todos">Todas as Unidades</option>
              {unidadesFiltradasOpcoes.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.identificacao}
                </option>
              ))}
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
                  <span className="font-bold text-gray-900 text-base truncate">#{l.protocolo}</span>
                </div>

                <p className="text-gray-900 font-semibold text-sm truncate mt-1">{l.moradorNome}</p>

                <p className="text-gray-500 text-xs font-medium mt-0.5">
                  {l.blocoNome} • Apto {l.apartamento}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onAbrirAviso(l)}
                className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm"
              >
                <FileText size={16} /> 2ª via aviso
              </button>

              {l.status === "pendente" ? (
                <button
                  onClick={() => onAbrirRetirada(l)}
                  className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-[#057321] text-white border border-[#057321] hover:bg-[#046119] transition shadow-sm"
                >
                  <CheckCircle size={16} className="text-white" />
                  Registrar retirada
                </button>
              ) : (
                <button
                  onClick={() => onAbrirRetirada(l)}
                  className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm"
                >
                  <Archive size={16} className="text-[#057321]" />
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
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Foto
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Data / Hora
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Protocolo
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Morador
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ações
              </th>
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
                      alt=""
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                      <Package className="text-gray-400" size={18} />
                    </div>
                  )}
                </td>

                <td className="px-6 py-4 text-gray-600 font-medium text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {formatarData(l.criadoEm)}
                  </div>
                </td>

                <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">#{l.protocolo}</td>

                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900 text-sm">{l.moradorNome}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">
                    {l.blocoNome} • Apto {l.apartamento}
                  </div>
                </td>

                <td className="px-6 py-4">
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
                    <button
                      onClick={() => onAbrirAviso(l)}
                      className="h-10 min-w-[170px] inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-semibold border border-[#057321] text-[#057321] bg-white hover:bg-[#057321]/5 transition shadow-sm whitespace-nowrap"
                      title="Imprimir Aviso de Chegada"
                    >
                      <FileText size={16} className="text-[#057321]" />
                      2ª via aviso
                    </button>

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

      {carregando && (
        <div className="flex items-center justify-center py-6 text-sm text-gray-500 font-medium">
          Carregando...
        </div>
      )}
    </div>
  );
};

// --- MODAIS (abreviados como no seu exemplo) ---
const ModalAviso = ({ correspondencia, onClose }: { correspondencia: any; onClose: () => void }) => {
  const limparTelefone = (t: string) => (t ? t.replace(/\D/g, "") : "");
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const linkCurto = `${baseUrl}/ver/${correspondencia.id}`;

  const handleWhatsApp = () => {
    const tel = correspondencia.telefoneMorador || correspondencia.moradorTelefone;
    if (!tel) return alert("Sem telefone cadastrado.");
    const msg = `*AVISO DE CORRESPONDÊNCIA*\n\nOlá, *${correspondencia.moradorNome}*!\nProtocolo: ${correspondencia.protocolo}\nLink: ${linkCurto}`;
    const limpo = limparTelefone(tel);
    const num = limpo.startsWith("55") ? `+${limpo}` : `+55${limpo}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4 text-center">Aviso de Chegada</h3>
        <p className="text-center mb-6">
          {correspondencia.moradorNome} - {correspondencia.blocoNome}
        </p>
        <button
          onClick={handleWhatsApp}
          className="w-full bg-green-500 text-white py-2 rounded-lg mb-2 flex items-center justify-center gap-2"
        >
          <MessageCircle size={18} /> Enviar WhatsApp
        </button>
        {/* Outros botões conforme original */}
      </div>
    </div>
  );
};

const ModalRecibo = ({ correspondencia, onClose }: { correspondencia: any; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X />
        </button>
        <h3 className="font-bold text-lg mb-4 text-center">Recibo de Retirada</h3>
        <p className="text-center text-green-600 font-bold mb-6">Entregue</p>
        {/* Botões conforme original */}
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
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);

  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  const [modalReciboOpen, setModalReciboOpen] = useState(false);
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<any>(null);

  const carregar = async () => {
    const lista = await listarCorrespondencias();

    const listaCompleta = await Promise.all(
      lista.map(async (c: any) => {
        let telefoneMorador = c.moradorTelefone || "";
        let emailMorador = c.moradorEmail || "";

        if (c.moradorId && (!telefoneMorador || !emailMorador)) {
          try {
            const uSnap = await getDoc(doc(db, "users", c.moradorId));
            if (uSnap.exists()) {
              const uData: any = uSnap.data();
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
          blocoId: c.blocoId || "",
          unidadeId: c.unidadeId || "",
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
          moradorEmail: emailMorador,
        } as Linha;
      })
    );

    setDados(listaCompleta);
  };

  const carregarFiltrosAuxiliares = async () => {
    if (!user?.condominioId) return;

    try {
      // Blocos
      const qBlocos = query(
        collection(db, "blocos"),
        where("condominioId", "==", user.condominioId),
        orderBy("nome", "asc")
      );
      const snapBlocos = await getDocs(qBlocos);
      const listaBlocos = snapBlocos.docs.map((d) => {
        const data: any = d.data();
        return { id: d.id, nome: String(data.nome ?? "") } as Bloco;
      });
      setBlocos(listaBlocos);

      // Unidades (✅ sanitiza identificacao e blocoId)
      const qUnidades = query(collection(db, "unidades"), where("condominioId", "==", user.condominioId));
      const snapUnidades = await getDocs(qUnidades);
      const listaUnidades = snapUnidades.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          identificacao: String(data.identificacao ?? ""),
          blocoId: String(data.blocoId ?? ""),
        } as Unidade;
      });
      setUnidades(listaUnidades);
    } catch (err) {
      console.error("Erro ao carregar filtros:", err);
    }
  };

  useEffect(() => {
    if (user) {
      carregar();
      carregarFiltrosAuxiliares();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const backRoute = "/dashboard-responsavel";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
            Olá, {user?.nome?.split(" ")[0]}!
          </h1>
          <p className="text-gray-600 text-sm sm:text-base font-medium mt-1">
            Gestão de correspondências do condomínio
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <TabelaInterna
            dados={dados}
            blocos={blocos}
            unidades={unidades}
            carregando={loading}
            onAbrirAviso={handleAbrirAviso}
            onAbrirRetirada={handleAbrirRetirada}
          />
        </div>

        {modalAvisoOpen && itemSelecionado && (
          <ModalAviso correspondencia={itemSelecionado} onClose={() => setModalAvisoOpen(false)} />
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
            onClose={() => {
              setModalRegistroOpen(false);
              setItemSelecionado(null);
            }}
            onSuccess={handleRetiradaSuccess}
          />
        )}
      </main>
    </div>
  );
}

export default withAuth(CorrespondenciasResponsavelPage, ["responsavel"]);
