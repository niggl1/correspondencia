"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { X, Save, AlertCircle } from "lucide-react";
import AssinaturaDigitalPro from "./AssinaturaDigitalPro";
import { gerarReciboPDF, downloadReciboPDF } from "@/utils/gerarReciboPDF";
import type { ConfiguracoesRetirada, DadosRetirada } from "@/types/retirada.types";

interface Props {
  correspondencia: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalRetiradaProfissional({
  correspondencia,
  onClose,
  onSuccess,
}: Props) {
  const { user } = useAuth(); // ✅ Pega dados do usuário logado
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Configurações do condomínio
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

  // Dados do formulário
  const [nomeQuemRetirou, setNomeQuemRetirou] = useState("");
  const [cpfQuemRetirou, setCpfQuemRetirou] = useState("");
  const [telefoneQuemRetirou, setTelefoneQuemRetirou] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Assinaturas
  const [assinaturaMorador, setAssinaturaMorador] = useState<string>("");
  const [assinaturaPorteiro, setAssinaturaPorteiro] = useState<string>("");
  const [assinaturaPorteiroPadrao, setAssinaturaPorteiroPadrao] = useState<string>("");

  useEffect(() => {
    if (user?.condominioId) {
      carregarConfiguracoes();
    }
    if (user?.uid) {
      carregarAssinaturaPorteiro();
    }
  }, [user]);

  async function carregarConfiguracoes() {
    if (!user?.condominioId) return;
    
    try {
      const docRef = doc(db, "condominios", user.condominioId, "configuracoes", "retirada");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setConfig(docSnap.data() as ConfiguracoesRetirada);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }

  async function carregarAssinaturaPorteiro() {
    if (!user?.uid) return;
    
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const assinaturaSalva = docSnap.data()?.assinaturaPadrao;
        if (assinaturaSalva) {
          setAssinaturaPorteiroPadrao(assinaturaSalva);
          setAssinaturaPorteiro(assinaturaSalva);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar assinatura do porteiro:", error);
    }
  }

  async function salvarAssinaturaPadraoPorteiro(assinaturaDataUrl: string) {
    if (!user?.uid) return;
    
    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, { assinaturaPadrao: assinaturaDataUrl }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar assinatura padrão:", error);
    }
  }

  function gerarCodigoVerificacao(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  async function handleConfirmar() {
    // Validações
    if (!nomeQuemRetirou.trim()) {
      setError("Nome de quem retirou é obrigatório");
      return;
    }

    if (config.assinaturaObrigatoria && !assinaturaMorador) {
      setError("Assinatura do morador é obrigatória");
      return;
    }

    if (!user?.uid || !user?.nome) {
      setError("Dados do porteiro não encontrados");
      return;
    }

    if (!user?.condominioId) {
      setError("Condomínio não identificado");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Preparar dados da retirada
      const dadosRetirada: DadosRetirada = {
        nomeQuemRetirou: nomeQuemRetirou.trim(),
        cpfQuemRetirou: cpfQuemRetirou.trim() || undefined,
        telefoneQuemRetirou: telefoneQuemRetirou.trim() || undefined,
        nomePorteiro: user.nome,
        idPorteiro: user.uid,
        dataHoraRetirada: new Date().toISOString(),
        assinaturaMorador: assinaturaMorador || undefined,
        assinaturaPorteiro: assinaturaPorteiro || undefined,
        observacoes: observacoes.trim() || undefined,
        codigoVerificacao: gerarCodigoVerificacao(),
      };

      // Gerar PDF do recibo
      const pdfBlob = await gerarReciboPDF({
        correspondencia,
        dadosRetirada,
        nomeCondominio: correspondencia.condominioNome || "Condomínio",
      });

      // Baixar PDF automaticamente
      await downloadReciboPDF(
        {
          correspondencia,
          dadosRetirada,
          nomeCondominio: correspondencia.condominioNome || "Condomínio",
        },
        `recibo-${correspondencia.protocolo}.pdf`
      );

      // Atualizar status da correspondência no Firestore
      const corrRef = doc(db, "correspondencias", correspondencia.id);
      await setDoc(
        corrRef,
        {
          status: "retirada",
          retiradoEm: Timestamp.now(),
          dadosRetirada,
        },
        { merge: true }
      );

      // Salvar registro de retirada
      const retiradaRef = doc(db, "retiradas", `${correspondencia.id}_${Date.now()}`);
      await setDoc(retiradaRef, {
        correspondenciaId: correspondencia.id,
        protocolo: correspondencia.protocolo,
        condominioId: user.condominioId,
        ...dadosRetirada,
        status: "concluida",
        criadoEm: new Date().toISOString(),
      });

      // Sucesso!
      onSuccess();
    } catch (err) {
      console.error("Erro ao registrar retirada:", err);
      setError("Erro ao registrar retirada. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-primary-600 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Registrar Retirada</h2>
            <p className="text-primary-100 text-sm mt-1">
              Protocolo: {correspondencia.protocolo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-primary-700 p-2 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Informações da Correspondência */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Dados da Correspondência
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Morador:</span>
                <span className="ml-2 font-medium">{correspondencia.moradorNome}</span>
              </div>
              <div>
                <span className="text-gray-600">Bloco/Apto:</span>
                <span className="ml-2 font-medium">
                  {correspondencia.blocoNome} - {correspondencia.apartamento}
                </span>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome de quem retirou *
              </label>
              <input
                type="text"
                value={nomeQuemRetirou}
                onChange={(e) => setNomeQuemRetirou(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Nome completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF (opcional)
                </label>
                <input
                  type="text"
                  value={cpfQuemRetirou}
                  onChange={(e) => setCpfQuemRetirou(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone (opcional)
                </label>
                <input
                  type="text"
                  value={telefoneQuemRetirou}
                  onChange={(e) => setTelefoneQuemRetirou(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Informações adicionais..."
              />
            </div>
          </div>

          {/* Assinaturas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Assinaturas</h3>

            {/* Assinatura do Morador */}
            {config.assinaturaObrigatoria && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assinatura do Morador *
                </label>
                <AssinaturaDigitalPro
                  onSave={(dataUrl) => setAssinaturaMorador(dataUrl)}
                  assinaturaPadrao=""
                />
              </div>
            )}

            {/* Assinatura do Porteiro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assinatura do Porteiro
              </label>
              <AssinaturaDigitalPro
                onSave={(dataUrl) => setAssinaturaPorteiro(dataUrl)}
                assinaturaPadrao={assinaturaPorteiroPadrao}
                onSavePadrao={salvarAssinaturaPadraoPorteiro}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={20} />
            {loading ? "Processando..." : "Confirmar Retirada"}
          </button>
        </div>
      </div>
    </div>
  );
}