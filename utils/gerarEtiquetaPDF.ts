import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface DadosEtiqueta {
  protocolo: string;
  condominioNome: string;
  moradorNome: string;
  bloco: string;
  apartamento: string;
  dataChegada: string;
  recebidoPor?: string; // Contém "Nome (Perfil)"
  observacao?: string;
  fotoUrl?: string; 
  logoUrl?: string; 
}

async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (e) { return ""; }
}

export async function gerarEtiquetaPDF(dados: DadosEtiqueta): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const verdeOficial = "#057321"; 

  // Carregar Logo
  let logoBase64 = "";
  if (dados.logoUrl) logoBase64 = await fetchImageAsBase64(dados.logoUrl);

  // ==========================================
  // 1. CABEÇALHO VERDE SUPERIOR
  // ==========================================
  const headerH = 35;
  
  doc.setFillColor(verdeOficial);
  doc.rect(0, 0, pageWidth, headerH, "F"); 

  // Logo (Sombra removida conforme solicitado)
  if (logoBase64) {
    // Ajustei ligeiramente o tamanho/posição para ocupar o espaço onde ficava o quadrado da sombra
    doc.addImage(logoBase64, "PNG", margin, 5, 25, 25);
  }

  // Textos do Cabeçalho
  doc.setTextColor(255, 255, 255);
  
  // Nome do Edifício
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(dados.condominioNome, margin + 35, 12);

  // Subtítulo
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestão de Encomendas", margin + 35, 18);

  // Enviado por
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Enviado por: ${dados.recebidoPor || "Sistema"}`, margin + 35, 24);

  // Data/Hora
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  // Nota: Corrigi um pequeno typo no seu código original: `Data/Hora: $` parecia incompleto
  const dataFormatada = new Date(dados.dataChegada).toLocaleString("pt-BR");
  doc.text(`Data/Hora: ${dataFormatada}`, margin + 35, 30);

  let y = 50;

  // ==========================================
  // 2. TÍTULO CENTRAL
  // ==========================================
  doc.setTextColor(40, 60, 80); 
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("AVISO DE CORRESPONDÊNCIA", pageWidth / 2, y, { align: "center" });
  
  y += 15;

  const drawSection = (title: string, height: number) => {
    doc.setFillColor(verdeOficial);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 5, y + 7);

    doc.setDrawColor(verdeOficial);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, height + 10, 2, 2, "S"); 
    
    return y + 15; 
  };

  // ==========================================
  // 3. SEÇÃO: DESTINATÁRIO
  // ==========================================
  let contentY = drawSection("DESTINATÁRIO", 35);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  const gap = 8;

  doc.setFont("helvetica", "bold");
  doc.text("• Morador:", margin + 5, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(dados.moradorNome, margin + 30, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold");
  doc.text("• Bloco:", margin + 5, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(`${dados.bloco}   |   Apartamento: ${dados.apartamento}`, margin + 30, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold");
  doc.text("• Protocolo:", margin + 5, contentY);
  doc.setFontSize(14); 
  doc.text(`#${dados.protocolo}`, margin + 30, contentY);

  y += 55; 

  // ==========================================
  // 4. SEÇÃO: OBSERVAÇÕES
  // ==========================================
  contentY = drawSection("OBSERVAÇÕES", 25);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  
  const obsTexto = dados.observacao || "Sem observações registradas.";
  const obsLines = doc.splitTextToSize(obsTexto, contentWidth - 10);
  doc.text(obsLines, margin + 5, contentY);

  y += 45; 

  // ==========================================
  // 5. SEÇÃO: FOTO E QR CODE
  // ==========================================
  if (y + 90 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
  }

  contentY = drawSection("FOTO E RETIRADA DA CORRESPONDÊNCIA", 90);
  
  const colWidth = contentWidth / 2;
  const centerX1 = margin + (colWidth / 2);
  const centerX2 = margin + colWidth + (colWidth / 2);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(verdeOficial);
  doc.text("FOTO", centerX1, contentY, { align: "center" });
  doc.text("RETIRADA", centerX2, contentY, { align: "center" });

  // FOTO
  if (dados.fotoUrl && dados.fotoUrl.length > 100) {
      try {
          const imgProps = doc.getImageProperties(dados.fotoUrl);
          const maxW = colWidth - 10;
          const maxH = 70;
          const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          const fw = imgProps.width * ratio;
          const fh = imgProps.height * ratio;
          
          doc.addImage(dados.fotoUrl, "JPEG", centerX1 - (fw/2), contentY + 5, fw, fh);
      } catch (e) { }
  } else {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Sem foto registrada", centerX1, contentY + 30, { align: "center" });
  }

  // QR CODE
  try {
      const qrData = JSON.stringify({ p: dados.protocolo, d: dados.dataChegada });
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });
      const qrSize = 50;
      doc.addImage(qrDataUrl, "PNG", centerX2 - (qrSize/2), contentY + 5, qrSize, qrSize);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Apresente o QR CODE", centerX2, contentY + qrSize + 10, { align: "center" });
      doc.text("ou número de protocolo", centerX2, contentY + qrSize + 14, { align: "center" });
  } catch (e) { }

  // ==========================================
  // RODAPÉ (NOVO ESTILO VERDE)
  // ==========================================
  const pageH = doc.internal.pageSize.getHeight();
  const footerHeight = 20; // Altura do rodapé

  // Retângulo Verde do Rodapé
  doc.setFillColor(verdeOficial);
  doc.rect(0, pageH - footerHeight, pageWidth, footerHeight, "F");

  // Texto do Rodapé
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255); // Cor branca
  doc.setFont("helvetica", "italic");
  
  doc.text(
    `Documento gerado automaticamente em ${new Date().toLocaleString("pt-BR")}`, 
    pageWidth / 2, 
    pageH - (footerHeight / 2) + 3, // Centralizado verticalmente no rodapé
    { align: "center" }
  );

  return doc.output("blob");
}
