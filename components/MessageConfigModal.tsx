import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, MessageSquare, RotateCcw } from 'lucide-react';
import { useTemplates } from '../hooks/useTemplates';
import { MessageCategory, MessageTemplate } from '../types/template';
import { getAvailableVariables } from '../utils/templateParser';

interface MessageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  condoId: string;
  category: MessageCategory;
}

const CATEGORY_LABELS: Record<MessageCategory, string> = {
  ARRIVAL: 'Chegada de Encomenda',
  PICKUP: 'Retirada de Encomenda',
  WARNING: 'Aviso Rápido',
  GENERAL: 'Aviso Geral'
};

// --- TEXTO EXATO SOLICITADO PELO USUÁRIO ---
const DEFAULT_ARRIVAL_TEXT = `AVISO DE CORRESPONDÊNCIA

Olá, {MORADOR}!
Unidade: {UNIDADE} ({BLOCO})

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ PROTOCOLO: {PROTOCOLO}
│ Local: {LOCAL}
│ Recebido por: {RECEBIDO_POR}
│ Chegada: {DATA_HORA}
━━━━━━━━━━━━━━━━

FOTO E QR CODE:`;

// Texto padrão de retirada (mantido simples)
const DEFAULT_PICKUP_TEXT = `CONFIRMAÇÃO DE RETIRADA

Olá, {MORADOR}!
Unidade: {UNIDADE}

Sua encomenda foi retirada com sucesso.
━━━━━━━━━━━━━━━━
│ Retirado em: {DATA_HORA}
━━━━━━━━━━━━━━━━

Obrigado!`;

export default function MessageConfigModal({ isOpen, onClose, condoId, category }: MessageConfigModalProps) {
  const { templates, saveTemplate, refresh } = useTemplates(condoId);
  const [localTemplate, setLocalTemplate] = useState<Partial<MessageTemplate>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const found = templates.find(t => t.category === category);
      if (found) {
        setLocalTemplate(found);
      } else {
        // Se não existir template salvo, usa o padrão solicitado
        let defaultText = "";
        let defaultTitle = "";

        if (category === 'ARRIVAL') {
            defaultText = DEFAULT_ARRIVAL_TEXT;
            defaultTitle = "Chegada Padrão";
        } else if (category === 'PICKUP') {
            defaultText = DEFAULT_PICKUP_TEXT;
            defaultTitle = "Retirada Padrão";
        }

        setLocalTemplate({
          condoId,
          category,
          title: defaultTitle,
          content: defaultText,
          isActive: true
        });
      }
    }
  }, [isOpen, category, templates, condoId]);

  const handleSave = async () => {
    if (!localTemplate.content || !localTemplate.title) return;
    setIsSaving(true);
    try {
      await saveTemplate(localTemplate as MessageTemplate);
      await refresh();
      // Feedback visual discreto ou fechar direto
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configuração.');
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setLocalTemplate(prev => ({
      ...prev,
      content: (prev.content || '') + ` {${variable}}`
    }));
  };

  const restoreDefault = () => {
    if (confirm("Restaurar o modelo padrão do sistema?")) {
      let defaultText = "";
      let defaultTitle = "";

      if (category === 'ARRIVAL') {
        defaultText = DEFAULT_ARRIVAL_TEXT;
        defaultTitle = "Chegada Padrão";
      } else if (category === 'PICKUP') {
        defaultText = DEFAULT_PICKUP_TEXT;
        defaultTitle = "Retirada Padrão";
      }

      setLocalTemplate(prev => ({
        ...prev,
        title: defaultTitle,
        content: defaultText
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#057321] text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <h2 className="text-lg font-bold">Configurar Mensagem</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Título (Interno)</label>
              <input
                type="text"
                value={localTemplate.title || ''}
                onChange={e => setLocalTemplate({ ...localTemplate, title: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] outline-none"
              />
            </div>

            <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <AlertTriangle size={12} /> Variáveis disponíveis:
                </span>
                <button 
                  onClick={restoreDefault}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Restaurar Padrão
                </button>
            </div>

            <div>
              {/* Botões de Variáveis */}
              <div className="flex flex-wrap gap-2 mb-2">
                {/* Adicionamos manualmente as variáveis extras solicitadas para garantir que apareçam */}
                {['PROTOCOLO', 'RECEBIDO_POR', 'LOCAL', 'DATA_HORA', 'MORADOR', 'BLOCO', 'UNIDADE'].map(variable => (
                  <button
                    key={variable}
                    onClick={() => insertVariable(variable)}
                    className="px-2 py-1 text-xs font-bold bg-green-50 text-[#057321] border border-green-200 rounded hover:bg-[#057321] hover:text-white transition-colors"
                  >
                    {`{${variable}}`}
                  </button>
                ))}
              </div>

              <textarea
                rows={12}
                value={localTemplate.content || ''}
                onChange={e => setLocalTemplate({ ...localTemplate, content: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] outline-none font-mono text-sm"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] font-bold shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>

      </div>
    </div>
  );
}