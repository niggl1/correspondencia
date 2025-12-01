import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { DadosRetirada } from "@/types/retirada.types";

interface GerarReciboPDFParams {
  correspondencia: any;
  dadosRetirada: DadosRetirada;
  nomeCondominio?: string;
  logoUrl?: string;
  onProgress?: (progress: number) => void;
}

// Timeout máximo por imagem (6 segundos)
const IMAGE_TIMEOUT_MS = 6000;

async function fetchAndCompressImage(url: string, isPhoto: boolean = false): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  // Promessa de download e processamento
  const processPromise = new Promise<string>(async (resolve) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        resolve(""); 
        return;
      }
      const blob = await response.blob();
      const img = await createImageBitmap(blob);
      
      // OTIMIZAÇÃO AGRESSIVA: 350px é suficiente para recibo
      const MAX_WIDTH = isPhoto ? 350 : 200; 
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

      ctx.drawImage(img, 0, 0, width, height);

      // Qualidade 0.5 (Rápido e leve)
      if (isPhoto) {
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    } catch (error) {
      console.warn("Falha img:", url);
      resolve("");
    }
  });

  // Promessa de Timeout
  const timeoutPromise = new Promise<string>((resolve) => {
    setTimeout(() => {
      console.warn("Timeout imagem:", url);
      resolve(""); // Retorna vazio se estourar o tempo
    }, IMAGE_TIMEOUT_MS);
  });

  // Retorna quem terminar primeiro (Race Condition)
  return Promise.race([processPromise, timeoutPromise]);
}

