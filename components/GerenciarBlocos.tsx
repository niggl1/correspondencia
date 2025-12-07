"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Plus,
  FileDown,
} from "lucide-react";
import { db, auth } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  writeBatch,
} from "firebase/firestore";

// ✅ BOTÃO VOLTAR PADRONIZADO
import BotaoVoltar from "@/components/BotaoVoltar";

// ✅ PDF (sem popup)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Interface para Props (para aceitar ID vindo do Admin)
interface Props {
  condominioId?: string;
}

interface Bloco {
  id: string;
  nome: string;
  condominioId: string;
  ativo: boolean;
  criadoEm: any;
}

export default function GerenciarBlocos({ condominioId: adminCondominioId }: Props) {
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [blocoEditando, setBlocoEditando] = useState<Bloco | null>(null);

  const [modalLoteAberto, setModalLoteAberto] = useState(false);
  const [prefixoLote, setPrefixoLote] = useState("Bloco");
  const [quantidadeLote, setQuantidadeLote] = useState(5);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [userCondominioId, setUserCondominioId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  // Determina qual ID usar (Admin ou Usuário Logado)
  const targetCondominioId = adminCondominioId || userCondominioId;

  // ✅ rota de volta padronizada por role
  const backRoute = userRole === "porteiro" ? "/dashboard-porteiro" : "/dashboard-responsavel";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || "");
            setUserCondominioId(userData.condominioId || "");
          }
        } catch (err) {
          console.error("Erro ao carregar dados do usuário:", err);
        }
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && targetCondominioId) {
      carregarBlocos();
    } else if (authChecked && !targetCondominioId) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, targetCondominioId]);

  const carregarBlocos = async () => {
    if (!targetCondominioId) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, "blocos"),
        where("condominioId", "==", targetCondominioId),
        orderBy("criadoEm", "desc")
      );
      const snapshot = await getDocs(q);
      const blocosData = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Bloco[];
      setBlocos(blocosData);
    } catch (err) {
      console.error("Erro ao carregar blocos:", err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setBlocoEditando(null);
    setNome("");
    setAtivo(true);
    setModalAberto(true);
  };

  const abrirModalEditar = (bloco: Bloco) => {
    setModoEdicao(true);
    setBlocoEditando(bloco);
    setNome(bloco.nome);
    setAtivo(bloco.ativo);
    setModalAberto(true);
  };

  const salvarBloco = async () => {
    if (!nome.trim()) {
      alert("Nome do bloco é obrigatório");
      return;
    }
    try {
      setLoading(true);
      if (modoEdicao && blocoEditando) {
        await updateDoc(doc(db, "blocos", blocoEditando.id), {
          nome,
          ativo,
          atualizadoEm: serverTimestamp(),
        });
        alert("Bloco atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "blocos"), {
          nome,
          condominioId: targetCondominioId,
          ativo,
          criadoEm: serverTimestamp(),
        });
        alert("Bloco cadastrado com sucesso!");
      }
      setModalAberto(false);
      carregarBlocos();
    } catch (err) {
      console.error("Erro ao salvar bloco:", err);
      alert("Erro ao salvar bloco");
    } finally {
      setLoading(false);
    }
  };

  const gerarLoteBlocos = async () => {
    if (quantidadeLote < 1 || quantidadeLote > 50) {
      alert("A quantidade deve ser entre 1 e 50.");
      return;
    }
    if (!prefixoLote.trim()) {
      alert("Defina um prefixo (ex: Bloco, Torre).");
      return;
    }
    try {
      setLoading(true);
      const batch = writeBatch(db);
      for (let i = 1; i <= quantidadeLote; i++) {
        const novoBlocoRef = doc(collection(db, "blocos"));
        batch.set(novoBlocoRef, {
          nome: prefixoLote + " " + i,
          condominioId: targetCondominioId,
          ativo: true,
          criadoEm: serverTimestamp(),
        });
      }
      await batch.commit();
      alert(quantidadeLote + " blocos gerados com sucesso!");
      setModalLoteAberto(false);
      carregarBlocos();
    } catch (error) {
      console.error("Erro ao gerar lote:", error);
      alert("Erro ao gerar blocos em massa.");
    } finally {
      setLoading(false);
    }
  };

  const alternarStatus = async (bloco: Bloco) => {
    try {
      await updateDoc(doc(db, "blocos", bloco.id), {
        ativo: !bloco.ativo,
        atualizadoEm: serverTimestamp(),
      });
      carregarBlocos();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  const excluirBloco = async (bloco: Bloco) => {
    if (!confirm("Tem certeza que deseja excluir o bloco " + bloco.nome + "?")) {
      return;
    }
    try {
      await deleteDoc(doc(db, "blocos", bloco.id));
      alert("Bloco excluído com sucesso!");
      carregarBlocos();
    } catch (err) {
      console.error("Erro ao excluir bloco:", err);
      alert("Erro ao excluir bloco");
    }
  };

  const blocosFiltrados = useMemo(() => {
    return blocos.filter((bloco) => {
      const matchBusca = (bloco.nome || "").toLowerCase().includes(busca.toLowerCase());
      const matchStatus =
        filtroStatus === "todos" ||
        (filtroStatus === "ativo" && bloco.ativo) ||
        (filtroStatus === "inativo" && !bloco.ativo);
      return matchBusca && matchStatus;
    });
  }, [blocos, busca, filtroStatus]);

  // =========================
  // ✅ EXPORTAÇÕES (Excel/CSV e PDF sem popup)
  // =========================
  const formatDateBR = (value: any) => {
    try {
      const date: Date | null =
        value?.toDate?.() instanceof Date
          ? value.toDate()
          : value instanceof Date
          ? value
          : null;
      if (!date) return "";
      return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
    } catch {
      return "";
    }
  };

  const getExportRows = () =>
    blocosFiltrados.map((b) => ({
      Nome: b.nome ?? "",
      Status: b.ativo ? "Ativo" : "Inativo",
      "Criado em": formatDateBR(b.criadoEm),
      ID: b.id,
    }));

  // CSV (abre no Excel) — sem dependências externas
  const exportarExcelCSV = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      alert("Não há blocos para exportar.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const escapeCSV = (val: any) => {
      const s = String(val ?? "");
      const escaped = s.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csv = [
      headers.map(escapeCSV).join(";"),
      ...rows.map((r) => headers.map((h) => escapeCSV((r as any)[h])).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `blocos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  };

  // ✅ PDF: gera e baixa direto (sem window.open -> sem bloqueio de popup)
  const exportarPDF = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      alert("Não há blocos para exportar.");
      return;
    }

    const docPdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    const title = "Relação de Blocos";
    const sub = `Gerado em: ${new Date().toLocaleString("pt-BR")}`;

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(14);
    docPdf.text(title, 40, 40);

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(10);
    docPdf.text(sub, 40, 58);

    const head = [["Nome", "Status", "Criado em", "ID"]];
    const body = rows.map((r) => [
      (r as any).Nome,
      (r as any).Status,
      (r as any)["Criado em"],
      (r as any).ID,
    ]);

    autoTable(docPdf, {
      head,
      body,
      startY: 75,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 160 },
        1: { cellWidth: 70 },
        2: { cellWidth: 90 },
        3: { cellWidth: 160 },
      },
      margin: { left: 40, right: 40 },
    });

    docPdf.save(`blocos_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // =========================

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando blocos...</p>
        </div>
      </div>
    );
  }

  if (!targetCondominioId) {
    return <div className="p-8 text-center text-red-500">Nenhum condomínio selecionado.</div>;
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-4 sm:p-6 pt-24 sm:pt-28 rounded-xl">
      <div className="w-fit">
        <BotaoVoltar url={backRoute} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Blocos</h1>
          <p className="text-gray-600 text-sm">Cadastre os blocos e torres do condomínio</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button
            onClick={exportarPDF}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition shadow-sm"
            title="Baixar PDF (sem pop-up)"
          >
            <FileDown size={20} />
            PDF
          </button>

          <button
            onClick={exportarExcelCSV}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition shadow-sm"
            title="Baixar planilha (CSV abre no Excel)"
          >
            <FileDown size={20} />
            Excel
          </button>

          <button
            onClick={() => setModalLoteAberto(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-[#057321] text-[#057321] rounded-lg hover:bg-green-50 font-medium transition shadow-sm"
          >
            <Layers size={20} />
            Gerar em Lote
          </button>

          <button
            onClick={abrirModalNovo}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#057321] text-white rounded-lg hover:bg-[#046019] font-bold shadow-sm transition"
          >
            <Plus size={20} />
            Novo Bloco
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Bloco</label>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
            placeholder="Nome do bloco..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-4">
        {blocosFiltrados.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl text-gray-500">Nenhum bloco encontrado</div>
        ) : (
          blocosFiltrados.map((bloco) => (
            <div
              key={bloco.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-lg">{bloco.nome}</h3>
                <span
                  className={`px-2 py-1 text-xs font-bold rounded-full ${
                    bloco.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {bloco.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => abrirModalEditar(bloco)}
                  className="flex items-center justify-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition"
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  onClick={() => alternarStatus(bloco)}
                  className={`flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition ${
                    bloco.ativo
                      ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {bloco.ativo ? <XCircle size={16} /> : <CheckCircle size={16} />}
                  {bloco.ativo ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => excluirBloco(bloco)}
                  className="col-span-2 flex items-center justify-center gap-2 p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition mt-1"
                >
                  <Trash2 size={16} /> Excluir Bloco
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blocosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Nenhum bloco encontrado
                  </td>
                </tr>
              ) : (
                blocosFiltrados.map((bloco) => (
                  <tr key={bloco.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{bloco.nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${
                          bloco.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {bloco.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => abrirModalEditar(bloco)}
                        className="text-blue-600 hover:text-blue-900 font-bold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alternarStatus(bloco)}
                        className="text-yellow-600 hover:text-yellow-900 font-bold"
                      >
                        {bloco.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluirBloco(bloco)}
                        className="text-red-600 hover:text-red-900 font-bold"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modoEdicao ? "Editar Bloco" : "Novo Bloco"}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Bloco *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                  placeholder="Ex: Bloco A, Torre 1..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 text-[#057321] rounded focus:ring-2 focus:ring-[#057321]"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Bloco ativo
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarBloco}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046019] disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lote */}
      {modalLoteAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Gerar Blocos em Lote</h3>
              <button onClick={() => setModalLoteAberto(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
                Exemplo: Prefixo "Torre" e Quantidade 3 gerará: <br />
                <strong>Torre 1, Torre 2, Torre 3</strong>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefixo (Nome Base)</label>
                <input
                  type="text"
                  value={prefixoLote}
                  onChange={(e) => setPrefixoLote(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                  placeholder="Ex: Bloco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade (Máx 50)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quantidadeLote}
                  onChange={(e) => setQuantidadeLote(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalLoteAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={gerarLoteBlocos}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046019] disabled:opacity-50"
                >
                  {loading ? "Gerando..." : "Gerar Blocos"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
