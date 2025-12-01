"use client";

import React, { useState } from "react";
import { CheckCircle, MessageCircle, Mail, FileText, Printer, Loader2, Copy } from "lucide-react";

interface Props {
  protocolo: string;
  moradorNome: string;
  telefoneMorador?: string;
  emailMorador?: string;
  pdfUrl?: string;        
  linkPublico?: string;   
  mensagemFormatada?: string; // Recebe o texto completo da página anterior (se houver)
  onClose: () => void;
  onImprimir: () => void;
  onReenviarEmail: () => void;
}

export default function ModalSucessoEntrada({
  protocolo,
  moradorNome,
  telefoneMorador,
  emailMorador,
  pdfUrl,
  linkPublico,
  mensagemFormatada, 
  onClose,
  onImprimir,
  onReenviarEmail
}: Props) {

  const [copiado, setCopiado] = useState(false);

  const limparTelefone = (telefone: string) => telefone.replace(/\D/g, "");

  // Função que gera o texto com o estilo "Caixa" e Negritos solicitados
  const gerarMensagemPadrao = () => {
    const dataHoje = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    
    // AQUI ESTÃO AS MUDANÇAS DE NEGRITO (*)
    return `*AVISO DE CORRESPONDÊNCIA*

Olá, *${moradorNome}*!

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ *PROTOCOLO: ${protocolo}*
│ Local: Portaria
│ Chegada: ${dataHoje}
━━━━━━━━━━━━━━━━

*FOTO E QR CODE:*
${linkPublico}

Aguardamos a sua retirada`;
  };

  const handleWhatsApp = () => {
    if (!telefoneMorador) return alert("Morador sem telefone cadastrado.");
    
    if (!linkPublico && !mensagemFormatada) return alert("O link público do PDF ainda está sendo gerado. Aguarde um momento.");

    // LÓGICA:
    // 1. Se vier "mensagemFormatada" da página anterior (com bloco/unidade), usa ela.
    // 2. Se não, usa a "gerarMensagemPadrao" criada aqui em cima.
    const textoFinal = mensagemFormatada ? mensagemFormatada : gerarMensagemPadrao();
    
    const telefoneFinal = limparTelefone(telefoneMorador);
    const numeroComPrefixo = telefoneFinal.startsWith('55') ? `+${telefoneFinal}` : `+55${telefoneFinal}`;
    
    // encodeURIComponent é essencial para o negrito e quebras de linha funcionarem
    const whatsLink = `https://wa.me/${numeroComPrefixo}?text=${encodeURIComponent(textoFinal)}`;
    
    window.open(whatsLink, "_blank");
  };

  const handleCopiarTexto = () => {
    const texto = mensagemFormatada ? mensagemFormatada : gerarMensagemPadrao();
    
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="bg-blue-600 p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <CheckCircle className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Registrado com Sucesso!</h2>
          <p className="text-blue-100 text-sm mt-1">Protocolo #{protocolo}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center mb-4">
            Correspondência cadastrada. Avise <strong>{moradorNome}</strong>:
          </p>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            disabled={!telefoneMorador || (!linkPublico && !mensagemFormatada)}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-white font-bold text-lg transition-all shadow-md ${
              !telefoneMorador 
                ? "bg-gray-300 cursor-not-allowed" 
                : (!linkPublico && !mensagemFormatada)
                  ? "bg-green-400 cursor-wait" 
                  : "bg-[#25D366] hover:bg-[#128C7E] hover:-translate-y-0.5"
            }`}
          >
            {(linkPublico || mensagemFormatada) ? <MessageCircle size={24} /> : <Loader2 size={24} className="animate-spin" />}
            {(linkPublico || mensagemFormatada) ? "Avisar no WhatsApp" : "Gerando Link Público..."}
          </button>

          {/* Botão Copiar */}
          <button
            onClick={handleCopiarTexto}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all shadow-sm"
          >
            {copiado ? <CheckCircle size={22} className="text-green-600"/> : <Copy size={22} />}
            {copiado ? "Texto Copiado!" : "Copiar Mensagem"}
          </button>

          {/* Email */}
          <button
            onClick={onReenviarEmail}
            disabled={!emailMorador}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-white font-bold text-lg transition-all shadow-md ${
              !emailMorador 
                ? "bg-gray-300 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-600 hover:-translate-y-0.5"
            }`}
          >
            <Mail size={24} />
            {emailMorador ? "Reenviar E-mail" : "Sem E-mail Cadastrado"}
          </button>

          <div className="grid grid-cols-2 gap-3 pt-2">
             <button
                onClick={onImprimir}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all border border-gray-200"
            >
                <Printer size={20} />
                Imprimir
            </button>

            {pdfUrl ? (
                <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all border border-gray-200"
                >
                <FileText size={20} />
                Ver PDF
                </a>
            ) : (
                <button disabled className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 text-gray-400 font-bold cursor-not-allowed">
                   <Loader2 size={20} className="animate-spin" />
                </button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 text-gray-500 font-semibold hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fechar e Nova Correspondência
          </button>
        </div>
      </div>
    </div>
  );
}




