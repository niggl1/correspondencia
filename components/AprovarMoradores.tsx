"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";

interface MoradorPendente {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  perfil: string;
  unidadeId: string;
  unidadeNome?: string;
  blocoId?: string;
  condominioId: string;
  ativo: boolean;
  aprovado: boolean;
  criadoEm: any;
}

export default function AprovarMoradores() {
  const [authChecked, setAuthChecked] = useState(false);
  const [condominioId, setCondominioId] = useState("");
  const [moradoresPendentes, setMoradoresPendentes] = useState<MoradorPendente[]>([]);
  const [moradoresAprovados, setMoradoresAprovados] = useState<MoradorPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"pendentes" | "aprovados">("pendentes");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth as any, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCondominioId(userData.condominioId || "");
          await carregarMoradores(userData.condominioId);
        }
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  const carregarMoradores = async (condId: string) => {
    if (!condId) return;

    try {
      setLoading(true);

      // Buscar moradores pendentes
      const qPendentes = query(
        collection(db, "moradores"),
        where("condominioId", "==", condId),
        where("aprovado", "==", false)
      );

      const snapshotPendentes = await getDocs(qPendentes);
      const pendentes = snapshotPendentes.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MoradorPendente[];

      setMoradoresPendentes(pendentes);

      // Buscar moradores aprovados
      const qAprovados = query(
        collection(db, "moradores"),
        where("condominioId", "==", condId),
        where("aprovado", "==", true)
      );

      const snapshotAprovados = await getDocs(qAprovados);
      const aprovados = snapshotAprovados.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MoradorPendente[];

      setMoradoresAprovados(aprovados);
    } catch (err) {
      console.error("❌ Erro ao carregar moradores:", err);
      alert("Erro ao carregar moradores");
    } finally {
      setLoading(false);
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

      alert(`✅ ${morador.nome} foi aprovado com sucesso!`);
      await carregarMoradores(condominioId);
    } catch (err) {
      console.error("Erro ao aprovar:", err);
      alert("Erro ao aprovar morador");
    }
  };

  const rejeitarMorador = async (morador: MoradorPendente) => {
    if (!confirm(`Rejeitar cadastro de ${morador.nome}?\n\nEsta ação não pode ser desfeita.`))
      return;

    try {
      // Deletar morador do Firestore
      await deleteDoc(doc(db, "moradores", morador.id));

      alert(`❌ Cadastro de ${morador.nome} foi rejeitado e removido.`);
      await carregarMoradores(condominioId);
    } catch (err) {
      console.error("Erro ao rejeitar:", err);
      alert("Erro ao rejeitar morador");
    }
  };

  const desativarMorador = async (morador: MoradorPendente) => {
    if (!confirm(`Desativar ${morador.nome}?`)) return;

    try {
      await updateDoc(doc(db, "moradores", morador.id), {
        ativo: false,
      });

      alert(`🔒 ${morador.nome} foi desativado.`);
      await carregarMoradores(condominioId);
    } catch (err) {
      console.error("Erro ao desativar:", err);
      alert("Erro ao desativar morador");
    }
  };

  const ativarMorador = async (morador: MoradorPendente) => {
    if (!confirm(`Ativar ${morador.nome}?`)) return;

    try {
      await updateDoc(doc(db, "moradores", morador.id), {
        ativo: true,
      });

      alert(`✅ ${morador.nome} foi ativado.`);
      await carregarMoradores(condominioId);
    } catch (err) {
      console.error("Erro ao ativar:", err);
      alert("Erro ao ativar morador");
    }
  };

  if (!authChecked || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const moradoresExibidos = filtro === "pendentes" ? moradoresPendentes : moradoresAprovados;

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-4xl">✅</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Aprovar Moradores</h1>
            <p className="text-gray-600">Gerencie solicitações de cadastro</p>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Pendentes de Aprovação</p>
              <p className="text-3xl font-bold text-yellow-800">{moradoresPendentes.length}</p>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Aprovados</p>
              <p className="text-3xl font-bold text-green-800">{moradoresAprovados.length}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltro("pendentes")}
            className={`px-4 py-2 rounded-lg font-medium ${
              filtro === "pendentes"
                ? "bg-yellow-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pendentes ({moradoresPendentes.length})
          </button>
          <button
            onClick={() => setFiltro("aprovados")}
            className={`px-4 py-2 rounded-lg font-medium ${
              filtro === "aprovados"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Aprovados ({moradoresAprovados.length})
          </button>
        </div>
      </div>

      {/* Lista de moradores */}
      <div className="bg-white rounded-lg shadow-sm border">
        {moradoresExibidos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filtro === "pendentes"
              ? "Nenhum morador pendente de aprovação"
              : "Nenhum morador aprovado"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    WhatsApp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Perfil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Unidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {moradoresExibidos.map((morador) => (
                  <tr key={morador.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{morador.nome}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {morador.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {morador.whatsapp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {morador.perfil}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {morador.unidadeNome || morador.unidadeId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {morador.aprovado ? (
                        morador.ativo ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                            Inativo
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!morador.aprovado ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => aprovarMorador(morador)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => rejeitarMorador(morador)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Rejeitar
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {morador.ativo ? (
                            <button
                              onClick={() => desativarMorador(morador)}
                              className="text-orange-600 hover:text-orange-800 font-medium"
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              onClick={() => ativarMorador(morador)}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Ativar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}