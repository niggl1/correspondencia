"use client";

import { useState } from "react";
import { CheckCircle, MessageCircle, X, Copy, FileText } from "lucide-react";

interface Props {
  id: string;
  protocolo: string;
  moradorNome: string;
  telefoneMorador: string;
  emailMorador: string;
  pdfUrl: string;
  mensagemFormatada?: string; // AQUI ESTÁ A CHAVE
  onClose: () => void;
}

export default function ModalSucessoRetirada({
  protocolo,
  moradorNome,
  telefoneMorador,
  pdfUrl,
  mensagemFormatada,
  onClose,
}: Props) {
  
  const [copiado, setCopiado] = useState(false);

  const handleWhatsApp = () => {
    if (!telefoneMorador) {
      alert("Telefone do morador não disponível.");
      return;
    }

    // Se tiver a mensagem formatada (bonita), usa ela. Senão, usa o padrão simples.
    const textoFinal = mensagemFormatada 
      ? mensagemFormatada 
      : `Olá *${moradorNome}*! A correspondência (Protocolo: ${protocolo}) foi retirada.\n\nAcesse o recibo aqui: ${pdfUrl}`;

    const numeroLimpo = telefoneMorador.replace(/\D/g, "");
    const numeroComPrefixo = numeroLimpo.startsWith('55') ? `+${numeroLimpo}` : `+55${numeroLimpo}`;
    
    window.open(`https://wa.me/${numeroComPrefixo}?text=${encodeURIComponent(textoFinal)}`, "_blank");
  };

  const handleCopiarTexto = () => {
    const texto = mensagemFormatada || `Correspondência ${protocolo} retirada. Recibo: ${pdfUrl}`;
    
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-[#057321] p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <CheckCircle className="text-[#057321]" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Saída Confirmada!</h2>
          <p className="text-green-100 text-sm mt-1">Protocolo #{protocolo}</p>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-gray-600 text-center">
            A retirada foi registrada com sucesso para <strong>{moradorNome}</strong>.
          </p>

          <div className="space-y-3">
            
            <button
              onClick={handleWhatsApp}
              disabled={!telefoneMorador}
              className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-white font-bold text-lg transition-all shadow-md ${
                !telefoneMorador 
                  ? "bg-gray-300 cursor-not-allowed" 
                  : "bg-[#25D366] hover:bg-[#128C7E] hover:-translate-y-0.5"
              }`}
            >
              <MessageCircle size={24} />
              Avisar no WhatsApp
            </button>

            <button
              onClick={handleCopiarTexto}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all shadow-sm"
            >
              {copiado ? <CheckCircle size={22} className="text-green-600"/> : <Copy size={22} />}
              {copiado ? "Texto Copiado!" : "Copiar Mensagem"}
            </button>

            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all"
              >
                <FileText size={20} />
                Visualizar Recibo PDF
              </a>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fechar e Voltar
          </button>
        </div>

      </div>
    </div>
  );
}