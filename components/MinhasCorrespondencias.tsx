"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

interface Correspondencia {
  id: string;
  tipo: string;
  remetente: string;
  destinatario: string;
  unidadeNome: string;
  dataRecebimento: any;
  dataRetirada?: any;
  status: string;
  observacoes?: string;
  fotoUrl?: string;
}

const TIPOS_CORRESPONDENCIA = [
  { value: "carta", label: "📧 Carta", icon: "📧", color: "blue" },
  { value: "encomenda", label: "📦 Encomenda", icon: "📦", color: "orange" },
  { value: "notificacao", label: "📄 Notificação", icon: "📄", color: "red" },
  { value: "outros", label: "📮 Outros", icon: "📮", color: "gray" },
];

const STATUS_CORRESPONDENCIA = [
  { value: "pendente", label: "Pendente", color: "yellow" },
  { value: "retirado", label: "Retirado", color: "green" },
  { value: "devolvido", label: "Devolvido", color: "red" },
];

export default function MinhasCorrespondencias() {
  const [correspondencias, setCorrespondencias] = useState<Correspondencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState("");

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Modal de detalhes
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<Correspondencia | null>(null);

  // Carregar dados do usuário autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      }
      setAuthChecked(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && userId) {
      carregarCorrespondencias();
    }
  }, [authChecked, userId]);

  const carregarCorrespondencias = async () => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "correspondencias"),
        where("moradorId", "==", userId),
        orderBy("dataRecebimento", "desc")
      );

      const snapshot = await getDocs(q);
      const correspondenciasData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Correspondencia[];

      setCorrespondencias(correspondenciasData);
    } catch (err) {
      console.error("❌ Erro ao carregar correspondências:", err);
      alert("Erro ao carregar correspondências. Verifique se os índices do Firebase estão criados.");
    } finally {
      setLoading(false);
    }
  };

  const getIconeTipo = (tipo: string) => {
    const tipoObj = TIPOS_CORRESPONDENCIA.find((t) => t.value === tipo);
    return tipoObj ? tipoObj.icon : "📮";
  };

  const getCorTipo = (tipo: string) => {
    const tipoObj = TIPOS_CORRESPONDENCIA.find((t) => t.value === tipo);
    return tipoObj ? tipoObj.color : "gray";
  };

  const getLabelTipo = (tipo: string) => {
    const tipoObj = TIPOS_CORRESPONDENCIA.find((t) => t.value === tipo);
    return tipoObj ? tipoObj.label.replace(/^.+ /, "") : tipo;
  };

  const getCorStatus = (status: string) => {
    const statusObj = STATUS_CORRESPONDENCIA.find((s) => s.value === status);
    return statusObj ? statusObj.color : "gray";
  };

  const getLabelStatus = (status: string) => {
    const statusObj = STATUS_CORRESPONDENCIA.find((s) => s.value === status);
    return statusObj ? statusObj.label : status;
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp) return "-";
    const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return data.toLocaleDateString("pt-BR");
  };

  const abrirDetalhes = (correspondencia: Correspondencia) => {
    setCorrespondenciaSelecionada(correspondencia);
    setModalDetalhes(true);
  };

  const correspondenciasFiltradas = correspondencias.filter((corresp) => {
    const matchTipo = filtroTipo === "todos" || corresp.tipo === filtroTipo;
    const matchStatus = filtroStatus === "todos" || corresp.status === filtroStatus;

    let matchData = true;
    if (dataInicio || dataFim) {
      const dataRecebimento = corresp.dataRecebimento?.toDate ? corresp.dataRecebimento.toDate() : new Date(corresp.dataRecebimento);
      if (dataInicio) {
        const inicio = new Date(dataInicio);
        matchData = matchData && dataRecebimento >= inicio;
      }
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59);
        matchData = matchData && dataRecebimento <= fim;
      }
    }

    return matchTipo && matchStatus && matchData;
  });

  const contarPorStatus = (status: string) => {
    return correspondencias.filter((c) => c.status === status).length;
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minhas Correspondências</h1>
            <p className="text-gray-600">Acompanhe suas cartas e encomendas</p>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-800 font-medium">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-900">{contarPorStatus("pendente")}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-800 font-medium">Retirados</p>
              <p className="text-2xl font-bold text-green-900">{contarPorStatus("retirado")}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-800 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900">{correspondencias.length}</p>
            </div>
            <div className="text-3xl">📬</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              {TIPOS_CORRESPONDENCIA.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              {STATUS_CORRESPONDENCIA.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de Correspondências */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {correspondenciasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg font-medium">Nenhuma correspondência encontrada</p>
            <p className="text-sm">Você não possui correspondências no momento</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {correspondenciasFiltradas.map((corresp) => (
              <div
                key={corresp.id}
                className="p-6 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => abrirDetalhes(corresp)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-4xl">{getIconeTipo(corresp.tipo)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getLabelTipo(corresp.tipo)}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            getCorStatus(corresp.status) === "yellow"
                              ? "bg-yellow-100 text-yellow-800"
                              : getCorStatus(corresp.status) === "green"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {getLabelStatus(corresp.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Remetente:</strong> {corresp.remetente}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Recebido em:</strong> {formatarData(corresp.dataRecebimento)}
                      </p>
                      {corresp.dataRetirada && (
                        <p className="text-sm text-gray-600">
                          <strong>Retirado em:</strong> {formatarData(corresp.dataRetirada)}
                        </p>
                      )}
                      {corresp.observacoes && (
                        <p className="text-sm text-gray-500 mt-1">
                          💬 {corresp.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {modalDetalhes && correspondenciaSelecionada && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Detalhes da Correspondência</h3>
              <button
                onClick={() => setModalDetalhes(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-5xl">{getIconeTipo(correspondenciaSelecionada.tipo)}</div>
                <div>
                  <p className="text-xl font-semibold">{getLabelTipo(correspondenciaSelecionada.tipo)}</p>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                      getCorStatus(correspondenciaSelecionada.status) === "yellow"
                        ? "bg-yellow-100 text-yellow-800"
                        : getCorStatus(correspondenciaSelecionada.status) === "green"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {getLabelStatus(correspondenciaSelecionada.status)}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Remetente</p>
                  <p className="font-medium">{correspondenciaSelecionada.remetente}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Destinatário</p>
                  <p className="font-medium">{correspondenciaSelecionada.destinatario}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Unidade</p>
                  <p className="font-medium">{correspondenciaSelecionada.unidadeNome}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Data de Recebimento</p>
                  <p className="font-medium">{formatarData(correspondenciaSelecionada.dataRecebimento)}</p>
                </div>

                {correspondenciaSelecionada.dataRetirada && (
                  <div>
                    <p className="text-sm text-gray-500">Data de Retirada</p>
                    <p className="font-medium">{formatarData(correspondenciaSelecionada.dataRetirada)}</p>
                  </div>
                )}

                {correspondenciaSelecionada.observacoes && (
                  <div>
                    <p className="text-sm text-gray-500">Observações</p>
                    <p className="font-medium">{correspondenciaSelecionada.observacoes}</p>
                  </div>
                )}

                {correspondenciaSelecionada.fotoUrl && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Foto</p>
                    <img
                      src={correspondenciaSelecionada.fotoUrl}
                      alt="Foto da correspondência"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => setModalDetalhes(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}