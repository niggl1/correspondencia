"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { 
  Building2, 
  Home, 
  Users, 
  Clock, 
  Plus, 
  List, 
  LogOut, 
  UserPlus, 
  Mail,
  Settings,
  FileText
} from "lucide-react";
import GerarFolder from "@/components/GerarFolder";

export default function DashboardResponsavel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [condominioId, setCondominioId] = useState("");
  const [condominioNome, setCondominioNome] = useState("");
  const [condominioEndereco, setCondominioEndereco] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.nome || "Responsável");
          setUserRole(userData.role || "");

          if (userData.role !== "responsavel" && userData.role !== "admin" && userData.role !== "adminMaster") {
            router.push("/login");
            return;
          }

          if (userData.condominioId) {
            setCondominioId(userData.condominioId);
            const condominioDoc = await getDoc(doc(db, "condominios", userData.condominioId));
            if (condominioDoc.exists()) {
              const condominioData = condominioDoc.data();
              setCondominioNome(condominioData.nome || "");
              setCondominioEndereco(condominioData.endereco || "");
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleGerarFolder = () => {
    // Implementar lógica de gerar folder
    console.log("Gerar folder");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar estilo Porteiro */}
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
                <span className="text-sm">Perfil: <span className="font-semibold">Responsável</span></span>
                <span className="text-sm font-medium">👤 {userName}</span>
              </button>
              
              <button
                onClick={async () => {
                  await auth.signOut();
                  router.push("/login");
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium shadow-sm"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Boas-vindas */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo, {userName}!
          </h1>
          <p className="text-gray-600">
            Painel de controle do responsável pelo condomínio
          </p>
        </div>

        {/* Botões de Ação - Mantidos no topo */}
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
            condominioId={condominioId}
            condominioNome={condominioNome}
            condominioEndereco={condominioEndereco}
            responsavelNome={userName}
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
        <div className="bg-white rounded-lg shadow p-6">
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
      </div>
    </div>
  );
}