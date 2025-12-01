"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, ArrowLeft, User, Edit2, Trash2, UserCheck, UserX, Phone, Mail, Plus } from "lucide-react";
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
  getDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// 1. IMPORTANDO A NAVBAR E O BOTÃO PADRONIZADO
import Navbar from "@/components/Navbar"; 
import BotaoVoltar from "@/components/BotaoVoltar";

interface Porteiro {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  status: "ativo" | "inativo";
  criadoEm?: any;
  uid?: string; 
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

  const [authChecked, setAuthChecked] = useState(false);
  const [userName, setUserName] = useState("");

  // Carregar dados do usuário autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || "");
            setUserName(userData.nome || "");
          }
        } catch (err) {
          console.error("❌ Erro ao carregar dados do usuário:", err);
        }
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Carregar porteiros ao montar
  useEffect(() => {
    carregarPorteiros();
  }, []);

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
    } catch (err) {
      console.error("❌ Erro ao carregar porteiros:", err);
      alert("Erro ao carregar porteiros");
    } finally {
      setLoading(false);
    }
  };

  const salvarPorteiro = async () => {
    try {
      if (!nome.trim()) { alert("Nome é obrigatório"); return; }
      if (!email.trim() || !email.includes("@")) { alert("Email válido é obrigatório"); return; }

      if (!porteiroEditando) {
        if (!senha || senha.length < 6) { alert("Senha deve ter no mínimo 6 caracteres"); return; }
        if (senha !== confirmarSenha) { alert("As senhas não conferem"); return; }
      }

      if (!whatsapp.trim()) { alert("WhatsApp é obrigatório"); return; }

      setLoading(true);

      if (porteiroEditando) {
        const dadosAtualizacao: any = {
          nome,
          email,
          whatsapp,
          atualizadoEm: serverTimestamp(),
        };

        if (senha) {
          if (senha.length < 6) { alert("Senha deve ter no mínimo 6 caracteres"); return; }
          if (senha !== confirmarSenha) { alert("As senhas não conferem"); return; }
          alert("Atenção: A alteração de senha requer que o usuário faça login novamente.");
        }

        await updateDoc(doc(db, "users", porteiroEditando.id), dadosAtualizacao);
        alert("Porteiro atualizado com sucesso!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          uid,
          nome,
          email,
          whatsapp,
          role: "porteiro",
          status: "ativo",
          criadoEm: serverTimestamp(),
        });

        await signOut(auth);
        alert("Porteiro cadastrado com sucesso!");
      }

      limparFormulario();
      setModalAberto(false);
      await carregarPorteiros();
    } catch (err: any) {
      console.error("❌ Erro ao salvar porteiro:", err);
      if (err.code === "auth/email-already-in-use") alert("Este email já está cadastrado");
      else if (err.code === "auth/invalid-email") alert("Email inválido");
      else if (err.code === "auth/weak-password") alert("Senha muito fraca");
      else alert("Erro ao salvar porteiro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const editarPorteiro = (porteiro: Porteiro) => {
    setPorteiroEditando(porteiro);
    setNome(porteiro.nome);
    setEmail(porteiro.email);
    setWhatsapp(porteiro.whatsapp);
    setSenha("");
    setConfirmarSenha("");
    setModalAberto(true);
  };

  const alternarStatus = async (porteiro: Porteiro) => {
    try {
      const novoStatus = porteiro.status === "ativo" ? "inativo" : "ativo";
      await updateDoc(doc(db, "users", porteiro.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
      await carregarPorteiros();
    } catch (err) {
      console.error("❌ Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  const excluirPorteiro = async (porteiro: Porteiro) => {
    if (!confirm(`Deseja realmente excluir o porteiro "${porteiro.nome}"?\n\nIsso removerá o acesso ao sistema.`)) {
      return;
    }
    try {
      setLoading(true);
      await deleteDoc(doc(db, "users", porteiro.id));
      alert("Porteiro excluído com sucesso!");
      await carregarPorteiros();
    } catch (err) {
      console.error("❌ Erro ao excluir porteiro:", err);
      alert("Erro ao excluir porteiro");
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setConfirmarSenha("");
    setWhatsapp("");
    setPorteiroEditando(null);
  };

  const abrirModalNovo = () => {
    limparFormulario();
    setModalAberto(true);
  };

  const porteirosFiltrados = porteiros.filter((p) => {
    const matchBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.email.toLowerCase().includes(busca.toLowerCase()) ||
      p.whatsapp.includes(busca);

    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Navbar Global */}
      <Navbar />

      {/* Padding Ajustado */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        
        {/* 2. BOTÃO VOLTAR PADRONIZADO */}
        <BotaoVoltar url="/dashboard-responsavel" />

        <div className="space-y-6">
          
          {/* Cabeçalho da Página */}
          <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gerenciar Porteiros</h2>
              <p className="text-gray-600 text-sm">Cadastre e gerencie o acesso dos porteiros</p>
            </div>
            <button
              onClick={abrirModalNovo}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#057321] text-white rounded-lg hover:bg-[#046119] font-bold shadow-sm transition-colors"
            >
              <Plus size={20} />
              Novo Porteiro
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-white p-6 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Porteiro</label>
              <input
                type="text"
                placeholder="Nome, email ou WhatsApp..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {/* VISUALIZAÇÃO MOBILE (CARDS) */}
          <div className="md:hidden space-y-4">
            {porteirosFiltrados.length === 0 ? (
               <div className="text-center p-8 bg-white rounded-xl text-gray-500">Nenhum porteiro encontrado</div>
            ) : (
               porteirosFiltrados.map((porteiro) => (
                 <div key={porteiro.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                       <div>
                          <h3 className="font-bold text-gray-900 text-lg">{porteiro.nome}</h3>
                          <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                             <Mail size={14} /> {porteiro.email}
                          </div>
                       </div>
                       <span className={`px-2 py-1 text-xs font-bold rounded-full ${porteiro.status === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {porteiro.status === "ativo" ? "Ativo" : "Inativo"}
                       </span>
                    </div>

                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg flex items-center gap-2">
                       <Phone size={16} className="text-gray-400" />
                       <span className="font-medium">{porteiro.whatsapp}</span>
                    </div>

                    <div className="flex gap-2 mt-1">
                       <button onClick={() => editarPorteiro(porteiro)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100">
                          <Edit2 size={16} /> Editar
                       </button>
                       <button onClick={() => alternarStatus(porteiro)} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium ${porteiro.status === "ativo" ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                          {porteiro.status === "ativo" ? <UserX size={16} /> : <UserCheck size={16} />}
                          {porteiro.status === "ativo" ? "Desativar" : "Ativar"}
                       </button>
                       <button onClick={() => excluirPorteiro(porteiro)} className="flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                          <Trash2 size={18} />
                       </button>
                    </div>
                 </div>
               ))
            )}
          </div>

          {/* VISUALIZAÇÃO DESKTOP (TABELA) */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
             <div className="overflow-x-auto">
                <table className="w-full">
                   <thead className="bg-gray-50 border-b">
                      <tr>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">WhatsApp</th>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                         <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                      {porteirosFiltrados.length === 0 ? (
                         <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum porteiro encontrado</td></tr>
                      ) : (
                         porteirosFiltrados.map((porteiro) => (
                            <tr key={porteiro.id} className="hover:bg-gray-50 transition">
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{porteiro.nome}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{porteiro.email}</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{porteiro.whatsapp}</td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${porteiro.status === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                     {porteiro.status === "ativo" ? "Ativo" : "Inativo"}
                                  </span>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                  <button onClick={() => editarPorteiro(porteiro)} className="text-blue-600 hover:text-blue-900 font-bold">Editar</button>
                                  <button onClick={() => alternarStatus(porteiro)} className="text-yellow-600 hover:text-yellow-900 font-bold">{porteiro.status === "ativo" ? "Desativar" : "Ativar"}</button>
                                  <button onClick={() => excluirPorteiro(porteiro)} className="text-red-600 hover:text-red-900 font-bold">Excluir</button>
                               </td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>

        </div>
      </main>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {porteiroEditando ? "Editar Porteiro" : "Novo Porteiro"}
              </h3>
              <button onClick={() => { setModalAberto(false); limparFormulario(); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="João Silva" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="porteiro@exemplo.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha {!porteiroEditando && <span className="text-red-500">*</span>}</label>
                <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="••••••" />
                <p className="text-xs text-gray-500 mt-1">{porteiroEditando ? "Deixe em branco para manter a senha atual" : "Mínimo de 6 caracteres"}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha {!porteiroEditando && <span className="text-red-500">*</span>}</label>
                <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="••••••" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp <span className="text-red-500">*</span></label>
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="(81) 99961-8516" />
                <p className="text-xs text-gray-500 mt-1">Com DDD</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setModalAberto(false); limparFormulario(); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={salvarPorteiro} disabled={loading} className="flex-1 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] disabled:opacity-50">{loading ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
