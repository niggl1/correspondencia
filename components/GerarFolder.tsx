"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";

interface GerarFolderProps {
  condominioId: string;
  condominioNome: string;
  condominioEndereco?: string;
  responsavelNome?: string;
  condominioLogoUrl?: string;
}

export default function GerarFolder({ 
  condominioId, 
  condominioNome, 
  condominioEndereco,
  responsavelNome,
  condominioLogoUrl
}: GerarFolderProps) {
  const [loading, setLoading] = useState(false);

  const gerarPDF = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/gerar-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condominioId,
          condominioNome,
          condominioEndereco: condominioEndereco || ''
        })
      });

      const data = await response.json();

      if (!data.success) {
        alert('Erro ao gerar folder');
        return;
      }

      // Carregar logo do condomínio
      const loadImageSafe = async (url: string) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const blob = await response.blob();
          return new Promise<{data: string, format: string} | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              let format = 'PNG';
              if (base64.includes('data:image/jpeg')) format = 'JPEG';
              else if (base64.includes('data:image/jpg')) format = 'JPEG';
              else if (base64.includes('data:image/png')) format = 'PNG';
              resolve({ data: base64, format });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch {
          return null;
        }
      };

      // Tenta carregar logo do condomínio, se não houver usa logo do app
      const logoCondominio = condominioLogoUrl 
        ? await loadImageSafe(condominioLogoUrl)
        : await loadImageSafe('/logo-app-correspondencia.png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;

      // Cor verde padrão do sistema: #057321 = RGB(5, 115, 33)
      const verdeR = 5;
      const verdeG = 115;
      const verdeB = 33;

      // ========== FUNDO ==========
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Fundo BRANCO no topo
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, 50, 'F');

      // ========== CABEÇALHO BRANCO ==========
      // Logo do condomínio
      if (logoCondominio) {
        try {
          pdf.addImage(logoCondominio.data, logoCondominio.format, margin, margin, 35, 35);
        } catch {
          // Fallback: moldura cinza
          pdf.setFillColor(245, 245, 245);
          pdf.roundedRect(margin, margin, 35, 35, 3, 3, 'F');
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, margin, 35, 35, 3, 3, 'S');
          pdf.setFontSize(9);
          pdf.setTextColor(150, 150, 150);
          pdf.text('LOGO', margin + 17.5, margin + 20, { align: 'center' });
        }
      } else {
        // Fallback: moldura cinza
        pdf.setFillColor(245, 245, 245);
        pdf.roundedRect(margin, margin, 35, 35, 3, 3, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, margin, 35, 35, 3, 3, 'S');
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text('LOGO', margin + 17.5, margin + 20, { align: 'center' });
      }

      // Nome do Condomínio (em preto)
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(condominioNome, margin + 40, margin + 14);

      // Responsável
      if (responsavelNome) {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Responsável: ${responsavelNome}`, margin + 40, margin + 23);
      }

      // Endereço
      if (condominioEndereco) {
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(condominioEndereco, margin + 40, margin + 31);
      }

      // ========== NOME DO APP EM PRETO (SEM SUBLINHADO) ==========
      const appNameY = 68;
      
      pdf.setFontSize(32);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('App Correspondência', pageWidth / 2, appNameY, { align: 'center' });

      // ========== CAIXA VERDE COM FUNDO BRANCO ==========
      const iconeY = appNameY + 15;
      const boxHeight = 22;
      
      // Caixa BRANCA com borda verde
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, iconeY, pageWidth - (margin * 2), boxHeight, 4, 4, 'F');
      pdf.setDrawColor(verdeR, verdeG, verdeB);
      pdf.setLineWidth(2);
      pdf.roundedRect(margin, iconeY, pageWidth - (margin * 2), boxHeight, 4, 4, 'S');

      // Logo App à ESQUERDA
      const logoSize = 16;
      const logoX = margin + 8;
      if (logoCondominio) {
        try {
          pdf.addImage(logoCondominio.data, logoCondominio.format, logoX, iconeY + 3, logoSize, logoSize);
        } catch {
          // Fallback
          pdf.setFillColor(verdeR, verdeG, verdeB);
          pdf.circle(logoX + 8, iconeY + 11, 6, 'F');
        }
      }
      
      // Texto em CAIXA ALTA ocupando máximo da borda
      pdf.setFontSize(15);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RECEBA AVISOS NO WHATSAPP E NO E-MAIL!', logoX + logoSize + 5, iconeY + 13);

      // ========== MOLDURA PRINCIPAL VERDE COM MAIOR ESPAÇAMENTO ==========
      const molduraY = iconeY + boxHeight + 20;
      const molduraHeight = 150;

      // Sombra
      pdf.setFillColor(230, 230, 230);
      pdf.roundedRect(margin + 2, molduraY + 2, pageWidth - (margin * 2), molduraHeight, 5, 5, 'F');

      // Moldura VERDE
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, molduraY, pageWidth - (margin * 2), molduraHeight, 5, 5, 'F');
      pdf.setDrawColor(verdeR, verdeG, verdeB);
      pdf.setLineWidth(1.5);
      pdf.roundedRect(margin, molduraY, pageWidth - (margin * 2), molduraHeight, 5, 5, 'S');

      // ========== INSTRUÇÕES COM ACENTOS CORRETOS ==========
      pdf.setFontSize(16);
      pdf.setTextColor(verdeR, verdeG, verdeB);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Como se cadastrar:', pageWidth / 2, molduraY + 14, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(55, 65, 81);

      const instrucoes = [
        '1. Escaneie o QR Code abaixo com a câmera do celular',
        '2. Preencha seus dados no formulário online',
        '3. Aguarde a aprovação do síndico'
      ];

      let y = molduraY + 26;
      instrucoes.forEach(instrucao => {
        pdf.text(instrucao, pageWidth / 2, y, { align: 'center' });
        y += 10;
      });

      // ========== QR CODE ==========
      const qrSize = 50;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = molduraY + 60;

      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 3, 3, 'F');
      pdf.addImage(data.qrCode, 'PNG', qrX, qrY, qrSize, qrSize);
      
      pdf.setDrawColor(verdeR, verdeG, verdeB);
      pdf.setLineWidth(1);
      pdf.roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 3, 3, 'S');

      pdf.setFontSize(12);
      pdf.setTextColor(verdeR, verdeG, verdeB);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Escaneie para se cadastrar', pageWidth / 2, qrY + qrSize + 12, { align: 'center' });

      // ========== CAIXA DE AVISO SEM "ATENÇÃO" ==========
      const avisoY = molduraY + 128;
      const avisoHeight = 18;
      
      // Caixa BRANCA com borda laranja
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin + 8, avisoY, pageWidth - (margin * 2) - 16, avisoHeight, 4, 4, 'F');
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(2);
      pdf.roundedRect(margin + 8, avisoY, pageWidth - (margin * 2) - 16, avisoHeight, 4, 4, 'S');

      // Texto centralizado com acentos corretos
      pdf.setFontSize(11);
      pdf.setTextColor(120, 53, 15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Após o cadastro, aguarde a ativação da sua conta', pageWidth / 2, avisoY + 8, { align: 'center' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('pelo síndico do seu condomínio.', pageWidth / 2, avisoY + 14, { align: 'center' });

      // ========== RODAPÉ ==========
      pdf.setFontSize(9);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont('helvetica', 'italic');
      pdf.text(
        'Sistema de Correspondências - Desenvolvido para facilitar sua vida',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      const nomeArquivo = `Folder_${condominioNome.replace(/\s+/g, '_')}.pdf`;
      pdf.save(nomeArquivo);

      alert('Folder gerado com sucesso!');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={gerarPDF}
      disabled={loading}
      className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm disabled:opacity-50"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {loading ? 'Gerando Folder...' : 'Gerar Folder de Cadastro'}
    </button>
  );
}