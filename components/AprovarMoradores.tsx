"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, X, Trash2, Edit, UserCheck, Ban, Save } from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

interface MoradorPendente {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  perfil: string;
  unidadeId: string;
  unidadeNome?: string;
  numeroUnidade?: string;
  blocoId?: string;
  blocoNome?: string;
  condominioId: string;
  ativo: boolean;
  aprovado: boolean;
  criadoEm: any;
}

interface Bloco {
  id: string;
  nome: string;
}

export default function AprovarMoradores() {
  const router = useRouter();
  
  const { condominioId, user } = useAuth(); 
  
  const [moradoresPendentes, setMoradoresPendentes] = useState<MoradorPendente[]>([]);
  const [moradoresAprovados, setMoradoresAprovados] = useState<MoradorPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendentes" | "aprovados">("pendentes");
  const [blocos, setBlocos] = useState<Bloco[]>([]);

  // Estados do Modal de Edição
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [moradorEditando, setMoradorEditando] = useState<MoradorPendente | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editPerfil, setEditPerfil] = useState("");
  const [editBlocoId, setEditBlocoId] = useState("");
  const [editUnidade, setEditUnidade] = useState("");

  const PERFIS = [
    { value: "proprietario", label: "Proprietário" },
    { value: "locatario", label: "Locatário" },
    { value: "dependente", label: "Dependente" },
    { value: "funcionario", label: "Funcionário" },
    { value: "outro", label: "Outro" },
  ];

  useEffect(() => {
    if (condominioId) {
      carregarDados(condominioId);
    }
  }, [condominioId]);

  const carregarDados = async (condId: string) => {
    if (!condId) return;
    setLoading(true);
    try {
      const qBlocos = query(collection(db, "blocos"), where("condominioId", "==", condId));
      const snapBlocos = await getDocs(qBlocos);
      const listaBlocos = snapBlocos.docs.map(d => ({ id: d.id, nome: d.data().nome }));
      setBlocos(listaBlocos.sort((a, b) => a.nome.localeCompare(b.nome)));

      await carregarMoradores(condId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const carregarMoradores = async (condId: string) => {
    try {
      // Pendentes
      const qPendentes = query(
        collection(db, "moradores"),
        where("condominioId", "==", condId),
        where("aprovado", "==", false)
      );
      const snapPendentes = await getDocs(qPendentes);
      setMoradoresPendentes(snapPendentes.docs.map(doc => ({ id: doc.id, ...doc.data() } as MoradorPendente)));

      // Aprovados
      const qAprovados = query(
        collection(db, "moradores"),
        where("condominioId", "==", condId),
        where("aprovado", "==", true)
      );
      const snapAprovados = await getDocs(qAprovados);
      setMoradoresAprovados(snapAprovados.docs.map(doc => ({ id: doc.id, ...doc.data() } as MoradorPendente)));

    } catch (err) {
      console.error("Erro ao carregar:", err);
    }
  };

  // --- Funções de Ação ---

  const abrirModalEditar = (morador: MoradorPendente) => {
    setMoradorEditando(morador);
    setEditNome(morador.nome);
    setEditEmail(morador.email);
    setEditWhatsapp(morador.whatsapp);
    setEditPerfil(morador.perfil);
    setEditBlocoId(morador.blocoId || "");
    setEditUnidade(morador.numeroUnidade || morador.unidadeNome || "");
    setModalEditarAberto(true);
  };

  const salvarEdicao = async () => {
    if (!moradorEditando) return;
    try {
      const blocoSelecionado = blocos.find(b => b.id === editBlocoId);
      
      const updates: any = {
        nome: editNome,
        email: editEmail,
        whatsapp: editWhatsapp,
        perfil: editPerfil,
        blocoId: editBlocoId,
        blocoNome: blocoSelecionado?.nome || "",
        numeroUnidade: editUnidade,
        unidadeNome: editUnidade,
      };

      await updateDoc(doc(db, "moradores", moradorEditando.id), updates);
      setModalEditarAberto(false);
      setMoradorEditando(null);
      alert("Dados atualizados com sucesso!");
      await carregarMoradores(condominioId);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar edição.");
    }
  };

  const aprovarMorador = async (morador: MoradorPendente) => {
    if (!confirm(`Aprovar cadastro de ${morador.nome}?`)) return;
    try {
      await updateDoc(doc(db, "moradores", morador.id), {
        aprovado: true,
        ativo: true,
        aprovedoEm: new Date(),
      });
      await carregarMoradores(condominioId);
    } catch (err) {
      alert("Erro ao aprovar morador");
    }
  };

  const excluirMorador = async (morador: MoradorPendente) => {
    const msg = morador.aprovado 
      ? `Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o morador ${morador.nome}?` 
      : `Tem certeza que deseja REJEITAR o cadastro de ${morador.nome}?`;
      
    if (!confirm(msg)) return;

    try {
      await deleteDoc(doc(db, "moradores", morador.id));
      await carregarMoradores(condominioId);
    } catch (err) {
      alert("Erro ao excluir morador");
    }
  };

  const toggleStatus = async (morador: MoradorPendente) => {
    if (!confirm(`${morador.ativo ? "Desativar" : "Ativar"} ${morador.nome}?`)) return;
    try {
      await updateDoc(doc(db, "moradores", morador.id), { ativo: !morador.ativo });
      await carregarMoradores(condominioId);
    } catch { alert("Erro"); }
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321]"></div>
      </div>
    );
  }

  const listaAtual = filtro === "pendentes" ? moradoresPendentes : moradoresAprovados;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 mt-8 pb-12">
        
        {/* Botão Voltar */}
        <button 
          onClick={() => router.push('/dashboard-responsavel')}
          className="group flex items-center gap-3 bg-white text-gray-700 px-6 py-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#057321] hover:text-[#057321] transition-all duration-200 font-bold mb-10 text-lg"
        >
          <ArrowLeft size={24} className="text-gray-500 group-hover:text-[#057321] transition-colors" />
          Voltar para Dashboard
        </button>

        {/* Cabeçalho */}
        <div className="mb-8 flex items-center gap-3">
          <div className="text-4xl">✅</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Aprovar Moradores</h1>
            <p className="text-gray-600">Gerencie solicitações de cadastro e acessos</p>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-4 border-b pb-2">
            <button
              onClick={() => setFiltro("pendentes")}
              className={`pb-2 px-4 text-sm font-medium transition-all relative ${
                filtro === "pendentes"
                  ? "text-yellow-600 border-b-2 border-yellow-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Pendentes <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs ml-2">{moradoresPendentes.length}</span>
            </button>
            <button
              onClick={() => setFiltro("aprovados")}
              className={`pb-2 px-4 text-sm font-medium transition-all relative ${
                filtro === "aprovados"
                  ? "text-green-600 border-b-2 border-green-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Aprovados <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs ml-2">{moradoresAprovados.length}</span>
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          {listaAtual.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Contato</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Unidade</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase">Perfil</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listaAtual.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{m.nome}</div>
                        {m.aprovado && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {m.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-600">{m.email}</div>
                        <div className="text-gray-500 text-xs">{m.whatsapp}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{m.numeroUnidade || m.unidadeNome}</span>
                        {m.blocoNome && <div className="text-xs text-gray-400">{m.blocoNome}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs border border-purple-100">
                          {m.perfil}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirModalEditar(m)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                            title="Editar Dados"
                          >
                            <Edit size={18} />
                          </button>

                          {!m.aprovado && (
                            <>
                              <button
                                onClick={() => aprovarMorador(m)}
                                className="p-2 bg-green-50 text-green-600 rounded-lg border border-green-100 hover:bg-green-100 transition-colors"
                                title="Aprovar"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={() => excluirMorador(m)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                                title="Rejeitar"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}

                          {m.aprovado && (
                            <>
                              <button
                                onClick={() => toggleStatus(m)}
                                className={`p-2 rounded-lg border transition-colors ${
                                  m.ativo 
                                    ? "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100"
                                    : "bg-green-50 text-green-600 border-green-100 hover:bg-green-100"
                                }`}
                                title={m.ativo ? "Bloquear Acesso" : "Liberar Acesso"}
                              >
                                {m.ativo ? <Ban size={18} /> : <UserCheck size={18} />}
                              </button>
                              
                              <button
                                onClick={() => excluirMorador(m)}
                                className="p-2 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Excluir Registro"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Editar */}
      {modalEditarAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Editar Morador</h3>
              <button onClick={() => setModalEditarAberto(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#057321]" value={editNome} onChange={e => setEditNome(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#057321]" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Whatsapp</label>
                <input className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-[#057321]" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bloco</label>
                  <select className="w-full border rounded-lg p-2.5 bg-white" value={editBlocoId} onChange={e => setEditBlocoId(e.target.value)}>
                    <option value="">-</option>
                    {blocos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <input className="w-full border rounded-lg p-2.5" value={editUnidade} onChange={e => setEditUnidade(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select className="w-full border rounded-lg p-2.5 bg-white" value={editPerfil} onChange={e => setEditPerfil(e.target.value)}>
                  {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3">
              <button onClick={() => setModalEditarAberto(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors">Cancelar</button>
              <button onClick={salvarEdicao} className="flex-1 py-2.5 bg-[#057321] text-white rounded-lg font-medium hover:bg-[#046019] transition-colors flex justify-center gap-2"><Save size={18} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}