export async function gerarReciboPDF({
  correspondencia,
  dadosRetirada,
  nomeCondominio = "Condomínio",
  logoUrl,
  onProgress,
}: GerarReciboPDFParams): Promise<Blob> {
  
  if (onProgress) onProgress(5);

  const qrCodeData = JSON.stringify({
    p: correspondencia.protocolo,
    d: dadosRetirada.dataHoraRetirada,
    c: dadosRetirada.cpfQuemRetirou,
    v: dadosRetirada.codigoVerificacao
  });

  // Inicia tarefas em paralelo com Timeout Individual
  const tasks = [
    { id: 'logo', fn: () => logoUrl ? fetchAndCompressImage(logoUrl, false) : Promise.resolve("") },
    { id: 'foto', fn: () => dadosRetirada.fotoComprovanteUrl ? fetchAndCompressImage(dadosRetirada.fotoComprovanteUrl, true) : Promise.resolve("") },
    { id: 'assMorador', fn: () => dadosRetirada.assinaturaMorador ? fetchAndCompressImage(dadosRetirada.assinaturaMorador, false) : Promise.resolve("") },
    { id: 'assPorteiro', fn: () => dadosRetirada.assinaturaPorteiro ? fetchAndCompressImage(dadosRetirada.assinaturaPorteiro, false) : Promise.resolve("") },
    { id: 'qr', fn: () => QRCode.toDataURL(qrCodeData, { width: 250, margin: 1, errorCorrectionLevel: 'L' }) },
  ];

  let completedCount = 0;
  
  const results = await Promise.all(tasks.map(async (task) => {
    const res = await task.fn();
    completedCount++;
    // Barra de progresso mais fluida
    const percent = 5 + Math.round((completedCount / tasks.length) * 85);
    if (onProgress) onProgress(percent);
    return res;
  }));

  const [
    logoBase64,
    fotoBase64,
    assinaturaMoradorBase64,
    assinaturaPorteiroBase64,
    qrCodeBase64
  ] = results;

  if (onProgress) onProgress(95);

  // --- CRIAÇÃO DO PDF (Síncrona - jsPDF) ---
  // compress: true ajuda a manter o arquivo final pequeno
  const doc = new jsPDF({ compress: true });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  let yPosition = 15;

  // 1. Cabeçalho
  const headerHeight = 30;
  doc.setFillColor(5, 115, 33);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  if (logoBase64) doc.addImage(logoBase64, "PNG", margin, 5, 18, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE RETIRADA", pageWidth / 2, 14, { align: "center" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(nomeCondominio, pageWidth / 2, 22, { align: "center" });

  yPosition = headerHeight + 10;
  const lineHeight = 5.5;

  // 2. Dados Correspondência
  doc.setFillColor(5, 115, 33);
  doc.roundedRect(margin, yPosition, contentWidth, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DA CORRESPONDÊNCIA", margin + 3, yPosition + 5);
  
  yPosition += 7;
  const boxHeightCorr = 38;
  doc.setDrawColor(5, 115, 33);
  doc.setLineWidth(0.2);
  doc.rect(margin, yPosition, contentWidth, boxHeightCorr); 
  yPosition += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

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
    doc.text(label, margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 40, yPosition);
    yPosition += lineHeight;
  });

  yPosition = (headerHeight + 10) + 7 + boxHeightCorr + 8;

  // 3. Dados Retirada
  doc.setFillColor(5, 115, 33);
  doc.roundedRect(margin, yPosition, contentWidth, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DADOS DA RETIRADA", margin + 3, yPosition + 5);
  
  yPosition += 7;
  let boxHeightRet = 32;
  if (dadosRetirada.observacoes && dadosRetirada.observacoes.length > 50) boxHeightRet += 8;
  doc.setDrawColor(5, 115, 33);
  doc.rect(margin, yPosition, contentWidth, boxHeightRet);
  yPosition += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const infoRetirada = [
    ["Data/Hora:", new Date(dadosRetirada.dataHoraRetirada).toLocaleString("pt-BR")],
    ["Retirado por:", dadosRetirada.nomeQuemRetirou],
    ["Documento (CPF):", dadosRetirada.cpfQuemRetirou || "Não informado"],
    ["Porteiro resp.:", dadosRetirada.nomePorteiro],
  ];
  if (dadosRetirada.observacoes) infoRetirada.push(["Observações:", dadosRetirada.observacoes]);

  infoRetirada.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 130);
    doc.text(lines, margin + 40, yPosition);
    yPosition += lineHeight * lines.length;
  });

  yPosition = (headerHeight + 10 + 7 + boxHeightCorr + 8) + 7 + boxHeightRet + 8;

  // 4. Assinaturas
  if (yPosition > pageHeight - 70) { doc.addPage(); yPosition = 15; }

  if (assinaturaMoradorBase64 || assinaturaPorteiroBase64) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Assinaturas", margin, yPosition);
    yPosition += 3;
    const sigW = 50;
    const sigH = 20;

    if (assinaturaMoradorBase64) {
      doc.addImage(assinaturaMoradorBase64, "PNG", margin, yPosition, sigW, sigH);
      doc.setLineWidth(0.1);
      doc.line(margin, yPosition + sigH, margin + sigW, yPosition + sigH);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("Morador/Retirante", margin, yPosition + sigH + 3);
    }

    if (assinaturaPorteiroBase64) {
      const xPorteiro = pageWidth - margin - sigW;
      doc.addImage(assinaturaPorteiroBase64, "PNG", xPorteiro, yPosition, sigW, sigH);
      doc.setLineWidth(0.1);
      doc.line(xPorteiro, yPosition + sigH, xPorteiro + sigW, yPosition + sigH);
      doc.text("Porteiro Responsável", xPorteiro, yPosition + sigH + 3);
    }
    yPosition += sigH + 8;
  }

  // 5. Validação
  const validationFrameHeight = 55;
  if (yPosition + validationFrameHeight > pageHeight - 10) {
    doc.addPage();
    yPosition = 15;
  }

  doc.setFillColor(230, 230, 230);
  doc.rect(margin, yPosition, contentWidth, 6, "F");
  doc.setDrawColor(150, 150, 150);
  doc.rect(margin, yPosition, contentWidth, validationFrameHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("REGISTRO VISUAL E VALIDAÇÃO", margin + 3, yPosition + 4.5);

  const frameYStart = yPosition + 6;
  const frameHeightInner = validationFrameHeight - 6;
  const columnWidth = contentWidth / 2;

  doc.line(margin + columnWidth, frameYStart, margin + columnWidth, yPosition + validationFrameHeight);

  // Foto
  if (fotoBase64) {
    try {
      const imgProps = doc.getImageProperties(fotoBase64);
      const maxBoxW = columnWidth - 10;
      const maxBoxH = frameHeightInner - 8;
      const scale = Math.min(maxBoxW / imgProps.width, maxBoxH / imgProps.height);
      const finalW = imgProps.width * scale;
      const finalH = imgProps.height * scale;
      const xImg = margin + (columnWidth - finalW) / 2;
      const yImg = frameYStart + (frameHeightInner - finalH) / 2;
      doc.addImage(fotoBase64, "JPEG", xImg, yImg, finalW, finalH);
    } catch (e) {}
  } else {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(dadosRetirada.fotoComprovanteUrl ? "(Erro ao carregar imagem)" : "Sem foto", margin + (columnWidth/2), frameYStart + (frameHeightInner/2), { align: "center" });
  }

  // QR Code
  if (qrCodeBase64) {
    const qrSize = 35;
    const xQr = margin + columnWidth + (columnWidth - qrSize) / 2;
    const yQr = frameYStart + (frameHeightInner - qrSize) / 2 - 3;
    doc.addImage(qrCodeBase64, "PNG", xQr, yQr, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text("Validação Digital", xQr + (qrSize/2), yQr + qrSize + 4, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`Cód: ${dadosRetirada.codigoVerificacao}`, xQr + (qrSize/2), yQr + qrSize + 8, { align: "center" });
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Gerado pelo App Correspondência.", pageWidth / 2, pageHeight - 5, { align: "center" });

  if (onProgress) onProgress(100);
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
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
