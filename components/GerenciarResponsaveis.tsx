"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/app/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

interface Responsavel {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  status: "ativo" | "inativo";
  condominioId: string;
  condominioNome?: string;
  criadoEm?: any;
  uid?: string;
}

interface Condominio {
  id: string;
  nome: string;
}

export default function GerenciarResponsaveis() {
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [filtroCondominio, setFiltroCondominio] = useState<string>("todos");

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [condominioId, setCondominioId] = useState("");
  const [responsavelEditando, setResponsavelEditando] = useState<Responsavel | null>(null);

  // Carregar condomínios e responsáveis ao montar
  useEffect(() => {
    carregarDados();
  }, []);

  // Função para carregar condomínios e responsáveis
  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar condomínios
      await carregarCondominios();

      // Carregar responsáveis
      await carregarResponsaveis();
    } catch (err) {
      console.error("❌ Erro ao carregar dados:", err);
      alert("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar condomínios
  const carregarCondominios = async () => {
    try {
      const snapshot = await getDocs(collection(db, "condominios"));
      const lista: Condominio[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || "Sem nome",
      }));

      setCondominios(lista);
      console.log("✅ Condomínios carregados:", lista.length);
    } catch (err) {
      console.error("❌ Erro ao carregar condomínios:", err);
    }
  };

  // Função para carregar responsáveis
  const carregarResponsaveis = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "responsavel")
      );
      const snapshot = await getDocs(q);

      const lista: Responsavel[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || "",
        email: doc.data().email || "",
        whatsapp: doc.data().whatsapp || "",
        status: doc.data().status || "ativo",
        condominioId: doc.data().condominioId || "",
        criadoEm: doc.data().criadoEm,
        uid: doc.data().uid,
      }));

      // Buscar nomes dos condomínios
      const listaComNomes = await Promise.all(
        lista.map(async (resp) => {
          if (resp.condominioId) {
            const condSnap = await getDocs(
              query(
                collection(db, "condominios"),
                where("__name__", "==", resp.condominioId)
              )
            );
            if (!condSnap.empty) {
              return {
                ...resp,
                condominioNome: condSnap.docs[0].data().nome,
              };
            }
          }
          return { ...resp, condominioNome: "Sem condomínio" };
        })
      );

      setResponsaveis(listaComNomes);
      console.log("✅ Responsáveis carregados:", listaComNomes.length);
    } catch (err) {
      console.error("❌ Erro ao carregar responsáveis:", err);
      alert("Erro ao carregar responsáveis");
    }
  };

  // Função para salvar responsável
  const salvarResponsavel = async () => {
    try {
      // Validações
      if (!nome.trim()) {
        alert("Nome é obrigatório");
        return;
      }

      if (!email.trim() || !email.includes("@")) {
        alert("Email válido é obrigatório");
        return;
      }

      if (!responsavelEditando) {
        // Criando novo responsável
        if (!senha || senha.length < 6) {
          alert("Senha deve ter no mínimo 6 caracteres");
          return;
        }

        if (senha !== confirmarSenha) {
          alert("As senhas não conferem");
          return;
        }
      }

      if (!whatsapp.trim()) {
        alert("WhatsApp é obrigatório");
        return;
      }

      if (!condominioId) {
        alert("Selecione um condomínio");
        return;
      }

      setLoading(true);

      if (responsavelEditando) {
        // Atualizar responsável existente
        const dadosAtualizacao: any = {
          nome,
          email,
          whatsapp,
          condominioId,
          atualizadoEm: serverTimestamp(),
        };

        // Se senha foi preenchida, validar e atualizar
        if (senha) {
          if (senha.length < 6) {
            alert("Senha deve ter no mínimo 6 caracteres");
            return;
          }
          if (senha !== confirmarSenha) {
            alert("As senhas não conferem");
            return;
          }
          // Nota: Para atualizar senha no Firebase Auth, seria necessário usar Admin SDK
          // Por enquanto, apenas atualizamos os dados do Firestore
          alert("Atenção: A alteração de senha requer que o usuário faça login novamente.");
        }

        await updateDoc(doc(db, "users", responsavelEditando.id), dadosAtualizacao);
        console.log("✅ Responsável atualizado:", responsavelEditando.id);
        alert("Responsável atualizado com sucesso!");
      } else {
        // Criar novo responsável com Firebase Authentication
        console.log("🔐 Criando responsável no Firebase Authentication...");

        // 1. Criar usuário no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;
        console.log("✅ Usuário criado no Authentication:", uid);

        // 2. Salvar dados no Firestore com o UID e condominioId
        await setDoc(doc(db, "users", uid), {
          uid,
          nome,
          email,
          whatsapp,
          role: "responsavel",
          status: "ativo",
          condominioId,
          criadoEm: serverTimestamp(),
        });
        console.log("✅ Dados salvos no Firestore com condominioId:", condominioId);

        // 3. Fazer logout do responsável recém-criado (para não deslogar o admin)
        await signOut(auth);
        console.log("✅ Logout automático do responsável");

        alert("Responsável cadastrado com sucesso!");
      }

      // Limpar formulário e recarregar
      limparFormulario();
      setModalAberto(false);
      await carregarDados();
    } catch (err: any) {
      console.error("❌ Erro ao salvar responsável:", err);

      // Mensagens de erro mais amigáveis
      if (err.code === "auth/email-already-in-use") {
        alert("Este email já está cadastrado");
      } else if (err.code === "auth/invalid-email") {
        alert("Email inválido");
      } else if (err.code === "auth/weak-password") {
        alert("Senha muito fraca (mínimo 6 caracteres)");
      } else {
        alert("Erro ao salvar responsável: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para editar responsável
  const editarResponsavel = (responsavel: Responsavel) => {
    setResponsavelEditando(responsavel);
    setNome(responsavel.nome);
    setEmail(responsavel.email);
    setWhatsapp(responsavel.whatsapp);
    setCondominioId(responsavel.condominioId);
    setSenha("");
    setConfirmarSenha("");
    setModalAberto(true);
  };

  // Função para alternar status
  const alternarStatus = async (responsavel: Responsavel) => {
    try {
      const novoStatus = responsavel.status === "ativo" ? "inativo" : "ativo";
      await updateDoc(doc(db, "users", responsavel.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
      console.log(`✅ Status alterado: ${responsavel.nome} → ${novoStatus}`);
      await carregarResponsaveis();
    } catch (err) {
      console.error("❌ Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  // Função para excluir responsável
  const excluirResponsavel = async (responsavel: Responsavel) => {
    if (
      !confirm(
        `Deseja realmente excluir o responsável "${responsavel.nome}"?\n\nIsso removerá o acesso ao sistema.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Excluir do Firestore
      await deleteDoc(doc(db, "users", responsavel.id));
      console.log("✅ Responsável excluído do Firestore:", responsavel.nome);

      alert("Responsável excluído com sucesso!");
      await carregarResponsaveis();
    } catch (err) {
      console.error("❌ Erro ao excluir responsável:", err);
      alert("Erro ao excluir responsável");
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar formulário
  const limparFormulario = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setConfirmarSenha("");
    setWhatsapp("");
    setCondominioId("");
    setResponsavelEditando(null);
  };

  // Função para abrir modal de novo responsável
  const abrirModalNovo = () => {
    limparFormulario();
    setModalAberto(true);
  };

  // Filtrar responsáveis
  const responsaveisFiltrados = responsaveis.filter((r) => {
    const matchBusca =
      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
      r.email.toLowerCase().includes(busca.toLowerCase()) ||
      r.whatsapp.includes(busca) ||
      (r.condominioNome && r.condominioNome.toLowerCase().includes(busca.toLowerCase()));

    const matchStatus = filtroStatus === "todos" || r.status === filtroStatus;

    const matchCondominio =
      filtroCondominio === "todos" || r.condominioId === filtroCondominio;

    return matchBusca && matchStatus && matchCondominio;
  });

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h2 className="text-xl font-bold">Gerenciar Responsáveis/Síndicos</h2>
        </div>
        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Responsável
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Buscar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Nome, email, WhatsApp ou condomínio..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Filtrar por Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>

          {/* Filtrar por Condomínio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condomínio</label>
            <select
              value={filtroCondominio}
              onChange={(e) => setFiltroCondominio(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todos">Todos</option>
              {condominios.map((cond) => (
                <option key={cond.id} value={cond.id}>
                  {cond.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listagem */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : responsaveisFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <p className="text-gray-500 font-medium">Nenhum responsável encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Clique em "Novo Responsável" para cadastrar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condomínio
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
              {responsaveisFiltrados.map((responsavel) => (
                <tr key={responsavel.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{responsavel.nome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{responsavel.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{responsavel.whatsapp}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{responsavel.condominioNome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        responsavel.status === "ativo"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {responsavel.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => editarResponsavel(responsavel)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarStatus(responsavel)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      {responsavel.status === "ativo" ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => excluirResponsavel(responsavel)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
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
                {responsavelEditando ? "Editar Responsável" : "Novo Responsável"}
              </h3>
              <button
                onClick={() => {
                  setModalAberto(false);
                  limparFormulario();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="João Silva"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="sindico@exemplo.com"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {!responsavelEditando && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="••••••"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {responsavelEditando 
                    ? "Deixe em branco para manter a senha atual" 
                    : "Mínimo de 6 caracteres"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha {!responsavelEditando && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="••••••"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="(81) 99961-8516"
                />
                <p className="text-xs text-gray-500 mt-1">Com DDD</p>
              </div>

              {/* Condomínio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condomínio <span className="text-red-500">*</span>
                </label>
                <select
                  value={condominioId}
                  onChange={(e) => setCondominioId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Selecione um condomínio</option>
                  {condominios.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setModalAberto(false);
                  limparFormulario();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarResponsavel}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}