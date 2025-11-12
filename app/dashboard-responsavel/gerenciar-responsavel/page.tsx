"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/app/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Home,
  X,
  Save
} from "lucide-react";
import withAuth from "@/components/withAuth";

interface Morador {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  apartamento: string;
  bloco?: string;
  ativo: boolean;
}

function GerenciarMoradoresPage() {
  const { user } = useAuth();
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal de adicionar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    apartamento: "",
    bloco: "",
    ativo: true,
  });

  // Modal de confirmação de exclusão
  const [modalExcluir, setModalExcluir] = useState(false);
  const [moradorExcluir, setMoradorExcluir] = useState<Morador | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    carregarMoradores();
  }, [user]);

  const carregarMoradores = async () => {
    if (!user?.condominioId) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, "users"),
        where("condominioId", "==", user.condominioId),
        where("role", "==", "morador")
      );

      const snapshot = await getDocs(q);
      const dados = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Morador[];

      setMoradores(dados);
    } catch (err) {
      console.error("Erro ao carregar moradores:", err);
      setError("Erro ao carregar moradores");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalNovo = () => {
    setMoradorEditando(null);
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      apartamento: "",
      bloco: "",
      ativo: true,
    });
    setModalAberto(true);
    setError("");
  };

  const abrirModalEditar = (morador: Morador) => {
    setMoradorEditando(morador);
    setFormData({
      nome: morador.nome,
      email: morador.email,
      telefone: morador.telefone,
      apartamento: morador.apartamento,
      bloco: morador.bloco || "",
      ativo: morador.ativo,
    });
    setModalAberto(true);
    setError("");
  };

  const handleSalvar = async () => {
    if (!user?.condominioId) return;

    if (!formData.nome || !formData.email || !formData.apartamento) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (moradorEditando) {
        // Atualizar morador existente
        const moradorRef = doc(db, "users", moradorEditando.id);
        await updateDoc(moradorRef, {
          nome: formData.nome,
          telefone: formData.telefone,
          apartamento: formData.apartamento,
          bloco: formData.bloco,
          ativo: formData.ativo,
        });
        setMessage("Morador atualizado com sucesso!");
      } else {
        // Adicionar novo morador
        await addDoc(collection(db, "users"), {
          nome: formData.nome,
          email: formData.email,
          telefone: formData.telefone,
          apartamento: formData.apartamento,
          bloco: formData.bloco,
          ativo: formData.ativo,
          role: "morador",
          condominioId: user.condominioId,
          criadoEm: new Date().toISOString(),
        });
        setMessage("Morador cadastrado com sucesso!");
      }

      setModalAberto(false);
      await carregarMoradores();
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar morador:", err);
      setError("Erro ao salvar morador. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const confirmarExclusao = (morador: Morador) => {
    setMoradorExcluir(morador);
    setModalExcluir(true);
  };

  const handleExcluir = async () => {
    if (!moradorExcluir) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, "users", moradorExcluir.id));
      setMessage("Morador excluído com sucesso!");
      setModalExcluir(false);
      setMoradorExcluir(null);
      await carregarMoradores();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Erro ao excluir morador:", err);
      setError("Erro ao excluir morador");
    } finally {
      setLoading(false);
    }
  };

  const moradoresFiltrados = moradores.filter((morador) => {
    const termo = searchTerm.toLowerCase();
    return (
      morador.nome.toLowerCase().includes(termo) ||
      morador.email.toLowerCase().includes(termo) ||
      morador.apartamento.toLowerCase().includes(termo) ||
      (morador.bloco && morador.bloco.toLowerCase().includes(termo))
    );
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users size={32} className="text-primary-600" />
            Gerenciar Moradores
          </h1>
          <p className="text-gray-600 mt-1">Cadastre e gerencie os moradores do condomínio</p>
        </div>

        {/* Mensagens */}
        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            {message}
          </div>
        )}
        {error && !modalAberto && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Barra de ações */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, email, apartamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition whitespace-nowrap"
          >
            <Plus size={20} />
            Novo Morador
          </button>
        </div>

        {/* Tabela de Moradores */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading && moradores.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando moradores...</p>
            </div>
          ) : moradoresFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Nenhum morador encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      Telefone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {moradoresFiltrados.map((morador) => (
                    <tr key={morador.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                            <Users size={20} className="text-primary-600" />
                          </div>
                          <div className="font-medium text-gray-900">{morador.nome}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Mail size={16} className="mr-2" />
                          {morador.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone size={16} className="mr-2" />
                          {morador.telefone || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Home size={16} className="mr-2" />
                          {morador.bloco ? `${morador.bloco} - ` : ""}Apto {morador.apartamento}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            morador.ativo
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {morador.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => abrirModalEditar(morador)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => confirmarExclusao(morador)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="mt-4 text-sm text-gray-600">
          Total: {moradoresFiltrados.length} morador(es)
        </div>

        {/* Modal Adicionar/Editar */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {moradorEditando ? "Editar Morador" : "Novo Morador"}
                </h3>
                <button
                  onClick={() => setModalAberto(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nome do morador"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!moradorEditando}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="email@exemplo.com"
                  />
                  {moradorEditando && (
                    <p className="text-xs text-gray-500 mt-1">
                      O email não pode ser alterado
                    </p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                {/* Bloco e Apartamento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bloco
                    </label>
                    <input
                      type="text"
                      value={formData.bloco}
                      onChange={(e) => setFormData({ ...formData, bloco: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="A, B, C..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apartamento *
                    </label>
                    <input
                      type="text"
                      value={formData.apartamento}
                      onChange={(e) => setFormData({ ...formData, apartamento: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="101, 202..."
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                    Morador ativo
                  </label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Save size={18} />
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Confirmar Exclusão */}
        {modalExcluir && moradorExcluir && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja excluir o morador <strong>{moradorExcluir.nome}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModalExcluir(false);
                    setMoradorExcluir(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {loading ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(GerenciarMoradoresPage, ["responsavel", "admin", "adminMaster"]);