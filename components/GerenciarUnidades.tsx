"use client";
import { useState, useEffect } from "react";
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
} from "firebase/firestore";

interface Unidade {
  id: string;
  tipo: string;
  identificacao: string;
  blocoSetor: string;
  blocoId?: string; // ID do bloco (opcional)
  condominioId: string;
  proprietario: string;
  perfil?: string; // Perfil do proprietário/morador
  status: string;
  criadoEm: any;
}

interface Bloco {
  id: string;
  nome: string;
  condominioId: string;
  ativo: boolean;
}

const TIPOS_UNIDADE = [
  { value: "apartamento", label: "🏢 Apartamento", icon: "🏢" },
  { value: "casa", label: "🏠 Casa", icon: "🏠" },
  { value: "galpao", label: "🏭 Galpão", icon: "🏭" },
  { value: "lote", label: "📦 Lote", icon: "📦" },
  { value: "sala", label: "🏪 Sala Comercial", icon: "🏪" },
  { value: "empresa", label: "🏢 Empresa", icon: "🏢" },
  { value: "outro", label: "🎯 Outro", icon: "🎯" },
];

const PERFIS_MORADOR = [
  { value: "proprietario", label: "Proprietário" },
  { value: "locatario", label: "Locatário" },
  { value: "dependente", label: "Dependente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "outro", label: "Outro" },
];

export default function GerenciarUnidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [unidadeEditando, setUnidadeEditando] = useState<Unidade | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroBlocoId, setFiltroBlocoId] = useState("todos");

  // Formulário
  const [tipo, setTipo] = useState("casa");
  const [identificacao, setIdentificacao] = useState("");
  const [blocoSetor, setBlocoSetor] = useState("");
  const [blocoId, setBlocoId] = useState("");
  const [proprietario, setProprietario] = useState("");
  const [perfil, setPerfil] = useState("proprietario");
  const [status, setStatus] = useState("vago");

  // Condomínio do usuário logado
  const [condominioId, setCondominioId] = useState("");
  const [userRole, setUserRole] = useState("");

  // Carregar dados do usuário autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || "");
            setCondominioId(userData.condominioId || "");
            console.log("👤 Usuário:", userData.role, "| Condomínio:", userData.condominioId);
          }
        } catch (err) {
          console.error("❌ Erro ao carregar dados do usuário:", err);
        }
      }
      setAuthChecked(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && (condominioId || userRole === "admin")) {
      carregarUnidades();
      carregarBlocos();
    }
  }, [authChecked, condominioId, userRole]);

  // Carregar blocos
  const carregarBlocos = async () => {
    try {
      let q;

      if (userRole === "admin") {
        q = query(collection(db, "blocos"), where("ativo", "==", true));
      } else {
        q = query(
          collection(db, "blocos"),
          where("condominioId", "==", condominioId),
          where("ativo", "==", true)
        );
      }

      const snapshot = await getDocs(q);
      const blocosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bloco[];

      setBlocos(blocosData);
      console.log("✅ Blocos carregados:", blocosData.length);
    } catch (err) {
      console.error("❌ Erro ao carregar blocos:", err);
    }
  };

  // Carregar unidades
  const carregarUnidades = async () => {
    try {
      setLoading(true);
      let q;

      if (userRole === "admin") {
        // Admin vê todas as unidades
        q = query(collection(db, "unidades"), orderBy("criadoEm", "desc"));
      } else {
        // Responsável vê apenas unidades do seu condomínio
        q = query(
          collection(db, "unidades"),
          where("condominioId", "==", condominioId),
          orderBy("criadoEm", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const unidadesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Unidade[];

      setUnidades(unidadesData);
      console.log("✅ Unidades carregadas:", unidadesData.length);
    } catch (err) {
      console.error("❌ Erro ao carregar unidades:", err);
      alert("Erro ao carregar unidades");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para nova unidade
  const abrirModalNovo = () => {
    setModoEdicao(false);
    setUnidadeEditando(null);
    setTipo("casa");
    setIdentificacao("");
    setBlocoSetor("");
    setBlocoId("");
    setProprietario("");
    setPerfil("proprietario");
    setStatus("vago");
    setModalAberto(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (unidade: Unidade) => {
    setModoEdicao(true);
    setUnidadeEditando(unidade);
    setTipo(unidade.tipo);
    setIdentificacao(unidade.identificacao);
    setBlocoSetor(unidade.blocoSetor || "");
    setBlocoId(unidade.blocoId || "");
    setProprietario(unidade.proprietario || "");
    setPerfil(unidade.perfil || "proprietario");
    setStatus(unidade.status);
    setModalAberto(true);
  };

  // Salvar unidade (criar ou editar)
  const salvarUnidade = async () => {
    // Validações
    if (!identificacao.trim()) {
      alert("Identificação é obrigatória");
      return;
    }

    try {
      setLoading(true);

      const dadosUnidade: any = {
        tipo,
        identificacao,
        blocoSetor: blocoSetor || "",
        proprietario: proprietario || "",
        perfil: perfil || "proprietario",
        status,
      };

      // Adicionar blocoId se selecionado
      if (blocoId) {
        dadosUnidade.blocoId = blocoId;
        // Se tem blocoId, pegar o nome do bloco para blocoSetor
        const blocoSelecionado = blocos.find((b) => b.id === blocoId);
        if (blocoSelecionado) {
          dadosUnidade.blocoSetor = blocoSelecionado.nome;
        }
      }

      if (modoEdicao && unidadeEditando) {
        // Editar unidade existente
        await updateDoc(doc(db, "unidades", unidadeEditando.id), {
          ...dadosUnidade,
          atualizadoEm: serverTimestamp(),
        });
        console.log("✅ Unidade atualizada");
        alert("Unidade atualizada com sucesso!");
      } else {
        // Criar nova unidade
        await addDoc(collection(db, "unidades"), {
          ...dadosUnidade,
          condominioId,
          criadoEm: serverTimestamp(),
        });
        console.log("✅ Unidade criada");
        alert("Unidade cadastrada com sucesso!");
      }

      setModalAberto(false);
      carregarUnidades();
    } catch (err) {
      console.error("❌ Erro ao salvar unidade:", err);
      alert("Erro ao salvar unidade");
    } finally {
      setLoading(false);
    }
  };

  // Alternar status
  const alternarStatus = async (unidade: Unidade) => {
    try {
      const novoStatus = unidade.status === "ocupado" ? "vago" : "ocupado";
      await updateDoc(doc(db, "unidades", unidade.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
      console.log("✅ Status alterado");
      carregarUnidades();
    } catch (err) {
      console.error("❌ Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  // Excluir unidade
  const excluirUnidade = async (unidade: Unidade) => {
    if (!confirm(`Tem certeza que deseja excluir "${unidade.identificacao}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "unidades", unidade.id));
      console.log("✅ Unidade excluída");
      alert("Unidade excluída com sucesso!");
      carregarUnidades();
    } catch (err) {
      console.error("❌ Erro ao excluir unidade:", err);
      alert("Erro ao excluir unidade");
    }
  };

  // Obter ícone do tipo
  const getIconeTipo = (tipo: string) => {
    const tipoObj = TIPOS_UNIDADE.find((t) => t.value === tipo);
    return tipoObj ? tipoObj.icon : "🎯";
  };

  // Obter label do tipo
  const getLabelTipo = (tipo: string) => {
    const tipoObj = TIPOS_UNIDADE.find((t) => t.value === tipo);
    return tipoObj ? tipoObj.label.replace(/^.+ /, "") : tipo;
  };

  // Obter nome do bloco
  const getNomeBloco = (blocoId?: string) => {
    if (!blocoId) return null;
    const bloco = blocos.find((b) => b.id === blocoId);
    return bloco ? bloco.nome : null;
  };

  // Filtrar unidades
  const unidadesFiltradas = unidades.filter((unidade) => {
    const matchBusca =
      unidade.identificacao.toLowerCase().includes(busca.toLowerCase()) ||
      (unidade.blocoSetor && unidade.blocoSetor.toLowerCase().includes(busca.toLowerCase())) ||
      (unidade.proprietario && unidade.proprietario.toLowerCase().includes(busca.toLowerCase()));
    const matchTipo = filtroTipo === "todos" || unidade.tipo === filtroTipo;
    const matchStatus = filtroStatus === "todos" || unidade.status === filtroStatus;
    const matchBloco = filtroBlocoId === "todos" || unidade.blocoId === filtroBlocoId;
    return matchBusca && matchTipo && matchStatus && matchBloco;
  });

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-[#057321]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Unidades</h1>
              <p className="text-gray-600">Cadastre casas, apartamentos, galpões e outras unidades</p>
            </div>
          </div>
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046019]"
          >
            <span className="text-xl">+</span>
            Nova Unidade
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              placeholder="Identificação, setor..."
            />
          </div>

          {/* Filtro Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
            >
              <option value="todos">Todos</option>
              {TIPOS_UNIDADE.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Bloco */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bloco</label>
            <select
              value={filtroBlocoId}
              onChange={(e) => setFiltroBlocoId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
            >
              <option value="todos">Todos</option>
              {blocos.map((bloco) => (
                <option key={bloco.id} value={bloco.id}>
                  {bloco.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="ocupado">Ocupado</option>
              <option value="vago">Vago</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando unidades...</div>
        ) : unidadesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {busca || filtroTipo !== "todos" || filtroStatus !== "todos" || filtroBlocoId !== "todos"
              ? "Nenhuma unidade encontrada com os filtros aplicados"
              : "Nenhuma unidade cadastrada. Clique em 'Nova Unidade' para começar."}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Identificação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bloco</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proprietário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {unidadesFiltradas.map((unidade) => (
                <tr key={unidade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-2xl">{getIconeTipo(unidade.tipo)}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{unidade.identificacao}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {getNomeBloco(unidade.blocoId) || "-"}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{unidade.blocoSetor || "-"}</td>
                  <td className="px-6 py-4 text-gray-600">{unidade.proprietario || "-"}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {PERFIS_MORADOR.find(p => p.value === unidade.perfil)?.label || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        unidade.status === "ocupado"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {unidade.status === "ocupado" ? "Ocupado" : "Vago"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => abrirModalEditar(unidade)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alternarStatus(unidade)}
                        className="text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                      >
                        {unidade.status === "ocupado" ? "Marcar Vago" : "Marcar Ocupado"}
                      </button>
                      <button
                        onClick={() => excluirUnidade(unidade)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {modoEdicao ? "Editar Unidade" : "Nova Unidade"}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Unidade <span className="text-red-500">*</span>
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                >
                  {TIPOS_UNIDADE.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identificação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={identificacao}
                  onChange={(e) => setIdentificacao(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                  placeholder="Casa 15, Apto 101, Lote 23, etc."
                />
              </div>

              {/* Seletor de Bloco */}
              {blocos.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bloco (Opcional)
                  </label>
                  <select
                    value={blocoId}
                    onChange={(e) => setBlocoId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                  >
                    <option value="">Nenhum bloco</option>
                    {blocos.map((bloco) => (
                      <option key={bloco.id} value={bloco.id}>
                        {bloco.nome}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Vincule esta unidade a um bloco existente
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setor Adicional (Opcional)
                </label>
                <input
                  type="text"
                  value={blocoSetor}
                  onChange={(e) => setBlocoSetor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                  placeholder="Setor A, Quadra 3, Andar 5, etc."
                  disabled={!!blocoId}
                />
                {blocoId && (
                  <p className="text-xs text-gray-500 mt-1">
                    O nome do bloco será usado automaticamente
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proprietário/Morador (Opcional)
                </label>
                <input
                  type="text"
                  value={proprietario}
                  onChange={(e) => setProprietario(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                  placeholder="Nome do proprietário ou morador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil *
                </label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                >
                  {PERFIS_MORADOR.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                >
                  <option value="vago">Vago</option>
                  <option value="ocupado">Ocupado</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarUnidade}
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
    </div>
  );
}