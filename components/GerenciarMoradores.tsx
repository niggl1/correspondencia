"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Upload,
  FileText,
  FileSpreadsheet,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { db, auth } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import BotaoVoltar from "@/components/BotaoVoltar";

// Bibliotecas de Exportação
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Props {
  condominioId?: string;
}

interface Morador {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  perfil: string;
  unidadeId: string;
  unidadeNome?: string;
  bloco?: string;
  blocoNome?: string;
  blocoId?: string;
  complemento?: string;
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

export default function GerenciarMoradores({ condominioId: adminCondominioId }: Props) {
  const { user } = useAuth();
  const [fetchedCondominioId, setFetchedCondominioId] = useState<string>("");

  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null);
  const [modalImportacao, setModalImportacao] = useState(false);

  // --- FILTROS ---
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [filtroBlocoId, setFiltroBlocoId] = useState("todos");
  const [filtroUnidadeId, setFiltroUnidadeId] = useState("todos");

  // Formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [perfil, setPerfil] = useState("proprietario");
  const [blocoSelecionado, setBlocoSelecionado] = useState("");
  const [numeroApartamento, setNumeroApartamento] = useState("");
  const [complemento, setComplemento] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [senha, setSenha] = useState("");

  const targetCondominioId = adminCondominioId || user?.condominioId || fetchedCondominioId;
  const backRoute = user?.role === "porteiro" ? "/dashboard-porteiro" : "/dashboard-responsavel";

