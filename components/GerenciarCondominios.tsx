"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  logoUrl?: string;
  status: "ativo" | "inativo";
  criadoEm?: any;
}

export default function GerenciarCondominios() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [condominioEditando, setCondominioEditando] = useState<Condominio | null>(null);

  // Carregar condomínios ao montar
  useEffect(() => {
    carregarCondominios();
  }, []);

  // Função para carregar condomínios
  const carregarCondominios = async () => {
    try {
      setLoading(true);

      const q = query(collection(db, "condominios"), orderBy("criadoEm", "desc"));
      const snapshot = await getDocs(q);

      const lista: Condominio[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || "",
        endereco: doc.data().endereco || "",
        logoUrl: doc.data().logoUrl || "",
        status: doc.data().status || "ativo",
        criadoEm: doc.data().criadoEm,
      }));

      setCondominios(lista);
      console.log("✅ Condomínios carregados:", lista.length);
    } catch (err) {
      console.error("❌ Erro ao carregar condomínios:", err);
      alert("Erro ao carregar condomínios");
    } finally {
      setLoading(false);
    }
  };

  // Função para salvar condomínio
  const salvarCondominio = async () => {
    try {
      // Validações
      if (!nome.trim()) {
        alert("Nome do condomínio é obrigatório");
        return;
      }

      if (!endereco.trim()) {
        alert("Endereço é obrigatório");
        return;
      }

      setLoading(true);

      if (condominioEditando) {
        // Atualizar condomínio existente
        await updateDoc(doc(db, "condominios", condominioEditando.id), {
          nome,
          endereco,
          logoUrl: logoUrl || "",
          atualizadoEm: serverTimestamp(),
        });
        console.log("✅ Condomínio atualizado:", condominioEditando.id);
        alert("Condomínio atualizado com sucesso!");
      } else {
        // Criar novo condomínio
        await addDoc(collection(db, "condominios"), {
          nome,
          endereco,
          logoUrl: logoUrl || "",
          status: "ativo",
          criadoEm: serverTimestamp(),
        });
        console.log("✅ Condomínio criado:", nome);
        alert("Condomínio cadastrado com sucesso!");
      }

      // Limpar formulário e recarregar
      limparFormulario();
      setModalAberto(false);
      await carregarCondominios();
    } catch (err) {
      console.error("❌ Erro ao salvar condomínio:", err);
      alert("Erro ao salvar condomínio");
    } finally {
      setLoading(false);
    }
  };

  // Função para editar condomínio
  const editarCondominio = (condominio: Condominio) => {
    setCondominioEditando(condominio);
    setNome(condominio.nome);
    setEndereco(condominio.endereco);
    setLogoUrl(condominio.logoUrl || "");
    setModalAberto(true);
  };

  // Função para alternar status
  const alternarStatus = async (condominio: Condominio) => {
    try {
      const novoStatus = condominio.status === "ativo" ? "inativo" : "ativo";
      await updateDoc(doc(db, "condominios", condominio.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
      console.log(`✅ Status alterado: ${condominio.nome} → ${novoStatus}`);
      await carregarCondominios();
    } catch (err) {
      console.error("❌ Erro ao alterar status:", err);
      alert("Erro ao alterar status");
    }
  };

  // Função para excluir condomínio
  const excluirCondominio = async (condominio: Condominio) => {
    if (
      !confirm(
        `Deseja realmente excluir o condomínio "${condominio.nome}"?\n\nIsso removerá todos os dados relacionados.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Excluir do Firestore
      await deleteDoc(doc(db, "condominios", condominio.id));
      console.log("✅ Condomínio excluído:", condominio.nome);

      alert("Condomínio excluído com sucesso!");
      await carregarCondominios();
    } catch (err) {
      console.error("❌ Erro ao excluir condomínio:", err);
      alert("Erro ao excluir condomínio");
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar formulário
  const limparFormulario = () => {
    setNome("");
    setEndereco("");
    setLogoUrl("");
    setCondominioEditando(null);
  };

  // Função para abrir modal de novo condomínio
  const abrirModalNovo = () => {
    limparFormulario();
    setModalAberto(true);
  };

  // Filtrar condomínios
  const condominiosFiltrados = condominios.filter((c) => {
    const matchBusca =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.endereco.toLowerCase().includes(busca.toLowerCase());

    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;

    return matchBusca && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h2 className="text-xl font-bold">Gerenciar Condomínios</h2>
        </div>
        <button
          onClick={abrirModalNovo}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Condomínio
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Buscar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Nome ou endereço..."
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
        </div>
      </div>

      {/* Listagem */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : condominiosFiltrados.length === 0 ? (
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-gray-500 font-medium">Nenhum condomínio encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Clique em "Novo Condomínio" para cadastrar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Logo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endereço
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
              {condominiosFiltrados.map((condominio) => (
                <tr key={condominio.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {condominio.logoUrl ? (
                      <img
                        src={condominio.logoUrl}
                        alt={condominio.nome}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{condominio.nome}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{condominio.endereco}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        condominio.status === "ativo"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {condominio.status === "ativo" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => editarCondominio(condominio)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarStatus(condominio)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      {condominio.status === "ativo" ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      onClick={() => excluirCondominio(condominio)}
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
                {condominioEditando ? "Editar Condomínio" : "Novo Condomínio"}
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
                  Nome do Condomínio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Edifício Domínio"
                />
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço Completo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Rua das Flores, 123, Centro - Recife/PE"
                  rows={3}
                />
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Logo (Opcional)
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="https://exemplo.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cole a URL de uma imagem hospedada online
                </p>
              </div>

              {/* Preview do Logo */}
              {logoUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                  <img
                    src={logoUrl}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
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
                onClick={salvarCondominio}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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