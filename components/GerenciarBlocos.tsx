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
  writeBatch,
} from "firebase/firestore";

interface Bloco {
  id: string;
  nome: string;
  condominioId: string;
  numeroAndares: number;
  apartamentosPorAndar: number;
  totalApartamentos: number;
  ativo: boolean;
  criadoEm: any;
}

export default function GerenciarBlocos() {
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [blocoEditando, setBlocoEditando] = useState<Bloco | null>(null);

  // Modal de geração de unidades
  const [modalGerarUnidades, setModalGerarUnidades] = useState(false);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [blocoParaGerar, setBlocoParaGerar] = useState<Bloco | null>(null);
  const [formatoApartamento, setFormatoApartamento] = useState("padrao");
  const [prefixoPersonalizado, setPrefixoPersonalizado] = useState("");

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Formulário
  const [nome, setNome] = useState("");
  const [numeroAndares, setNumeroAndares] = useState("");
  const [apartamentosPorAndar, setApartamentosPorAndar] = useState("");
  const [ativo, setAtivo] = useState(true);

  // Condomínio do usuário logado
  const [condominioId, setCondominioId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || "");
            setCondominioId(userData.condominioId || "");
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
      carregarBlocos();
    }
  }, [authChecked, condominioId, userRole]);

  const carregarBlocos = async () => {
    try {
      setLoading(true);
      let q;

      if (userRole === "admin") {
        q = query(collection(db, "blocos"), orderBy("criadoEm", "desc"));
      } else {
        q = query(
          collection(db, "blocos"),
          where("condominioId", "==", condominioId),
          orderBy("criadoEm", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const blocosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Bloco[];

      setBlocos(blocosData);
    } catch (err) {
      console.error("❌ Erro ao carregar blocos:", err);
      alert("Erro ao carregar blocos");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setBlocoEditando(null);
    setNome("");
    setNumeroAndares("");
    setApartamentosPorAndar("");
    setAtivo(true);
    setModalAberto(true);
  };

  const abrirModalEditar = (bloco: Bloco) => {
    setModoEdicao(true);
    setBlocoEditando(bloco);
    setNome(bloco.nome);
    setNumeroAndares(bloco.numeroAndares.toString());
    setApartamentosPorAndar(bloco.apartamentosPorAndar.toString());
    setAtivo(bloco.ativo);
    setModalAberto(true);
  };

  const calcularTotal = () => {
    const andares = parseInt(numeroAndares) || 0;
    const aptos = parseInt(apartamentosPorAndar) || 0;
    return andares * aptos;
  };

  const salvarBloco = async () => {
    if (!nome.trim()) {
      alert("Nome do bloco é obrigatório");
      return;
    }
    if (!numeroAndares || parseInt(numeroAndares) <= 0) {
      alert("Número de andares deve ser maior que zero");
      return;
    }
    if (!apartamentosPorAndar || parseInt(apartamentosPorAndar) <= 0) {
      alert("Apartamentos por andar deve ser maior que zero");
      return;
    }

    try {
      setLoading(true);
      const totalApartamentos = calcularTotal();

      if (modoEdicao && blocoEditando) {
        await updateDoc(doc(db, "blocos", blocoEditando.id), {
          nome,
          numeroAndares: parseInt(numeroAndares),
          apartamentosPorAndar: parseInt(apartamentosPorAndar),
          totalApartamentos,
          ativo,
          atualizadoEm: serverTimestamp(),
        });
        alert("Bloco atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "blocos"), {
          nome,
          condominioId,
          numeroAndares: parseInt(numeroAndares),
          apartamentosPorAndar: parseInt(apartamentosPorAndar),
          totalApartamentos,
          ativo,
          criadoEm: serverTimestamp(),
        });
        alert("Bloco cadastrado com sucesso!");
      }

      setModalAberto(false);
      carregarBlocos();
    } catch (err) {
      console.error("❌ Erro ao salvar bloco:", err);
      alert("Erro ao salvar bloco");
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
      console.error("❌ Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  const excluirBloco = async (bloco: Bloco) => {
    if (!confirm(`Tem certeza que deseja excluir o bloco "${bloco.nome}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "blocos", bloco.id));
      alert("Bloco excluído com sucesso!");
      carregarBlocos();
    } catch (err) {
      console.error("❌ Erro ao excluir bloco:", err);
      alert("Erro ao excluir bloco");
    }
  };

  const abrirModalGerarUnidades = (bloco: Bloco) => {
    setBlocoParaGerar(bloco);
    setFormatoApartamento("padrao");
    setPrefixoPersonalizado("");
    setModalGerarUnidades(true);
  };

  const gerarNomeApartamento = (andar: number, numero: number, formato: string, prefixo: string) => {
    switch (formato) {
      case "padrao":
        return `${andar}${numero.toString().padStart(2, "0")}`;
      case "andar_numero":
        return `Andar ${andar} - Apto ${numero}`;
      case "personalizado":
        return `${prefixo} ${andar}${numero.toString().padStart(2, "0")}`;
      default:
        return `${andar}${numero.toString().padStart(2, "0")}`;
    }
  };

  const gerarUnidades = async () => {
    if (!blocoParaGerar) return;

    if (formatoApartamento === "personalizado" && !prefixoPersonalizado.trim()) {
      alert("Digite um prefixo para o formato personalizado");
      return;
    }

    if (!confirm(
      `Isso irá criar ${blocoParaGerar.totalApartamentos} unidades automaticamente.\n\nDeseja continuar?`
    )) {
      return;
    }

    try {
      setLoading(true);

      const batch = writeBatch(db);
      const unidadesRef = collection(db, "unidades");

      let unidadesCriadas = 0;

      for (let andar = 1; andar <= blocoParaGerar.numeroAndares; andar++) {
        for (let apto = 1; apto <= blocoParaGerar.apartamentosPorAndar; apto++) {
          const nomeApartamento = gerarNomeApartamento(
            andar,
            apto,
            formatoApartamento,
            prefixoPersonalizado
          );

          const novaUnidadeRef = doc(unidadesRef);
          batch.set(novaUnidadeRef, {
            tipo: "apartamento",
            identificacao: nomeApartamento,
            blocoId: blocoParaGerar.id,
            blocoSetor: blocoParaGerar.nome,
            condominioId: blocoParaGerar.condominioId,
            tipoOcupacao: "vago",
            totalMoradores: 0,
            criadoEm: serverTimestamp(),
          });

          unidadesCriadas++;
        }
      }

      await batch.commit();

      alert(`${unidadesCriadas} unidades criadas com sucesso!`);
      setModalGerarUnidades(false);
    } catch (err) {
      console.error("❌ Erro ao gerar unidades:", err);
      alert("Erro ao gerar unidades");
    } finally {
      setLoading(false);
    }
  };

  const blocosFiltrados = blocos.filter((bloco) => {
    const matchBusca = bloco.nome.toLowerCase().includes(busca.toLowerCase());
    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "ativo" && bloco.ativo) ||
      (filtroStatus === "inativo" && !bloco.ativo);
    return matchBusca && matchStatus;
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Blocos</h1>
              <p className="text-gray-600">Cadastre blocos e gere apartamentos automaticamente</p>
            </div>
          </div>
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046019]"
          >
            <span className="text-xl">+</span>
            Novo Bloco
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Bloco
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              placeholder="Nome do bloco..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Status
            </label>
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
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Andares
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aptos/Andar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blocosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhum bloco encontrado
                  </td>
                </tr>
              ) : (
                blocosFiltrados.map((bloco) => (
                  <tr key={bloco.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bloco.nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{bloco.numeroAndares}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{bloco.apartamentosPorAndar}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-[#057321]">{bloco.totalApartamentos}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          bloco.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {bloco.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => abrirModalGerarUnidades(bloco)}
                        className="text-[#057321] hover:text-#14532d"
                        title="Gerar Unidades"
                      >
                        🏠 Gerar
                      </button>
                      <button
                        onClick={() => abrirModalEditar(bloco)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alternarStatus(bloco)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        {bloco.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluirBloco(bloco)}
                        className="text-red-600 hover:text-red-900"
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

      {/* Modal Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {modoEdicao ? "Editar Bloco" : "Novo Bloco"}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Card de Ajuda Expansível */}
              <div className="border border-blue-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMostrarAjuda(!mostrarAjuda)}
                  className="w-full px-4 py-3 bg-blue-50 text-left flex items-center justify-between hover:bg-blue-100 transition"
                >
                  <span className="text-sm font-medium text-blue-900">
                    🔽 Seu condomínio não se enquadra aqui? Clique para ver como cadastrar
                  </span>
                  <svg
                    className={`w-5 h-5 text-blue-600 transition-transform ${
                      mostrarAjuda ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {mostrarAjuda && (
                  <div className="px-4 py-4 bg-white border-t border-blue-200 text-sm space-y-4">
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">
                        🏡 Se o seu condomínio possui casas térreas:
                      </p>
                      <ul className="text-gray-700 space-y-1 ml-4 list-disc">
                        <li>
                          <strong>Número de Andares:</strong> Digite <strong>1</strong> (térreo)
                        </li>
                        <li>
                          <strong>Unidades por Andar:</strong> Digite a{" "}
                          <strong>quantidade total de casas</strong>
                        </li>
                        <li className="text-xs text-gray-600 mt-1">
                          Exemplo: 15 casas térreas = Andares: 1 | Unidades: 15
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900 mb-2">
                        🏢 Se o seu condomínio não possui blocos (prédio único):
                      </p>
                      <ul className="text-gray-700 space-y-1 ml-4 list-disc">
                        <li>
                          <strong>Nome do Bloco:</strong> Digite o{" "}
                          <strong>nome do seu condomínio</strong>
                        </li>
                        <li>
                          <strong>Número de Andares:</strong> Digite a{" "}
                          <strong>quantidade de andares do prédio</strong>
                        </li>
                        <li>
                          <strong>Unidades por Andar:</strong> Digite quantos{" "}
                          <strong>apartamentos existem por andar</strong>
                        </li>
                        <li className="text-xs text-gray-600 mt-1">
                          Exemplo: Edifício com 8 andares e 4 aptos/andar = Andares: 8 |
                          Unidades: 4
                        </li>
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-gray-700 mb-2">
                        <strong>💬 Ainda tem dúvidas ou seu condomínio possui estrutura diferente?</strong>
                      </p>
                      <p className="text-gray-600">
                        Entre em contato via WhatsApp e faremos a parametrização
                        personalizada para você!
                        <br />
                        📱{" "}
                        <a
                          href="https://wa.me/5581999618516"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline font-medium"
                        >
                          (81) 99961-8516
                        </a>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Bloco *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                  placeholder="Ex: Bloco A, Torre 1..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Andares *
                </label>
                <input
                  type="number"
                  value={numeroAndares}
                  onChange={(e) => setNumeroAndares(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                  placeholder="Ex: 10"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apartamentos por Andar *
                </label>
                <input
                  type="number"
                  value={apartamentosPorAndar}
                  onChange={(e) => setApartamentosPorAndar(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                  placeholder="Ex: 4"
                  min="1"
                />
              </div>

              {numeroAndares && apartamentosPorAndar && (
                <div className="bg-#f0fdf4 border border-#bbf7d0 rounded-lg p-3">
                  <p className="text-sm text-#14532d">
                    <span className="font-semibold">Total de apartamentos:</span>{" "}
                    {calcularTotal()}
                  </p>
                </div>
              )}

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

      {/* Modal Gerar Unidades */}
      {modalGerarUnidades && blocoParaGerar && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Gerar Unidades Automaticamente</h3>
              <button
                onClick={() => setModalGerarUnidades(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-#f0fdf4 border border-#bbf7d0 rounded-lg p-4">
                <p className="text-sm text-#14532d">
                  <span className="font-semibold">Bloco:</span> {blocoParaGerar.nome}
                </p>
                <p className="text-sm text-#14532d">
                  <span className="font-semibold">Total de unidades:</span>{" "}
                  {blocoParaGerar.totalApartamentos}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de Numeração
                </label>
                <select
                  value={formatoApartamento}
                  onChange={(e) => setFormatoApartamento(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                >
                  <option value="padrao">Padrão (101, 102, 201, 202...)</option>
                  <option value="andar_numero">Andar e Número (Andar 1 - Apto 1...)</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {formatoApartamento === "personalizado" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prefixo Personalizado
                  </label>
                  <input
                    type="text"
                    value={prefixoPersonalizado}
                    onChange={(e) => setPrefixoPersonalizado(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                    placeholder="Apto, Unidade, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplo: "Apto 101", "Unidade 201"
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Esta ação irá criar {blocoParaGerar.totalApartamentos} unidades
                  automaticamente. Certifique-se de que não existem unidades duplicadas.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalGerarUnidades(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={gerarUnidades}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046019] disabled:opacity-50"
                >
                  {loading ? "Gerando..." : "Gerar Unidades"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}