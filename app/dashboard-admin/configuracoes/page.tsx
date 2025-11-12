"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function ConfiguracoesPage() {
  const [whatsappLink, setWhatsappLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCarregar, setLoadingCarregar] = useState(true);

  // Carregar configurações ao montar
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoadingCarregar(true);
      const docRef = doc(db, "configuracoes", "suporte");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setWhatsappLink(docSnap.data().whatsappLink || "");
        console.log("✅ Configurações carregadas");
      } else {
        console.log("📝 Nenhuma configuração encontrada");
      }
    } catch (err) {
      console.error("❌ Erro ao carregar configurações:", err);
      alert("Erro ao carregar configurações");
    } finally {
      setLoadingCarregar(false);
    }
  };

  const salvarConfiguracoes = async () => {
    try {
      // Validação básica
      if (whatsappLink && !whatsappLink.startsWith("https://")) {
        alert("O link deve começar com https://");
        return;
      }

      setLoading(true);

      // Salvar no Firestore
      await setDoc(doc(db, "configuracoes", "suporte"), {
        whatsappLink,
        atualizadoEm: serverTimestamp(),
      });

      console.log("✅ Configurações salvas");
      alert("✅ Configurações salvas com sucesso!");
    } catch (err) {
      console.error("❌ Erro ao salvar configurações:", err);
      alert("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const testarWhatsApp = () => {
    if (!whatsappLink) {
      alert("Configure o link do WhatsApp primeiro");
      return;
    }
    window.open(whatsappLink, "_blank");
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
            <p className="text-gray-600">Gerencie as configurações globais</p>
          </div>
        </div>
      </div>

      {/* Configurações */}
      {loadingCarregar ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">Carregando configurações...</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          {/* Seção WhatsApp */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">WhatsApp Suporte</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link do WhatsApp
                </label>
                <input
                  type="url"
                  value={whatsappLink}
                  onChange={(e) => setWhatsappLink(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://wa.me/5581999618516?text=Olá,%20preciso%20de%20ajuda"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Cole o link do WhatsApp Business. Exemplo: https://wa.me/5581999618516
                </p>
              </div>

              {/* Como Gerar o Link */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  📱 Como gerar o link do WhatsApp:
                </h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Acesse: <a href="https://wa.me/" target="_blank" className="underline">https://wa.me/</a></li>
                  <li>Use o formato: <code className="bg-blue-100 px-1 rounded">https://wa.me/5581999618516</code></li>
                  <li>Substitua <code className="bg-blue-100 px-1 rounded">5581999618516</code> pelo seu número (com DDI e DDD)</li>
                  <li>Opcional: Adicione mensagem pré-definida: <code className="bg-blue-100 px-1 rounded">?text=Olá</code></li>
                </ol>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={testarWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-green-500 text-green-600 rounded-lg hover:bg-green-50"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Testar Link
                </button>
                <button
                  onClick={salvarConfiguracoes}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Configurações"}
                </button>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">ℹ️ Informações</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• O botão de WhatsApp aparecerá na tela de login para todos os usuários</li>
              <li>• Deixe o campo vazio para ocultar o botão</li>
              <li>• As alterações são aplicadas imediatamente</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}