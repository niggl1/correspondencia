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
}

// --- OTIMIZAÇÃO AGRESSIVA DE IMAGEM ---
const IMAGE_TIMEOUT_MS = 4000; // 4 segundos max

async function fetchAndCompressImage(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  const processPromise = new Promise<string>(async (resolve) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) { resolve(""); return; }
      const blob = await response.blob();
      const img = await createImageBitmap(blob);
      
      // LARGURA MÁXIMA 250px (Suficiente para A4 e Celular)
      const MAX_WIDTH = 250; 
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = height * (MAX_WIDTH / width);
        width = MAX_WIDTH;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(""); return; }

      ctx.fillStyle = "#FFFFFF"; 
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // QUALIDADE 0.4 (40%) -> Arquivo minúsculo
      resolve(canvas.toDataURL('image/jpeg', 0.4)); 
    } catch (error) {
      resolve("");
    }
  });

  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => resolve(""), IMAGE_TIMEOUT_MS);
  });

  return Promise.race([processPromise, timeoutPromise]);
}

export async function gerarEtiquetaPDF(dados: DadosEtiqueta): Promise<Blob> {
  // compress: true ATIVADO PARA REDUZIR TEXTO
  const doc = new jsPDF({ compress: true });
  
  const pageWidth = doc.internal.pageSize.getWidth(); 
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const verdeOficial = "#057321"; 

  // Gera QR Code mais simples e leve (Level L = Low Error Correction, menos dados)
  const qrOptions = { width: 150, margin: 0, errorCorrectionLevel: 'L' as const };
  const qrString = JSON.stringify({ p: dados.protocolo, d: dados.dataChegada });

  // Carregar tudo em paralelo
  const [logoBase64, fotoBase64, qrCodeUrl] = await Promise.all([
      dados.logoUrl ? fetchAndCompressImage(dados.logoUrl) : Promise.resolve(""),
      dados.fotoUrl ? fetchAndCompressImage(dados.fotoUrl) : Promise.resolve(""),
      QRCode.toDataURL(qrString, qrOptions)
  ]);

  // ==========================================
  // 1. CABEÇALHO
  // ==========================================
  doc.setFillColor(verdeOficial);
  doc.rect(0, 0, pageWidth, 35, "F"); 

  if (logoBase64) doc.addImage(logoBase64, "JPEG", margin, 5, 25, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(dados.condominioNome.substring(0, 25), margin + 35, 12); // Limita tamanho nome

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Gestão de Encomendas", margin + 35, 18);

  doc.setFont("helvetica", "bold");
  doc.text(`Resp: ${dados.recebidoPor || "Sistema"}`, margin + 35, 24);

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

  const drawSection = (title: string, height: number) => {
    doc.setFillColor(verdeOficial);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 5, y + 5.5);
    
    doc.setDrawColor(verdeOficial);
    doc.setLineWidth(0.2); // Linha mais fina economiza bytes no render
    doc.roundedRect(margin, y, contentWidth, height + 8, 1, 1, "S"); 
    return y + 12; 
  };

  // ==========================================
  // 3. DESTINATÁRIO
  // ==========================================
  let contentY = drawSection("DESTINATÁRIO", 32);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10); // Fonte 10 é ótima para A4/Celular
  const gap = 7;

  doc.setFont("helvetica", "bold"); doc.text("Morador:", margin + 5, contentY);
  doc.setFont("helvetica", "normal"); doc.text(dados.moradorNome, margin + 25, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold"); doc.text("Unidade:", margin + 5, contentY);
  doc.setFont("helvetica", "normal"); doc.text(`${dados.bloco} - ${dados.apartamento}`, margin + 25, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold"); doc.text("Protocolo:", margin + 5, contentY);
  doc.setFontSize(12); 
  doc.text(`#${dados.protocolo}`, margin + 25, contentY);

  y += 50; 

  // ==========================================
  // 4. OBSERVAÇÕES
  // ==========================================
  contentY = drawSection("OBSERVAÇÕES", 22);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  
  const obsTexto = dados.observacao || "-";
  // Split text otimizado
  const obsLines = doc.splitTextToSize(obsTexto, contentWidth - 10);
  doc.text(obsLines, margin + 5, contentY);

  y += 40; 

  // ==========================================
  // 5. FOTO E QR CODE
  // ==========================================
  if (y + 80 > doc.internal.pageSize.getHeight()) { doc.addPage(); y = 20; }

  contentY = drawSection("VISUAL E RETIRADA", 80);
  
  const colWidth = contentWidth / 2;
  const centerX1 = margin + (colWidth / 2);
  const centerX2 = margin + colWidth + (colWidth / 2);

  // FOTO (Comprimida)
  if (fotoBase64) {
      try {
          const imgProps = doc.getImageProperties(fotoBase64);
          const maxW = colWidth - 6;
          const maxH = 65;
          const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          doc.addImage(fotoBase64, "JPEG", centerX1 - ((imgProps.width * ratio)/2), contentY, imgProps.width * ratio, imgProps.height * ratio);
      } catch (e) { }
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
  } catch (e) { }

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

