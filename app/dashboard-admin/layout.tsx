"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Image from "next/image";
import { Home, Building2, Users, Building, Grid3x3, UserCheck, DoorOpen, CheckCircle } from "lucide-react";

export default function DashboardAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [condominios, setCondominios] = useState<any[]>([]);
  const [condominioSelecionado, setCondominioSelecionado] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCondominios();
  }, []);

  const carregarCondominios = async () => {
    try {
      const snapshot = await getDocs(collection(db, "condominios"));
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCondominios(lista);
      
      // Selecionar o primeiro condomínio por padrão
      if (lista.length > 0) {
        const salvo = localStorage.getItem("condominioSelecionado");
        setCondominioSelecionado(salvo || lista[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar condomínios:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCondominioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoId = e.target.value;
    setCondominioSelecionado(novoId);
    localStorage.setItem("condominioSelecionado", novoId);
    // Recarregar a página para atualizar os dados
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Padrão Verde */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Image
                src="/logo-app-correspondencia.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="font-bold text-primary-600 text-lg">APP CORRESPONDÊNCIA</span>
            </div>

            {/* Perfil e Sair */}
            <div className="flex items-center space-x-6">
              <span className="text-gray-600 text-sm font-medium">
                Perfil: <span className="font-semibold text-gray-800">Admin Master</span>
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("condominioSelecionado");
                  window.location.href = "/login";
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Conteúdo com padding para navbar fixa */}
      <div className="pt-14">
        <div className="container mx-auto px-6 py-6">
          {/* Seleção de Condomínio */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Condomínio:
            </label>
            {loading ? (
              <div className="text-sm text-gray-500">Carregando condomínios...</div>
            ) : (
              <select
                value={condominioSelecionado}
                onChange={handleCondominioChange}
                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Selecione um condomínio</option>
                {condominios.map((cond) => (
                  <option key={cond.id} value={cond.id}>
                    {cond.nome} - CNPJ: {cond.cnpj}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Menu de Navegação Estilizado */}
          {condominioSelecionado && (
            <div className="mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a
                  href="/dashboard-admin"
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Home className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Dashboard
                    </span>
                  </div>
                </a>

                <a
                  href="/dashboard-admin/condominios"
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Condomínios
                    </span>
                  </div>
                </a>

                <a
                  href="/dashboard-admin/responsaveis"
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Responsáveis
                    </span>
                  </div>
                </a>

                <a
                  href={`/dashboard-admin/blocos?condominio=${condominioSelecionado}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Building className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Blocos
                    </span>
                  </div>
                </a>

                <a
                  href={`/dashboard-admin/unidades?condominio=${condominioSelecionado}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <Grid3x3 className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Unidades
                    </span>
                  </div>
                </a>

                <a
                  href={`/dashboard-admin/moradores?condominio=${condominioSelecionado}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <UserCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Moradores
                    </span>
                  </div>
                </a>

                <a
                  href={`/dashboard-admin/porteiros?condominio=${condominioSelecionado}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <DoorOpen className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Porteiros
                    </span>
                  </div>
                </a>

                <a
                  href={`/dashboard-admin/aprovacoes?condominio=${condominioSelecionado}`}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-2 rounded-lg group-hover:bg-primary-200 transition-colors">
                      <CheckCircle className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      Aprovações
                    </span>
                  </div>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo da Página */}
        <main className="container mx-auto px-6 pb-8">{children}</main>
      </div>
    </div>
  );
}