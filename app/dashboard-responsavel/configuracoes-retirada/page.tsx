"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { Settings, Save, AlertCircle, CheckCircle } from "lucide-react";
import type { ConfiguracoesRetirada } from "@/types/retirada.types";

function ConfiguracoesRetiradaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [config, setConfig] = useState<ConfiguracoesRetirada>({
    assinaturaObrigatoria: true,
    fotoObrigatoria: false,
    selfieObrigatoria: false,
    geolocationObrigatoria: false,
    notificarWhatsApp: true,
    notificarEmail: true,
    notificarSMS: false,
    permitirTerceiros: true,
    exigirCodigoVerificacao: false,
    incluirLogoRecibo: true,
    incluirQRCodeRecibo: true,
    incluirMarcaDagua: false,
  });

  useEffect(() => {
    carregarConfiguracoes();
  }, [user]);

  const carregarConfiguracoes = async () => {
    if (!user?.condominioId) {
      setLoading(false);
      return;
    }

    try {
      const configRef = doc(db, "condominios", user.condominioId, "configuracoes", "retirada");
      const configDoc = await getDoc(configRef);

      if (configDoc.exists()) {
        setConfig(configDoc.data() as ConfiguracoesRetirada);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      setMessage({ type: "error", text: "Erro ao carregar configurações" });
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracoes = async () => {
    if (!user?.condominioId) {
      setMessage({ type: "error", text: "Condomínio não identificado" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const configRef = doc(db, "condominios", user.condominioId, "configuracoes", "retirada");
      await setDoc(configRef, config);

      setMessage({ type: "success", text: "Configurações salvas com sucesso!" });
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setMessage({ type: "error", text: "Erro ao salvar configurações" });
    } finally {
      setSaving(false);
    }
  };

  const toggleConfig = (key: keyof ConfiguracoesRetirada) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 p-3 rounded-lg">
                <Settings className="text-primary-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configurações de Retirada
                </h1>
                <p className="text-sm text-gray-600">
                  Personalize as regras de retirada do condomínio
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard-responsavel")}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            )}
            <p
              className={`text-sm ${
                message.type === "success" ? "text-green-800" : "text-red-800"
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Campos Obrigatórios */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Campos Obrigatórios
          </h2>
          <div className="space-y-4">
            <ToggleOption
              label="Assinatura Digital"
              description="Exigir assinatura do morador ao retirar"
              checked={config.assinaturaObrigatoria}
              onChange={() => toggleConfig("assinaturaObrigatoria")}
            />
            <ToggleOption
              label="Foto da Correspondência"
              description="Exigir foto da correspondência no momento da retirada"
              checked={config.fotoObrigatoria}
              onChange={() => toggleConfig("fotoObrigatoria")}
            />
            <ToggleOption
              label="Selfie do Morador"
              description="Exigir selfie do morador para validação"
              checked={config.selfieObrigatoria}
              onChange={() => toggleConfig("selfieObrigatoria")}
            />
            <ToggleOption
              label="Geolocalização"
              description="Registrar localização GPS no momento da retirada"
              checked={config.geolocationObrigatoria}
              onChange={() => toggleConfig("geolocationObrigatoria")}
            />
          </div>
        </div>

        {/* Notificações */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Notificações
          </h2>
          <div className="space-y-4">
            <ToggleOption
              label="WhatsApp"
              description="Enviar notificação via WhatsApp após retirada"
              checked={config.notificarWhatsApp}
              onChange={() => toggleConfig("notificarWhatsApp")}
            />
            <ToggleOption
              label="E-mail"
              description="Enviar notificação via e-mail após retirada"
              checked={config.notificarEmail}
              onChange={() => toggleConfig("notificarEmail")}
            />
            <ToggleOption
              label="SMS"
              description="Enviar notificação via SMS após retirada"
              checked={config.notificarSMS}
              onChange={() => toggleConfig("notificarSMS")}
            />
          </div>
        </div>

        {/* Segurança */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Segurança
          </h2>
          <div className="space-y-4">
            <ToggleOption
              label="Permitir Retirada por Terceiros"
              description="Permitir que outras pessoas retirem correspondências"
              checked={config.permitirTerceiros}
              onChange={() => toggleConfig("permitirTerceiros")}
            />
            <ToggleOption
              label="Código de Verificação"
              description="Exigir código de verificação para retirada"
              checked={config.exigirCodigoVerificacao}
              onChange={() => toggleConfig("exigirCodigoVerificacao")}
            />
          </div>
        </div>

        {/* Personalização do Recibo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Personalização do Recibo
          </h2>
          <div className="space-y-4">
            <ToggleOption
              label="Incluir Logo do Condomínio"
              description="Adicionar logo no cabeçalho do recibo"
              checked={config.incluirLogoRecibo}
              onChange={() => toggleConfig("incluirLogoRecibo")}
            />
            <ToggleOption
              label="Incluir QR Code"
              description="Adicionar QR Code de validação no recibo"
              checked={config.incluirQRCodeRecibo}
              onChange={() => toggleConfig("incluirQRCodeRecibo")}
            />
            <ToggleOption
              label="Marca D'água"
              description="Adicionar marca d'água de segurança no recibo"
              checked={config.incluirMarcaDagua}
              onChange={() => toggleConfig("incluirMarcaDagua")}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={salvarConfiguracoes}
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save size={20} />
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Toggle Component
interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900">{label}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? "bg-primary-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default withAuth(ConfiguracoesRetiradaPage, ["responsavel", "adminMaster"]);