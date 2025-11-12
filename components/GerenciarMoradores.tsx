"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { db, auth } from "@/app/lib/firebase";
import { onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  writeBatch,
} from "firebase/firestore";

interface Morador {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  perfil: string;
  unidadeId: string;
  unidadeNome?: string;
  condominioId: string;
  ativo: boolean;
  criadoEm: any;
}

interface Unidade {
  id: string;
  identificacao: string;
  tipo: string;
  blocoSetor: string;
  blocoId?: string;
}

interface Bloco {
  id: string;
  nome: string;
}

const PERFIS_MORADOR = [
  { value: "proprietario", label: "Proprietário" },
  { value: "locatario", label: "Locatário" },
  { value: "dependente", label: "Dependente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "outro", label: "Outro" },
];

export default function GerenciarMoradores() {
  const router = useRouter();
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null);

  // Modal de importação Excel
  const [modalImportacao, setModalImportacao] = useState(false);
  const [arquivoExcel, setArquivoExcel] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [filtroUnidadeId, setFiltroUnidadeId] = useState("todos");

  // Formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [perfil, setPerfil] = useState("proprietario");
  const [blocoIdFormulario, setBlocoIdFormulario] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [senha, setSenha] = useState("");
  const [criarContaAutomatica, setCriarContaAutomatica] = useState(false);

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
      carregarMoradores();
      carregarUnidades();
    }
  }, [authChecked, condominioId, userRole]);

  const carregarBlocos = async () => {
    try {
      let q;

      if (userRole === "admin") {
        q = query(collection(db, "blocos"), orderBy("nome", "asc"));
      } else {
        q = query(
          collection(db, "blocos"),
          where("condominioId", "==", condominioId),
          orderBy("nome", "asc")
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
    }
  };

  const carregarUnidades = async () => {
    try {
      let q;

      if (userRole === "admin") {
        q = query(collection(db, "unidades"), orderBy("identificacao", "asc"));
      } else {
        q = query(
          collection(db, "unidades"),
          where("condominioId", "==", condominioId),
          orderBy("identificacao", "asc")
        );
      }

      const snapshot = await getDocs(q);
      const unidadesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Unidade[];

      setUnidades(unidadesData);
    } catch (err) {
      console.error("❌ Erro ao carregar unidades:", err);
    }
  };

  const carregarMoradores = async () => {
    try {
      setLoading(true);
      let q;

      if (userRole === "admin") {
        q = query(collection(db, "users"), where("role", "==", "morador"), orderBy("criadoEm", "desc"));
      } else {
        q = query(
          collection(db, "users"),
          where("condominioId", "==", condominioId),
          where("role", "==", "morador"),
          orderBy("criadoEm", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const moradoresData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Morador[];

      setMoradores(moradoresData);
    } catch (err) {
      console.error("❌ Erro ao carregar moradores:", err);
      alert("Erro ao carregar moradores");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setMoradorEditando(null);
    setNome("");
    setEmail("");
    setWhatsapp("");
    setPerfil("proprietario");
    setBlocoIdFormulario("");
    setUnidadeId("");
    setAtivo(true);
    setSenha("");
    setModalAberto(true);
  };

  const abrirModalEditar = (morador: Morador) => {
    setModoEdicao(true);
    setMoradorEditando(morador);
    setNome(morador.nome);
    setEmail(morador.email);
    setWhatsapp(morador.whatsapp);
    setPerfil(morador.perfil);
    
    // Encontrar blocoId da unidade
    const unidadeMorador = unidades.find(u => u.id === morador.unidadeId);
    if (unidadeMorador && unidadeMorador.blocoId) {
      setBlocoIdFormulario(unidadeMorador.blocoId);
    }
    
    setUnidadeId(morador.unidadeId);
    setAtivo(morador.ativo);
    setModalAberto(true);
  };

  const salvarMorador = async () => {
    if (!nome.trim()) {
      alert("Nome é obrigatório");
      return;
    }
    if (!email.trim()) {
      alert("Email é obrigatório");
      return;
    }
    if (!whatsapp.trim()) {
      alert("WhatsApp é obrigatório");
      return;
    }
    if (!unidadeId) {
      alert("Selecione uma unidade");
      return;
    }
    if (!modoEdicao && !senha.trim()) {
      alert("Senha é obrigatória para novo cadastro");
      return;
    }
    if (!modoEdicao && senha.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      setLoading(true);

      const unidadeSelecionada = unidades.find((u) => u.id === unidadeId);
      const dadosMorador: any = {
        nome,
        email,
        whatsapp,
        perfil,
        perfilMorador: perfil,
        unidadeId,
        unidadeNome: unidadeSelecionada?.identificacao || "",
        condominioId,
        role: "morador",
        ativo,
      };

      if (modoEdicao && moradorEditando) {
        await updateDoc(doc(db, "users", moradorEditando.id), {
          ...dadosMorador,
          atualizadoEm: serverTimestamp(),
        });
        alert("Morador atualizado com sucesso!");
      } else {
        // 1. Criar usuário no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;

        // 2. Salvar no Firestore com o UID
        await setDoc(doc(db, "users", uid), {
          ...dadosMorador,
          criadoEm: serverTimestamp(),
        });
        alert("Morador cadastrado com sucesso!");
      }

      setModalAberto(false);
      carregarMoradores();
    } catch (err) {
      console.error("❌ Erro ao salvar morador:", err);
      alert("Erro ao salvar morador");
    } finally {
      setLoading(false);
    }
  };

  const alternarStatus = async (morador: Morador) => {
    try {
      await updateDoc(doc(db, "users", morador.id), {
        ativo: !morador.ativo,
        atualizadoEm: serverTimestamp(),
      });
      carregarMoradores();
    } catch (err) {
      console.error("❌ Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  const excluirMorador = async (morador: Morador) => {
    if (!confirm(`Tem certeza que deseja excluir o morador "${morador.nome}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "users", morador.id));
      alert("Morador excluído com sucesso!");
      carregarMoradores();
    } catch (err) {
      console.error("❌ Erro ao excluir morador:", err);
      alert("Erro ao excluir morador");
    }
  };

  // Baixar modelo Excel
  const baixarModeloExcel = () => {
    const csv = `nome,email,whatsapp,perfil,unidadeId
João Silva,joao@email.com,81999999999,proprietario,COLE_O_ID_DA_UNIDADE_AQUI
Maria Santos,maria@email.com,81988888888,locatario,COLE_O_ID_DA_UNIDADE_AQUI
Pedro Costa,pedro@email.com,81977777777,dependente,COLE_O_ID_DA_UNIDADE_AQUI`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo-importacao-moradores.csv';
    link.click();
  };

  // Processar arquivo Excel/CSV
  const processarArquivoExcel = async () => {
    if (!arquivoExcel) {
      alert("Selecione um arquivo para importar");
      return;
    }

    try {
      setImportando(true);
      const texto = await arquivoExcel.text();
      const linhas = texto.split('\n').filter(l => l.trim());
      
      if (linhas.length < 2) {
        alert("Arquivo vazio ou sem dados");
        return;
      }

      const moradoresParaImportar = [];

      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(',').map(v => v.trim());
        
        const unidadeSelecionada = unidades.find((u) => u.id === valores[4]);
        
        const morador: any = {
          nome: valores[0],
          email: valores[1],
          whatsapp: valores[2],
          perfil: valores[3] || "proprietario",
          perfilMorador: valores[3] || "proprietario",
          unidadeId: valores[4],
          unidadeNome: unidadeSelecionada?.identificacao || "",
          condominioId,
          role: "morador",
          ativo: true,
          criadoEm: serverTimestamp(),
        };

        if (!morador.nome || !morador.email || !morador.whatsapp || !morador.unidadeId) {
          console.warn(`Linha ${i + 1}: dados incompletos, pulando...`);
          continue;
        }

        moradoresParaImportar.push(morador);
      }

      if (moradoresParaImportar.length === 0) {
        alert("Nenhum morador válido encontrado no arquivo");
        return;
      }

      // Importar em lote
      const batch = writeBatch(db);
      moradoresParaImportar.forEach((morador) => {
        const novoMoradorRef = doc(collection(db, "users"));
        batch.set(novoMoradorRef, morador);
      });

      await batch.commit();

      alert(`${moradoresParaImportar.length} moradores importados com sucesso!`);
      setModalImportacao(false);
      setArquivoExcel(null);
      carregarMoradores();
    } catch (err) {
      console.error("❌ Erro ao importar arquivo:", err);
      alert("Erro ao importar arquivo. Verifique o formato.");
    } finally {
      setImportando(false);
    }
  };

  const getNomeUnidade = (unidadeId: string) => {
    const unidade = unidades.find((u) => u.id === unidadeId);
    return unidade ? unidade.identificacao : "-";
  };

  const moradoresFiltrados = moradores.filter((morador) => {
    const matchBusca =
      morador.nome.toLowerCase().includes(busca.toLowerCase()) ||
      morador.email.toLowerCase().includes(busca.toLowerCase()) ||
      morador.whatsapp.includes(busca);
    const matchPerfil = filtroPerfil === "todos" || morador.perfil === filtroPerfil;
    const matchUnidade = filtroUnidadeId === "todos" || morador.unidadeId === filtroUnidadeId;
    return matchBusca && matchPerfil && matchUnidade;
  });

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
              {/* Perfil do usuário */}
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
        <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Moradores</h1>
              <p className="text-gray-600">Cadastre moradores e vincule às unidades</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModalImportacao(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importar Excel
            </button>
            <button
              onClick={abrirModalNovo}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <span className="text-xl">+</span>
              Novo Morador
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Morador
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome, email ou WhatsApp..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Perfil
            </label>
            <select
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              {PERFIS_MORADOR.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por Unidade
            </label>
            <select
              value={filtroUnidadeId}
              onChange={(e) => setFiltroUnidadeId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todas</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.identificacao} - {u.blocoSetor}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WhatsApp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {moradoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Nenhum morador encontrado
                  </td>
                </tr>
              ) : (
                moradoresFiltrados.map((morador) => (
                  <tr key={morador.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{morador.nome}</td>
                    <td className="px-6 py-4 text-gray-600">{morador.email}</td>
                    <td className="px-6 py-4 text-gray-600">{morador.whatsapp}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {PERFIS_MORADOR.find((p) => p.value === morador.perfil)?.label || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{getNomeUnidade(morador.unidadeId)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          morador.ativo
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {morador.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => abrirModalEditar(morador)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alternarStatus(morador)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        {morador.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluirMorador(morador)}
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
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {modoEdicao ? "Editar Morador" : "Novo Morador"}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="joao@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp *
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="81999999999"
                />
              </div>

              {!modoEdicao && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha *
                  </label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-xs text-gray-500 mt-1">Senha para login no sistema</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil *
                </label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  Bloco *
                </label>
                <select
                  value={blocoIdFormulario}
                  onChange={(e) => {
                    setBlocoIdFormulario(e.target.value);
                    setUnidadeId(""); // Limpa unidade ao trocar bloco
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione seu bloco</option>
                  {blocos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade *
                </label>
                <select
                  value={unidadeId}
                  onChange={(e) => setUnidadeId(e.target.value)}
                  disabled={!blocoIdFormulario}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione seu apartamento</option>
                  {unidades
                    .filter((u) => u.blocoId === blocoIdFormulario)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.identificacao}
                      </option>
                    ))}
                </select>
                {!blocoIdFormulario && (
                  <p className="text-xs text-gray-500 mt-1">
                    Selecione um bloco primeiro
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Morador ativo
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
                  onClick={salvarMorador}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importação Excel */}
      {modalImportacao && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Importar Moradores via Excel</h3>
              <button
                onClick={() => {
                  setModalImportacao(false);
                  setArquivoExcel(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>📊 Formato do arquivo:</strong>
                </p>
                <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                  <li>Arquivo CSV (separado por vírgulas)</li>
                  <li>Colunas: nome, email, whatsapp, perfil, unidadeId</li>
                  <li>Perfis válidos: proprietario, locatario, dependente, funcionario, outro</li>
                  <li>unidadeId: copie o ID da unidade da lista de unidades</li>
                </ul>
              </div>

              <div>
                <button
                  onClick={baixarModeloExcel}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Baixar Modelo CSV
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar Arquivo CSV
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setArquivoExcel(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {arquivoExcel && (
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ Arquivo selecionado: {arquivoExcel.name}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Esta ação irá criar múltiplos moradores de uma vez. Certifique-se de que o arquivo está correto antes de importar.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setModalImportacao(false);
                    setArquivoExcel(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={processarArquivoExcel}
                  disabled={!arquivoExcel || importando}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importando ? "Importando..." : "Importar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}