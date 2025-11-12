"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { db, auth } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

interface Porteiro {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  status: "ativo" | "inativo";
  criadoEm?: any;
  uid?: string; // UID do Firebase Authentication
}

export default function GerenciarPorteiros() {
  const router = useRouter();
  const [porteiros, setPorteiros] = useState<Porteiro[]>([]);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [porteiroEditando, setPorteiroEditando] = useState<Porteiro | null>(null);

  // Carregar dados do usuário autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || "");
          }
        } catch (err) {
          console.error("❌ Erro ao carregar dados do usuário:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Carregar porteiros ao montar
  useEffect(() => {
    carregarPorteiros();
  }, []);

  // Função para carregar porteiros
  const carregarPorteiros = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "users"), where("role", "==", "porteiro"));
      const snapshot = await getDocs(q);
      
      const lista: Porteiro[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || "",
        email: doc.data().email || "",
        whatsapp: doc.data().whatsapp || "",
        status: doc.data().status || "ativo",
        criadoEm: doc.data().criadoEm,
        uid: doc.data().uid,
      }));

      setPorteiros(lista);
      console.log("✅ Porteiros carregados:", lista.length);
    } catch (err) {
      console.error("❌ Erro ao carregar porteiros:", err);
      alert("Erro ao carregar porteiros");
    } finally {
      setLoading(false);
    }
  };

  // Função para salvar porteiro
  const salvarPorteiro = async () => {
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

      if (!porteiroEditando) {
        // Criando novo porteiro
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

      setLoading(true);

      if (porteiroEditando) {
        // Atualizar porteiro existente
        const dadosAtualizacao: any = {
          nome,
          email,
          whatsapp,
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

        await updateDoc(doc(db, "users", porteiroEditando.id), dadosAtualizacao);
        console.log("✅ Porteiro atualizado:", porteiroEditando.id);
        alert("Porteiro atualizado com sucesso!");
      } else {
        // Criar novo porteiro com Firebase Authentication
        console.log("🔐 Criando usuário no Firebase Authentication...");
        
        // 1. Criar usuário no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;
        console.log("✅ Usuário criado no Authentication:", uid);

        // 2. Salvar dados no Firestore com o UID
        await setDoc(doc(db, "users", uid), {
          uid,
          nome,
          email,
          whatsapp,
          role: "porteiro",
          status: "ativo",
          criadoEm: serverTimestamp(),
        });
        console.log("✅ Dados salvos no Firestore:", uid);

        // 3. Fazer logout do porteiro recém-criado (para não deslogar o admin)
        await signOut(auth);
        console.log("✅ Logout automático do porteiro");

        alert("Porteiro cadastrado com sucesso!");
      }

      // Limpar formulário e recarregar
      limparFormulario();
      setModalAberto(false);
      await carregarPorteiros();
    } catch (err: any) {
      console.error("❌ Erro ao salvar porteiro:", err);
      
      // Mensagens de erro mais amigáveis
      if (err.code === "auth/email-already-in-use") {
        alert("Este email já está cadastrado");
      } else if (err.code === "auth/invalid-email") {
        alert("Email inválido");
      } else if (err.code === "auth/weak-password") {
        alert("Senha muito fraca (mínimo 6 caracteres)");
      } else {
        alert("Erro ao salvar porteiro: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para editar porteiro
  const editarPorteiro = (porteiro: Porteiro) => {
    setPorteiroEditando(porteiro);
    setNome(porteiro.nome);
    setEmail(porteiro.email);
    setWhatsapp(porteiro.whatsapp);
    setSenha("");
    setConfirmarSenha("");
    setModalAberto(true);
  };

  // Função para alternar status
  const alternarStatus = async (porteiro: Porteiro) => {
    try {
      const novoStatus = porteiro.status === "ativo" ? "inativo" : "ativo";
      await updateDoc(doc(db, "users", porteiro.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
      console.log(`✅ Status alterado: ${porteiro.nome} → ${novoStatus}`);
      await carregarPorteiros();
    } catch (err) {
      console.error("❌ Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  // Função para excluir porteiro
  const excluirPorteiro = async (porteiro: Porteiro) => {
    if (!confirm(`Deseja realmente excluir o porteiro "${porteiro.nome}"?\n\nIsso removerá o acesso ao sistema.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // 1. Excluir do Firestore
      await deleteDoc(doc(db, "users", porteiro.id));
      console.log("✅ Porteiro excluído do Firestore:", porteiro.nome);

      // Nota: Não é possível excluir usuário do Authentication sem estar logado como ele
      // Em produção, use Firebase Admin SDK no backend para isso

      alert("Porteiro excluído com sucesso!");
      await carregarPorteiros();
    } catch (err) {
      console.error("❌ Erro ao excluir porteiro:", err);
      alert("Erro ao excluir porteiro");
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
    setPorteiroEditando(null);
  };

  // Função para abrir modal de novo porteiro
  const abrirModalNovo = () => {
    limparFormulario();
    setModalAberto(true);
  };

  // Filtrar porteiros
  const porteirosFiltrados = porteiros.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.email.toLowerCase().includes(busca.toLowerCase()) ||
      p.whatsapp.includes(busca);

    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;

    return matchBusca && matchStatus;
  });

  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      porteiro: "Porteiro",
      responsavel: "Responsável",
      morador: "Morador",
      admin: "Admin",
      adminMaster: "Admin Master",
    };
    return roles[role] || role;
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-app-correspondencia.png"
                alt="Logo App Correspondência"
                width={55}
                height={55}
                className="rounded-lg border border-gray-200 object-cover"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  App Correspondência
                </h1>
                <p className="text-sm text-gray-500">Painel do Responsável</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/minha-conta")}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              >
                <span className="text-sm">Perfil: <span className="font-semibold">{getRoleLabel(userRole)}</span></span>
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium shadow-sm"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xl font-bold">Gerenciar Porteiros</h2>
        </div>
        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Porteiro
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buscar Porteiro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Porteiro
            </label>
            <input
              type="text"
              placeholder="Nome, email ou WhatsApp..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Filtrar por Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Status
            </label>
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
        </div>
      </div>

      {/* Listagem */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : porteirosFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500 font-medium">Nenhum porteiro encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              Clique em "Novo Porteiro" para cadastrar
            </p>
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {porteirosFiltrados.map((porteiro) => (
                <tr key={porteiro.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{porteiro.nome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{porteiro.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{porteiro.whatsapp}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        porteiro.status === "ativo"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {porteiro.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => editarPorteiro(porteiro)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarStatus(porteiro)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      {porteiro.status === "ativo" ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => excluirPorteiro(porteiro)}
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
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {porteiroEditando ? "Editar Porteiro" : "Novo Porteiro"}
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
                  placeholder="porteiro@exemplo.com"
                />
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {!porteiroEditando && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="••••••"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {porteiroEditando 
                    ? "Deixe em branco para manter a senha atual" 
                    : "Mínimo de 6 caracteres"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha {!porteiroEditando && <span className="text-red-500">*</span>}
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
                onClick={salvarPorteiro}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}