  // Garantir ID do condomínio se não vier pelo hook
  useEffect(() => {
    async function garantirCondominioId() {
      if (user?.uid && !user.condominioId && !adminCondominioId) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setFetchedCondominioId(snap.data().condominioId);
          }
        } catch (error) {
          console.error("Erro ao buscar detalhes do usuário", error);
        }
      }
    }
    garantirCondominioId();
  }, [user, adminCondominioId]);

  useEffect(() => {
    if (targetCondominioId) {
      carregarDados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCondominioId]);

  const carregarDados = async () => {
    setLoading(true);
    await Promise.all([carregarBlocos(), carregarUnidades(), carregarMoradores()]);
    setLoading(false);
  };

  const carregarBlocos = async () => {
    try {
      const q = query(collection(db, "blocos"), where("condominioId", "==", targetCondominioId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Bloco[];
      // Ordenação Front-end
      setBlocos(data.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })));
    } catch (err) {
      console.error("Erro ao carregar blocos:", err);
    }
  };

  const carregarUnidades = async () => {
    try {
      const q = query(collection(db, "unidades"), where("condominioId", "==", targetCondominioId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Unidade[];
      setUnidades(data.sort((a, b) => a.identificacao.localeCompare(b.identificacao, "pt-BR", { numeric: true })));
    } catch (err) {
      console.error("Erro ao carregar unidades:", err);
    }
  };

  const carregarMoradores = async () => {
    try {
      const q = query(
        collection(db, "users"),
        where("condominioId", "==", targetCondominioId),
        where("role", "==", "morador")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Morador[];
      // Ordenação por criação (recente primeiro) ou nome
      setMoradores(data.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
    } catch (err) {
      console.error("Erro ao carregar moradores:", err);
    }
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setMoradorEditando(null);
    setNome("");
    setEmail("");
    setWhatsapp("");
    setPerfil("proprietario");
    setBlocoSelecionado("");
    setNumeroApartamento("");
    setComplemento("");
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
    setPerfil(morador.perfil || "proprietario");
    setAtivo(morador.ativo === true || String(morador.ativo) === "true");

    let blocoIdRestaurado = morador.blocoId || "";
    if (!blocoIdRestaurado) {
      const unidadeVinculada = unidades.find((u) => u.id === morador.unidadeId);
      if (unidadeVinculada?.blocoId) blocoIdRestaurado = unidadeVinculada.blocoId;
    }
    setBlocoSelecionado(blocoIdRestaurado);

    const unidadeVinculada = unidades.find((u) => u.id === morador.unidadeId);
    setNumeroApartamento(unidadeVinculada ? unidadeVinculada.identificacao : morador.unidadeNome || "");
    setComplemento(morador.complemento || "");
    setModalAberto(true);
  };

  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    const apenasNumeros = valor.replace(/[^0-9]/g, "");
    setNumeroApartamento(apenasNumeros);
  };

  const salvarMorador = async () => {
    if (!targetCondominioId) return;
    if (!nome.trim() || !email.trim() || !whatsapp.trim() || !blocoSelecionado || !numeroApartamento) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!modoEdicao && !senha.trim()) {
      alert("Senha é obrigatória para novos cadastros.");
      return;
    }

    try {
      setLoading(true);
      let unidadeIdFinal = "";
      const unidadeExistente = unidades.find(
        (u) => u.blocoId === blocoSelecionado && u.identificacao === numeroApartamento
      );

      const blocoObj = blocos.find((b) => b.id === blocoSelecionado);
      const nomeDoBloco = blocoObj ? blocoObj.nome : "";

      if (unidadeExistente) {
        unidadeIdFinal = unidadeExistente.id;
      } else {
        const novaUnidadeRef = await addDoc(collection(db, "unidades"), {
          identificacao: numeroApartamento,
          tipo: "apartamento",
          blocoId: blocoSelecionado,
          blocoSetor: nomeDoBloco,
          condominioId: targetCondominioId,
          status: "ocupado",
          proprietario: nome,
          criadoEm: serverTimestamp(),
        });
        unidadeIdFinal = novaUnidadeRef.id;
        // Atualiza estado local de unidades para refletir imediatamente
        setUnidades((prev) => [
          ...prev,
          {
            id: unidadeIdFinal,
            identificacao: numeroApartamento,
            tipo: "apartamento",
            blocoSetor: nomeDoBloco,
            blocoId: blocoSelecionado,
          } as Unidade,
        ]);
      }

      const dadosMorador: any = {
        nome: nome.trim(),
        email: email.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        perfil: perfil || "proprietario",
        perfilMorador: perfil || "proprietario",
        unidadeId: unidadeIdFinal,
        unidadeNome: numeroApartamento,
        blocoId: blocoSelecionado,
        blocoNome: nomeDoBloco,
        bloco: nomeDoBloco,
        complemento: complemento || "",
        condominioId: targetCondominioId,
        role: "morador",
        ativo: !!ativo,
      };

      if (modoEdicao && moradorEditando) {
        await updateDoc(doc(db, "users", moradorEditando.id), {
          ...dadosMorador,
          atualizadoEm: serverTimestamp(),
        });
        alert("Morador atualizado com sucesso!");
      } else {
        // ATENÇÃO: createUserWithEmailAndPassword desloga o admin atual.
        // Em um app real, ideal seria usar uma Cloud Function ou App Secundário.
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;
        await setDoc(doc(db, "users", uid), {
          ...dadosMorador,
          criadoEm: serverTimestamp(),
        });
        alert("Morador cadastrado! (Você pode ter sido desconectado por segurança)");
      }

      setModalAberto(false);
      carregarMoradores();
      if (!unidadeExistente) carregarUnidades();
    } catch (err: any) {
      console.error("Erro ao salvar morador:", err);
      alert("Erro ao salvar: " + (err.message || "Erro desconhecido"));
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
      console.error("Erro ao alterar status:", err);
      alert("Não foi possível alterar o status.");
    }
  };

  const excluirMorador = async (morador: Morador) => {
    if (!confirm(`Excluir ${morador.nome}? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteDoc(doc(db, "users", morador.id));
      carregarMoradores();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir morador.");
    }
  };

  const getNomeUnidade = (unidadeId: string) => {
    const unidade = unidades.find((u) => u.id === unidadeId);
    return unidade ? unidade.identificacao : "-";
  };

  const getNomePerfil = (valor: string) => {
    return PERFIS_MORADOR.find((p) => p.value === valor)?.label || valor;
  };

  // --- FILTRAGEM ---
  const moradoresFiltrados = useMemo(() => {
    return moradores.filter((morador) => {
      const termo = busca.toLowerCase();
      const matchBusca =
        morador.nome.toLowerCase().includes(termo) ||
        morador.email.toLowerCase().includes(termo) ||
        morador.whatsapp.includes(termo);

      const matchPerfil = filtroPerfil === "todos" || morador.perfil === filtroPerfil;
      const matchBloco = filtroBlocoId === "todos" || morador.blocoId === filtroBlocoId;
      const matchUnidade = filtroUnidadeId === "todos" || morador.unidadeId === filtroUnidadeId;

      return matchBusca && matchPerfil && matchBloco && matchUnidade;
    });
  }, [moradores, busca, filtroPerfil, filtroBlocoId, filtroUnidadeId]);

  const unidadesParaFiltro = useMemo(() => {
    return filtroBlocoId === "todos"
      ? unidades
      : unidades.filter((u) => u.blocoId === filtroBlocoId);
  }, [unidades, filtroBlocoId]);

  // --- EXPORTAÇÃO ---
  const gerarPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Relatório de Moradores", 14, 15);
    docPdf.setFontSize(10);
    
    let sub = `Gerado em: ${new Date().toLocaleDateString("pt-BR")} | Total: ${moradoresFiltrados.length}`;
    if(filtroBlocoId !== "todos") {
        const bl = blocos.find(b => b.id === filtroBlocoId)?.nome;
        sub += ` | Filtro: ${bl}`;
    }
    docPdf.text(sub, 14, 22);

    const body = moradoresFiltrados.map((m) => [
      m.nome,
      m.email,
      m.whatsapp,
      getNomePerfil(m.perfil),
      m.blocoNome || m.bloco || "-",
      getNomeUnidade(m.unidadeId),
      m.ativo ? "Ativo" : "Inativo",
    ]);

    autoTable(docPdf, {
      head: [["Nome", "Email", "WhatsApp", "Perfil", "Bloco", "Unidade", "Status"]],
      body,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 115, 33] }
    });
    docPdf.save("moradores.pdf");
  };

  const gerarExcel = () => {
    const dadosExcel = moradoresFiltrados.map((m) => ({
      Nome: m.nome,
      Email: m.email,
      WhatsApp: m.whatsapp,
      Perfil: getNomePerfil(m.perfil),
      Bloco: m.blocoNome || m.bloco || "-",
      Unidade: getNomeUnidade(m.unidadeId),
      Status: m.ativo ? "Ativo" : "Inativo",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Moradores");
    XLSX.writeFile(workbook, "moradores.xlsx");
  };

  if (loading && !targetCondominioId) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!targetCondominioId && !loading) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <XCircle className="text-red-500 mb-2" size={40} />
            <h3 className="text-lg font-bold text-gray-900">Nenhum Condomínio Identificado</h3>
            <p className="text-gray-500 mt-1">Não foi possível carregar os dados.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="w-fit">
        <BotaoVoltar url={backRoute} />
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Moradores</h1>
          <p className="text-gray-600 text-sm">Cadastre moradores e vincule às unidades</p>
        </div>

        {/* Botões de Ação */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full xl:w-auto">
          <button
            onClick={gerarPDF}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-sm transition-colors"
            title="Gerar PDF"
          >
            <FileText size={18} />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={gerarExcel}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors"
            title="Gerar Excel"
          >
            <FileSpreadsheet size={18} />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            onClick={() => setModalImportacao(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium shadow-sm"
          >
            <Upload size={18} />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={abrirModalNovo}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#057321] text-white rounded-lg hover:bg-[#046119] font-bold shadow-sm transition-colors"
          >
            <Plus size={20} /> Novo
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Morador</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Nome, email..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Perfil</label>
          <select
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Bloco</label>
          <select
            value={filtroBlocoId}
            onChange={(e) => {
              setFiltroBlocoId(e.target.value);
              setFiltroUnidadeId("todos");
            }}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Unidade</label>
          <select
            value={filtroUnidadeId}
            onChange={(e) => setFiltroUnidadeId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
          >
            <option value="todos">Todas as Unidades</option>
            {unidadesParaFiltro.map((u) => (
              <option key={u.id} value={u.id}>
                {u.identificacao} {filtroBlocoId === "todos" ? `- ${u.blocoSetor}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista Mobile */}
      <div className="md:hidden space-y-4">
        {moradoresFiltrados.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl text-gray-500">
            Nenhum morador encontrado
          </div>
        ) : (
          moradoresFiltrados.map((morador) => (
            <div
              key={morador.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{morador.nome}</h3>
                  <p className="text-sm text-gray-500 break-all">{morador.email}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-bold rounded-full ${
                    morador.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {morador.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                <div>
                  <span className="block text-xs text-gray-400 uppercase font-bold">Bloco</span>
                  <span className="font-medium">{morador.blocoNome || morador.bloco || "-"}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 uppercase font-bold">Unidade</span>
                  <span className="font-medium">{getNomeUnidade(morador.unidadeId)}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-xs text-gray-400 uppercase font-bold">Perfil</span>
                  <span>{PERFIS_MORADOR.find((p) => p.value === morador.perfil)?.label || "-"}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => abrirModalEditar(morador)}
                  className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100"
                >
                  <Edit2 size={16} /> Editar
                </button>
                <button
                  onClick={() => alternarStatus(morador)}
                  className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium ${
                    morador.ativo
                      ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {morador.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
                  {morador.ativo ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => excluirMorador(morador)}
                  className="flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tabela Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Perfil</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bloco</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {moradoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Nenhum morador encontrado
                  </td>
                </tr>
              ) : (
                moradoresFiltrados.map((morador) => (
                  <tr key={morador.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{morador.nome}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{morador.email}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{morador.whatsapp}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                        {PERFIS_MORADOR.find((p) => p.value === morador.perfil)?.label || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{morador.blocoNome || morador.bloco || "-"}</td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{getNomeUnidade(morador.unidadeId)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${
                          morador.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {morador.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => abrirModalEditar(morador)}
                        className="text-blue-600 hover:text-blue-900 font-bold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => alternarStatus(morador)}
                        className="text-yellow-600 hover:text-yellow-900 font-bold"
                      >
                        {morador.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluirMorador(morador)}
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modoEdicao ? "Editar Morador" : "Novo Morador"}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                  placeholder="João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                  placeholder="joao@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                  placeholder="81999999999"
                />
              </div>

              {!modoEdicao && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil *</label>
                <select
                  value={perfil}
                  onChange={(e) => setPerfil(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                >
                  {PERFIS_MORADOR.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bloco *</label>
                <select
                  value={blocoSelecionado}
                  onChange={(e) => setBlocoSelecionado(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                >
                  <option value="">Selecione o bloco</option>
                  {blocos.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número do Apartamento *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={numeroApartamento}
                  onChange={handleNumeroChange}
                  disabled={!blocoSelecionado}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 disabled:bg-gray-100 focus:ring-2 focus:ring-[#057321]"
                  placeholder="Ex: 101"
                />
                <p className="text-xs text-gray-500 mt-1">Digite apenas números.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento (Opcional)</label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321]"
                  placeholder="Ex: Fundos, Lado B..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={!!ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 text-[#057321] rounded focus:ring-2 focus:ring-[#057321]"
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
                  className="flex-1 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importação (Placeholder) */}
      {modalImportacao && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Importação de Excel</h2>
            <p className="text-gray-600 mb-4">Funcionalidade em manutenção para o novo formato.</p>
            <button
              onClick={() => setModalImportacao(false)}
              className="w-full px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
