"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogOut, User, Building2, Home, Users, Clock, Plus, List, FileText, UserPlus, Settings } from "lucide-react";
import GerarFolder from "@/components/GerarFolder";
import { signOut } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useCorrespondencias } from "@/hooks/useCorrespondencias";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import CorrespondenciaTable, { Linha } from "@/components/CorrespondenciaTable";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import withAuth from "@/components/withAuth";

function CorrespondenciasResponsavelPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    listarCorrespondencias,
    registrarRetirada,
    getPorteiroAssinaturaUrl,
    gerarSegundaVia,
    marcarComoCompartilhado,
    loading,
  } = useCorrespondencias();
  const [dados, setDados] = useState<Linha[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<"criado" | "retirado">("criado");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // Estados para controlar o modal profissional
  const [modalAberto, setModalAberto] = useState(false);
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<any>(null);

  const carregar = async () => {
    console.time("⏱️ Tempo de carregamento");
    
    const lista = await listarCorrespondencias();
    console.log("📦 Correspondências recebidas:", lista.length);

    // Consultas Paralelas
    const promessas = lista.map(async (c: any) => {
      // Se já tem os dados desnormalizados, usa eles
      if (c.moradorNome && c.blocoNome && c.apartamento) {
        return {
          id: c.id!,
          protocolo: c.protocolo || "",
          moradorNome: c.moradorNome || "",
          apartamento: c.apartamento || "",
          blocoNome: c.blocoNome || "",
          condominioId: c.condominioId || "",
          status: c.status || "pendente",
          imagemUrl: c.imagemUrl || "",
          pdfUrl: c.pdfUrl || "",
          reciboUrl: c.reciboUrl || "",
          criadoEm: c.criadoEm || null,
          retiradoEm: c.retiradoEm || null,
          compartilhadoVia: c.compartilhadoVia || [],
        } as Linha;
      }

      // Se não tem, busca em paralelo (fallback para dados antigos)
      let moradorNome = "";
      let apartamento = "";
      let blocoNome = "";

      try {
        const promessas = [];
        
        if (c.moradorId) {
          promessas.push(getDoc(doc(db, "users", c.moradorId)));
        } else {
          promessas.push(Promise.resolve(null));
        }
        
        if (c.blocoId) {
          promessas.push(getDoc(doc(db, "blocos", c.blocoId)));
        } else {
          promessas.push(Promise.resolve(null));
        }
        
        const [mSnap, bSnap] = await Promise.all(promessas);

        if (mSnap && mSnap.exists()) {
          moradorNome = (mSnap.data()?.nome as string) || "";
          apartamento = (mSnap.data()?.apartamento as string) || "";
        }

        if (bSnap && bSnap.exists()) {
          blocoNome = (bSnap.data()?.nome as string) || "";
        }
      } catch (err) {
        console.error("❌ Erro ao buscar dados:", err);
      }

      return {
        id: c.id!,
        protocolo: c.protocolo || "",
        moradorNome: moradorNome || "",
        apartamento: apartamento || "",
        blocoNome: blocoNome || "",
        condominioId: c.condominioId || "",
        status: c.status || "pendente",
        imagemUrl: c.imagemUrl || "",
        pdfUrl: c.pdfUrl || "",
        reciboUrl: c.reciboUrl || "",
        criadoEm: c.criadoEm || null,
        retiradoEm: c.retiradoEm || null,
        compartilhadoVia: c.compartilhadoVia || [],
      } as Linha;
    });

    // Executa todas as promessas em paralelo
    const ricos = await Promise.all(promessas);
    
    console.timeEnd("⏱️ Tempo de carregamento");
    console.log("✅ Dados processados:", ricos.length);
    
    setDados(ricos);
  };

  useEffect(() => {
    carregar();
  }, []);

  /** filtro de datas */
  const filtrados = dados.filter((d) => {
    let dataRef: Timestamp | null = null;
    if (tipoFiltro === "criado") dataRef = d.criadoEm;
    else if (tipoFiltro === "retirado") dataRef = d.retiradoEm;

    if (!dataRef) return true;

    const dataJS = dataRef.toDate();
    const ini = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;
    if (ini && dataJS < ini) return false;
    if (fim && dataJS > fim) return false;
    return true;
  });

  // Função para abrir o modal profissional
  const abrirModalRetirada = (linha: Linha) => {
    // Converte Linha para formato de correspondência
    const correspondencia = {
      id: linha.id,
      protocolo: linha.protocolo,
      moradorNome: linha.moradorNome,
      apartamento: linha.apartamento,
      blocoNome: linha.blocoNome,
      condominioId: linha.condominioId,
      status: linha.status,
      imagemUrl: linha.imagemUrl,
      pdfUrl: linha.pdfUrl,
      reciboUrl: linha.reciboUrl,
      criadoEm: linha.criadoEm,
      retiradoEm: linha.retiradoEm,
    };

    setCorrespondenciaSelecionada(correspondencia);
    setModalAberto(true);
  };

  const onRetirar = async (
    linha: Linha,
    moradorAssDataUrl: string,
    porteiroAssDataUrl?: string,
    salvarPadrao?: boolean
  ) => {
    let condominioNome = "";
    try {
      const c = await getDoc(doc(db, "condominios", linha.condominioId));
      condominioNome = (c.data()?.nome as string) || "";
    } catch {}

    const res = await registrarRetirada(
      {
        id: linha.id,
        condominioId: linha.condominioId,
        protocolo: linha.protocolo,
        condominioNome,
        blocoNome: linha.blocoNome,
        moradorNome: linha.moradorNome,
        apartamento: linha.apartamento,
      },
      {
        moradorDataUrl: moradorAssDataUrl,
        porteiroDataUrl: porteiroAssDataUrl,
        salvarPorteiroComoPadrao: salvarPadrao,
      }
    );

    if (res) {
      setDados((ant) =>
        ant.map((x) =>
          x.id === linha.id
            ? { ...x, status: "retirada", reciboUrl: res.reciboUrl, retiradoEm: Timestamp.now() }
            : x
        )
      );
    }
    return res;
  };

  const onSegundaVia = async (linha: Linha) => {
    const tipo = linha.status === "pendente" ? "aviso" : "recibo";
    const res = await gerarSegundaVia(linha.id, tipo);
    if (res) {
      alert(`Segunda via gerada com sucesso!`);
      carregar();
    }
  };

  // Callback de sucesso do modal profissional
  const handleRetiradaSuccess = () => {
    setModalAberto(false);
    setCorrespondenciaSelecionada(null);
    carregar(); // Recarrega a lista
  };

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
              {user && (
                <button
                  onClick={() => router.push("/minha-conta")}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <span className="text-sm">Perfil: <span className="font-semibold">{getRoleLabel(user.role)}</span></span>
                  <span className="text-sm font-medium">👤 {user.nome}</span>
                </button>
              )}
              
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
        {/* Boas-vindas */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo, {user?.nome}!
          </h1>
          <p className="text-gray-600">
            Painel de controle do responsável pelo condomínio
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => router.push("/dashboard-responsavel/nova-correspondencia")}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"
          >
            <Plus size={20} />
            Aviso de Correspondência
          </button>
          <button
            onClick={() => router.push("/dashboard-responsavel/correspondencias")}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"
          >
            <List size={20} />
            Avisos Enviados
          </button>
          <GerarFolder
            condominioId={user?.condominioId || ""}
            condominioNome={user?.condominioNome || ""}
            condominioEndereco={user?.condominioEndereco}
            responsavelNome={user?.nome}
          />
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Blocos</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <div className="bg-primary-600 rounded-full p-3">
                <Building2 className="text-white" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Unidades</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <div className="bg-primary-600 rounded-full p-3">
                <Home className="text-white" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Moradores</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <div className="bg-primary-600 rounded-full p-3">
                <Users className="text-white" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pendentes Aprovação</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
              <div className="bg-primary-600 rounded-full p-3">
                <Clock className="text-white" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas - Cards reordenados conforme solicitado */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Gerenciar Moradores */}
            <button
              onClick={() => router.push("/dashboard-responsavel/moradores")}
              className="flex items-center gap-3 p-4 bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-sm"
            >
              <div className="bg-white rounded-full p-2">
                <Users className="text-primary-600" size={20} />
              </div>
              <span className="font-medium text-white">Gerenciar Moradores</span>
            </button>

            {/* 2. Gerenciar Porteiros */}
            <button
              onClick={() => router.push("/dashboard-responsavel/porteiros")}
              className="flex items-center gap-3 p-4 bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-sm"
            >
              <div className="bg-white rounded-full p-2">
                <UserPlus className="text-primary-600" size={20} />
              </div>
              <span className="font-medium text-white">Gerenciar Porteiros</span>
            </button>

            {/* 3. Gerenciar Blocos */}
            <button
              onClick={() => router.push("/dashboard-responsavel/blocos")}
              className="flex items-center gap-3 p-4 bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-sm"
            >
              <div className="bg-white rounded-full p-2">
                <Building2 className="text-primary-600" size={20} />
              </div>
              <span className="font-medium text-white">Gerenciar Blocos</span>
            </button>

            {/* 4. Gerenciar Unidades */}
            <button
              onClick={() => router.push("/dashboard-responsavel/unidades")}
              className="flex items-center gap-3 p-4 bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-sm"
            >
              <div className="bg-white rounded-full p-2">
                <Home className="text-primary-600" size={20} />
              </div>
              <span className="font-medium text-white">Gerenciar Unidades</span>
            </button>

            {/* 5. Aprovar Moradores */}
            <button
              onClick={() => router.push("/dashboard-responsavel/aprovacoes")}
              className="flex items-center gap-3 p-4 bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-sm"
            >
              <div className="bg-white rounded-full p-2">
                <Clock className="text-primary-600" size={20} />
              </div>
              <span className="font-medium text-white">Aprovar Moradores</span>
            </button>

            {/* 6. Configurações de Retirada */}
            <button
              onClick={() => router.push("/dashboard-responsavel/configuracoes-retirada")}
              className="flex items-center gap-3 p-4 bg-primary-600 rounded-lg hover:bg-primary-700 transition-all shadow-sm"
            >
              <div className="bg-white rounded-full p-2">
                <Settings className="text-primary-600" size={20} />
              </div>
              <span className="font-medium text-white">Configurações de Retirada</span>
            </button>
          </div>
        </div>

        {/* Seção de Correspondências */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Correspondências</h2>

      {/* Filtros de data */}
      <div className="bg-white border rounded p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="border rounded px-3 py-2"
          >
            <option value="criado">Criadas</option>
            <option value="retirado">Retiradas</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Até</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={carregar}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded transition"
        >
          Atualizar
        </button>
      </div>

      {/* tabela */}
      <CorrespondenciaTable
        dados={filtrados}
        onRetirar={onRetirar}
        carregando={loading}
        getPorteiroAssinaturaUrl={() => getPorteiroAssinaturaUrl((null as any))}
        onCompartilhar={async (id, via, pdfUrl, protocolo, moradorNome) => {
          // Marca como compartilhado no Firestore
          const sucesso = await marcarComoCompartilhado(id, via);
          if (sucesso) {
            // Atualiza a lista localmente
            setDados((ant) =>
              ant.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      compartilhadoVia: [
                        ...(x.compartilhadoVia || []),
                        via,
                      ].filter((v, i, arr) => arr.indexOf(v) === i), // Remove duplicatas
                    }
                  : x
              )
            );
          }
        }}
        onAbrirModalRetirada={abrirModalRetirada}
      />
        </div>

      {/* Modal profissional de retirada */}
      {modalAberto && correspondenciaSelecionada && (
        <ModalRetiradaProfissional
          correspondencia={correspondenciaSelecionada}
          onClose={() => {
            setModalAberto(false);
            setCorrespondenciaSelecionada(null);
          }}
          onSuccess={handleRetiradaSuccess}
        />
      )}
      </main>
    </div>
  );
}

// Protege a rota para responsável, admin e adminMaster
export default withAuth(CorrespondenciasResponsavelPage, ["responsavel", "admin", "adminMaster"]);