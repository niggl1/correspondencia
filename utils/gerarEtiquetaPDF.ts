import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface DadosEtiqueta {
  protocolo: string;
  condominioNome: string;
  moradorNome: string;
  bloco: string;
  apartamento: string;
  dataChegada: string;
  recebidoPor?: string;
  observacao?: string;
  fotoUrl?: string; 
  logoUrl?: string;
  localRetirada?: string;
}

// --- FUNÇÃO DE IMAGEM SEGURA ---
async function processarImagem(url: string, isLogo: boolean): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return "";
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    const MAX_WIDTH = isLogo ? 150 : 400; 
    let width = imgBitmap.width;
    let height = imgBitmap.height;

    if (width > MAX_WIDTH) {
      height = height * (MAX_WIDTH / width);
      width = MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";

    if (isLogo) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(imgBitmap, 0, 0, width, height);
        return canvas.toDataURL('image/png'); 
    } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(imgBitmap, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.7); 
    }
  } catch (e) {
    return ""; 
  }
}

export async function gerarEtiquetaPDF(dados: DadosEtiqueta): Promise<Blob> {
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth(); 
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const verdeOficial = "#057321"; 

  // Proteção contra valores undefined/null
  const safeText = (text: string | undefined) => text || "-";

  const qrString = JSON.stringify({ p: dados.protocolo, d: dados.dataChegada });
  
  const [logoBase64, fotoBase64, qrCodeUrl] = await Promise.all([
      processarImagem(dados.logoUrl || "", true),
      processarImagem(dados.fotoUrl || "", false),
      QRCode.toDataURL(qrString, { width: 200, margin: 1 })
  ]);

  // ==========================================
  // 1. CABEÇALHO
  // ==========================================
  
    doc.setFillColor(verdeOficial);
  doc.rect(0, 0, pageWidth, 35, "F"); 

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, 5.5, 24, 24);
    } catch (e) {}
  }

  // === CORREÇÃO DO NOME DO CONDOMÍNIO ===
  doc.setTextColor(255, 255, 255);
  
  // Pega o nome completo (sem cortar com substring)
  const nomeCondominio = safeText(dados.condominioNome);

  // Lógica inteligente de tamanho da fonte
  let tamanhoFonte = 16; // Tamanho padrão
  if (nomeCondominio.length > 40) {
    tamanhoFonte = 10; // Muito longo
  } else if (nomeCondominio.length > 30) {
    tamanhoFonte = 12; // Longo
  } else if (nomeCondominio.length > 24) {
    tamanhoFonte = 14; // Médio
  }

  doc.setFontSize(tamanhoFonte);
  doc.setFont("helvetica", "bold");
  
  // Desenha o nome completo
  doc.text(nomeCondominio, margin + 35, 12);
  // ======================================

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestão de Encomendas", margin + 35, 18);

  doc.setFont("helvetica", "bold");
  doc.text(`Resp: ${safeText(dados.recebidoPor)}`, margin + 35, 24);

  doc.setFont("helvetica", "normal");
  const dataFormatada = new Date(dados.dataChegada).toLocaleString("pt-BR");
  doc.text(`Data: ${dataFormatada}`, margin + 35, 30);

  let y = 50;

  // ==========================================
  // 2. TÍTULO
  // ==========================================
  doc.setTextColor(40, 60, 80); 
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("AVISO DE CHEGADA", pageWidth / 2, y, { align: "center" });
  
  y += 15;

  // Função auxiliar ajustada
  const drawSection = (title: string, height: number) => {
    // Header da seção
    doc.setFillColor(verdeOficial);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 5, y + 5.5);

    // Borda da seção
    doc.setDrawColor(verdeOficial);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, contentWidth, height + 8, 1, 1, "S"); 
    
    return y + 12; 
  };
  
  // ==========================================
  // 3. DESTINATÁRIO
  // ==========================================
  // Aumentei a altura para garantir que cabe tudo
  let contentY = drawSection("DESTINATÁRIO", 36);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const gap = 7;

  doc.setFont("helvetica", "bold"); doc.text("Morador:", margin + 5, contentY);
  doc.setFont("helvetica", "normal"); doc.text(safeText(dados.moradorNome), margin + 25, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold"); doc.text("Unidade:", margin + 5, contentY);
  doc.setFont("helvetica", "normal"); doc.text(`${safeText(dados.bloco)} - ${safeText(dados.apartamento)}`, margin + 25, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold"); doc.text("Protocolo:", margin + 5, contentY);
  doc.setFontSize(12); doc.text(`#${safeText(dados.protocolo)}`, margin + 25, contentY);

  y += 55; // Espaço maior para a próxima seção

  // ==========================================
  // 4. LOCAL DE RETIRADA
  // ==========================================
  contentY = drawSection("LOCAL DE RETIRADA", 16);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12); 
  doc.setFont("helvetica", "bold");
  
  const local = dados.localRetirada || "Portaria";
  doc.text(local.toUpperCase(), margin + 5, contentY + 4); // +4 para centralizar melhor verticalmente

  y += 35;

  // ==========================================
  // 5. OBSERVAÇÕES
  // ==========================================
  contentY = drawSection("OBSERVAÇÕES", 24);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const obsTexto = dados.observacao || "Sem observações";
  // Proteção no splitText
  const obsLines = doc.splitTextToSize(String(obsTexto), contentWidth - 10);
  doc.text(obsLines, margin + 5, contentY);

  y += 45; 

  // ==========================================
  // 6. FOTO E QR CODE
  // ==========================================
  // Verifica se precisa de nova página
  if (y + 80 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 20;
  }

  contentY = drawSection("VISUAL E RETIRADA", 80);
  
  const colWidth = contentWidth / 2;
  const centerX1 = margin + (colWidth / 2);
  const centerX2 = margin + colWidth + (colWidth / 2);

  // FOTO
  if (fotoBase64) {
      try {
          const imgProps = doc.getImageProperties(fotoBase64);
          const maxW = colWidth - 6;
          const maxH = 65;
          const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          doc.addImage(fotoBase64, "JPEG", centerX1 - ((imgProps.width * ratio)/2), contentY, imgProps.width * ratio, imgProps.height * ratio);
      } catch (e) {}
  } else {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Sem foto", centerX1, contentY + 30, { align: "center" });
  }

  // QR CODE
  try {
      const qrSize = 45;
      doc.addImage(qrCodeUrl, "PNG", centerX2 - (qrSize/2), contentY + 5, qrSize, qrSize);
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      doc.text("Apresente este código", centerX2, contentY + qrSize + 8, { align: "center" });
  } catch (e) {}

  // ==========================================
  // RODAPÉ
  // ==========================================
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(verdeOficial);
  doc.rect(0, pageH - 15, pageWidth, 15, "F");

  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255); 
  doc.text("Gerado via App Correspondência", pageWidth / 2, pageH - 6, { align: "center" });

  return doc.output("blob");
}

