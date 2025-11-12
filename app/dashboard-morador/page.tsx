"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { Package, Mail, Clock, FileText } from "lucide-react";

export default function DashboardMoradorPage() {
  const [loading, setLoading] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [unidadeNome, setUnidadeNome] = useState("");
  const [totalCorrespondencias, setTotalCorrespondencias] = useState(0);
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Carregar dados do usuário
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setNomeUsuario(userData.nome || "Morador");
            setUnidadeNome(userData.unidadeNome || "-");
          }

          // Carregar estatísticas de correspondências
          const q = query(
            collection(db, "correspondencias"),
            where("moradorId", "==", user.uid)
          );
          const snapshot = await getDocs(q);
          
          setTotalCorrespondencias(snapshot.size);
          setPendentes(snapshot.docs.filter(doc => doc.data().status === "pendente").length);
        } catch (err) {
          console.error("❌ Erro ao carregar dados:", err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
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
    <div className="space-y-6">
      {/* Boas-vindas */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-2">Olá, {nomeUsuario}! 👋</h1>
        <p className="text-primary-100">Bem-vindo ao seu painel de correspondências</p>
        <p className="text-sm text-primary-200 mt-1">Unidade: {unidadeNome}</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Correspondências Pendentes</p>
              <p className="text-4xl font-bold text-yellow-600 mt-2">{pendentes}</p>
              <p className="text-sm text-gray-500 mt-1">Aguardando retirada</p>
            </div>
            <div className="bg-yellow-100 p-4 rounded-full">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <a
            href="/dashboard-morador/correspondencias"
            className="mt-4 inline-block text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            Ver todas →
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total de Correspondências</p>
              <p className="text-4xl font-bold text-primary-600 mt-2">{totalCorrespondencias}</p>
              <p className="text-sm text-gray-500 mt-1">Histórico completo</p>
            </div>
            <div className="bg-primary-100 p-4 rounded-full">
              <Mail className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <a
            href="/dashboard-morador/correspondencias"
            className="mt-4 inline-block text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            Ver histórico →
          </a>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/dashboard-morador/correspondencias"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg group-hover:bg-primary-200 transition-colors">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  Ver Correspondências
                </h3>
                <p className="text-sm text-gray-600">Consulte suas cartas e encomendas</p>
              </div>
            </div>
          </a>

          <a
            href="/dashboard-morador/correspondencias"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-l-4 border-primary-600 group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-lg group-hover:bg-primary-200 transition-colors">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  Encomendas Pendentes
                </h3>
                <p className="text-sm text-gray-600">Veja o que está aguardando</p>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-primary-50 border border-primary-200 p-6 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="bg-primary-600 text-white rounded-full p-2 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-primary-900 mb-2">Como funciona?</h3>
            <ul className="space-y-2 text-sm text-primary-800">
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">1.</span>
                <span>Quando uma correspondência chegar, você será notificado</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">2.</span>
                <span>Acesse a seção "Correspondências" para ver detalhes</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">3.</span>
                <span>Compareça à portaria para retirar sua encomenda</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-600 mr-2">4.</span>
                <span>O porteiro registrará a retirada no sistema</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}