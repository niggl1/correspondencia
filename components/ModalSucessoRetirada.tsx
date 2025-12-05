"use client";

import { useState } from "react";
import { CheckCircle, MessageCircle, X, Copy, FileText, Printer } from "lucide-react";

interface Props {
  id: string;
  protocolo: string;
  moradorNome: string;
  telefoneMorador: string;
  emailMorador: string;
  pdfUrl: string;
  mensagemFormatada?: string;
  onClose: () => void;
}

export default function ModalSucessoRetirada({
  id, 
  protocolo,
  moradorNome,
  telefoneMorador,
  pdfUrl,
  mensagemFormatada,
  onClose,
}: Props) {
  
  const [copiado, setCopiado] = useState(false);
  const [imprimirSemAssinatura, setImprimirSemAssinatura] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://appcorrespondencia.com.br";
  const linkPublico = `${baseUrl}/ver?id=${id}`;

  const handleWhatsApp = () => {
    if (!telefoneMorador) {
      alert("Telefone do morador não disponível.");
      return;
    }

    let textoBase = mensagemFormatada;
    if (!textoBase) {
      textoBase = `Olá *${moradorNome}*! A correspondência (Protocolo: ${protocolo}) foi retirada.`;
    }

    const textoFinal = `${textoBase}\n\n🔗 *Acesse o recibo digital:*\n${linkPublico}`;
    const numeroLimpo = telefoneMorador.replace(/\D/g, "");
    const numeroComPrefixo = numeroLimpo.startsWith('55') ? `+${numeroLimpo}` : `+55${numeroLimpo}`;
    
    window.open(`https://wa.me/${numeroComPrefixo}?text=${encodeURIComponent(textoFinal)}`, "_blank");
  };

  const handleCopiarTexto = () => {
    let textoBase = mensagemFormatada || `Correspondência ${protocolo} retirada.`;
    const textoFinal = `${textoBase}\n\nRecibo: ${linkPublico}`;
    
    navigator.clipboard.writeText(textoFinal).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const handleImprimir = () => {
    if (imprimirSemAssinatura) {
      // --- GERAÇÃO DE RECIBO FÍSICO (LIMPO) PARA ASSINATURA COM CANETA ---
      const dataHoje = new Date().toLocaleString('pt-BR');
      const printWindow = window.open('', '', 'width=800,height=600');
      
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Recibo de Retirada - #${protocolo}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #333; font-size: 24px; }
                .header p { margin: 5px 0 0; color: #666; }
                .content { margin-bottom: 40px; font-size: 16px; line-height: 1.6; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
                .signatures { margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; }
                .sign-box { flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 10px; }
                .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
                @media print {
                   body { padding: 0; }
                   button { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Comprovante de Retirada</h1>
                <p>Protocolo: <strong>#${protocolo}</strong></p>
              </div>

              <div class="content">
                <div class="info-row">
                  <strong>Morador:</strong> <span>${moradorNome}</span>
                </div>
                <div class="info-row">
                  <strong>Data da Retirada:</strong> <span>${dataHoje}</span>
                </div>
                <div class="info-row">
                   <strong>Status:</strong> <span>ENTREGUE / RETIRADO</span>
                </div>
              </div>

              <br/><br/>
              <p style="text-align: center; font-size: 14px;">
                Declaro ter recebido a correspondência referente ao protocolo acima em perfeitas condições.
              </p>

              <div class="signatures">
                <div class="sign-box">
                   <br/><br/>
                   Assinatura do Morador
                </div>
                <div class="sign-box">
                   <br/><br/>
                   Visto do Porteiro
                </div>
              </div>

              <div class="footer">
                Impresso em ${dataHoje} via App Correspondência
              </div>
              <script>
                window.print();
                setTimeout(() => window.close(), 1000);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      // --- IMPRESSÃO DO PDF DIGITAL (JÁ ASSINADO) ---
      if (pdfUrl) {
        const win = window.open(pdfUrl, '_blank');
        win?.focus();
      } else {
        alert("PDF ainda não disponível. Tente novamente em instantes.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER VERDE PADRÃO */}
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
              {copiado ? <CheckCircle size={22} className="text-[#057321]"/> : <Copy size={22} />}
              {copiado ? "Texto Copiado!" : "Copiar Mensagem"}
            </button>

            {/* ÁREA DE IMPRESSÃO E VISUALIZAÇÃO */}
            <div className="grid grid-cols-2 gap-3 pt-2">
               <button
                 onClick={handleImprimir}
                 className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all border border-gray-200"
               >
                 <Printer size={20} />
                 Imprimir
               </button>

               {pdfUrl ? (
                  <a
                    href={linkPublico}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all border border-gray-200"
                  >
                    <FileText size={20} />
                    Ver Recibo
                  </a>
               ) : (
                 <button disabled className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 text-gray-400 font-bold border border-gray-200 cursor-not-allowed">
                   Ver Recibo
                 </button>
               )}
            </div>

            {/* CHECKBOX PARA IMPRESSÃO FÍSICA */}
            <div className="flex items-center justify-center gap-2 pt-1">
                <input 
                    type="checkbox" 
                    id="semAssinatura"
                    checked={imprimirSemAssinatura}
                    onChange={(e) => setImprimirSemAssinatura(e.target.checked)}
                    className="w-4 h-4 text-[#057321] border-gray-300 rounded focus:ring-[#057321] cursor-pointer"
                />
                <label htmlFor="semAssinatura" className="text-sm text-gray-500 cursor-pointer select-none">
                    Imprimir sem assinatura digital (Físico)
                </label>
            </div>

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
