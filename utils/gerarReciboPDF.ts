import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { DadosRetirada } from "@/types/retirada.types";

interface GerarReciboPDFParams {
  correspondencia: any;
  dadosRetirada: DadosRetirada;
  nomeCondominio?: string;
  logoUrl?: string;
}

export async function gerarReciboPDF({
  correspondencia,
  dadosRetirada,
  nomeCondominio = "Condomínio",
  logoUrl,
}: GerarReciboPDFParams): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 20;

  // ========================================
  // CABEÇALHO VERDE
  // ========================================
  doc.setFillColor(5, 115, 33); // #057321
  doc.rect(0, 0, pageWidth, 40, "F");

  // Logo (se disponível)
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, "PNG", 15, 10, 20, 20);
    } catch (error) {
      console.error("Erro ao adicionar logo:", error);
    }
  }

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE RETIRADA", pageWidth / 2, 22, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(nomeCondominio, pageWidth / 2, 30, { align: "center" });

  yPosition = 50;

  // ========================================
  // INFORMAÇÕES DA CORRESPONDÊNCIA
  // ========================================
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Dados da Correspondência", 15, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const infoCorrespondencia = [
    ["Protocolo:", correspondencia.protocolo || "N/A"],
    ["Tipo:", correspondencia.tipo || "N/A"],
    ["Remetente:", correspondencia.remetente || "N/A"],
    ["Destinatário:", correspondencia.destinatario || "N/A"],
    ["Bloco/Apto:", `${correspondencia.bloco || ""} - ${correspondencia.apartamento || ""}`],
    ["Data de Chegada:", correspondencia.dataChegada ? new Date(correspondencia.dataChegada).toLocaleDateString("pt-BR") : "N/A"],
  ];

  infoCorrespondencia.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(value, 60, yPosition);
    yPosition += 7;
  });

  yPosition += 5;

  // ========================================
  // DADOS DA RETIRADA
  // ========================================
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Dados da Retirada", 15, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const infoRetirada = [
    ["Data/Hora:", new Date(dadosRetirada.dataHoraRetirada).toLocaleString("pt-BR")],
    ["Retirado por:", dadosRetirada.nomeQuemRetirou],
    ["CPF:", dadosRetirada.cpfQuemRetirou || "N/A"],
    ["Telefone:", dadosRetirada.telefoneQuemRetirou || "N/A"],
    ["Porteiro:", dadosRetirada.nomePorteiro],
  ];

  if (dadosRetirada.observacoes) {
    infoRetirada.push(["Observações:", dadosRetirada.observacoes]);
  }

  infoRetirada.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 15, yPosition);
    doc.setFont("helvetica", "normal");
    
    // Quebrar texto longo em múltiplas linhas
    const maxWidth = 130;
    const lines = doc.splitTextToSize(value, maxWidth);
    doc.text(lines, 60, yPosition);
    yPosition += 7 * lines.length;
  });

  yPosition += 5;

  // ========================================
  // ASSINATURAS
  // ========================================
  if (dadosRetirada.assinaturaMorador || dadosRetirada.assinaturaPorteiro) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Assinaturas", 15, yPosition);
    
    yPosition += 10;

    const assinaturaWidth = 80;
    const assinaturaHeight = 30;
    const spacing = 10;

    // Assinatura do Morador
    if (dadosRetirada.assinaturaMorador) {
      try {
        doc.addImage(
          dadosRetirada.assinaturaMorador,
          "PNG",
          15,
          yPosition,
          assinaturaWidth,
          assinaturaHeight
        );
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Assinatura do Morador", 15, yPosition + assinaturaHeight + 5);
        doc.line(15, yPosition + assinaturaHeight + 2, 15 + assinaturaWidth, yPosition + assinaturaHeight + 2);
      } catch (error) {
        console.error("Erro ao adicionar assinatura do morador:", error);
      }
    }

    // Assinatura do Porteiro
    if (dadosRetirada.assinaturaPorteiro) {
      try {
        const xPorteiro = 15 + assinaturaWidth + spacing;
        doc.addImage(
          dadosRetirada.assinaturaPorteiro,
          "PNG",
          xPorteiro,
          yPosition,
          assinaturaWidth,
          assinaturaHeight
        );
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Assinatura do Porteiro", xPorteiro, yPosition + assinaturaHeight + 5);
        doc.line(xPorteiro, yPosition + assinaturaHeight + 2, xPorteiro + assinaturaWidth, yPosition + assinaturaHeight + 2);
      } catch (error) {
        console.error("Erro ao adicionar assinatura do porteiro:", error);
      }
    }

    yPosition += assinaturaHeight + 15;
  }

  // ========================================
  // QR CODE DE VALIDAÇÃO
  // ========================================
  try {
    const qrCodeData = JSON.stringify({
      protocolo: correspondencia.protocolo,
      dataRetirada: dadosRetirada.dataHoraRetirada,
      cpf: dadosRetirada.cpfQuemRetirou,
      codigo: dadosRetirada.codigoVerificacao,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      width: 400,
      margin: 1,
    });

    // Posicionar QR Code no canto inferior direito
    const qrSize = 40;
    const qrX = pageWidth - qrSize - 15;
    const qrY = pageHeight - qrSize - 15;

    doc.addImage(qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Validação", qrX + qrSize / 2, qrY + qrSize + 5, { align: "center" });
  } catch (error) {
    console.error("Erro ao gerar QR Code:", error);
  }

  // ========================================
  // CÓDIGO DE VERIFICAÇÃO
  // ========================================
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(`Código de Verificação: ${dadosRetirada.codigoVerificacao}`, 15, pageHeight - 15);

  // ========================================
  // RODAPÉ
  // ========================================
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Este documento é válido como comprovante de retirada de correspondência.",
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  // Retornar PDF como Blob
  return doc.output("blob");
}

export async function downloadReciboPDF(
  params: GerarReciboPDFParams,
  nomeArquivo?: string
): Promise<void> {
  const pdfBlob = await gerarReciboPDF(params);
  const url = URL.createObjectURL(pdfBlob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo || `recibo-${params.correspondencia.protocolo}.pdf`;
  link.click();
  
  URL.revokeObjectURL(url);
}

export async function visualizarReciboPDF(params: GerarReciboPDFParams): Promise<void> {
  const pdfBlob = await gerarReciboPDF(params);
  const url = URL.createObjectURL(pdfBlob);
  
  window.open(url, "_blank");
  
  // Limpar URL após um tempo
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}