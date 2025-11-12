"use client";

import { useState } from "react";
import { db, storage } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import imageCompression from "browser-image-compression";

// ========================================
// FUNÇÃO: Gerar PDF Profissional
// ========================================
async function gerarPDFProfissional(dados: {
  condominioNome: string;
  condominioEndereco: string;
  porteiroNome: string;
  moradorNome: string;
  blocoNome: string;
  apartamento: string;
  protocolo: string;
  observacao: string;
  dataHora: string;
  imagemUrl?: string;
  qrCodeDataUrl: string;
}): Promise<jsPDF> {
  console.log("📄 Gerando PDF com dados:", {
    ...dados,
    imagemUrl: dados.imagemUrl ? `✅ Presente (${dados.imagemUrl.substring(0, 50)}...)` : "❌ Ausente",
  });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ========================================
  // 1. CABEÇALHO AZUL COM LOGO MOCKUP
  // ========================================
  const headerHeight = 50;
  doc.setFillColor(41, 128, 185); // #2980b9
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // ✅ Mockup de logo (círculo cinza com texto)
  const logoX = 15;
  const logoY = 10;
  const logoSize = 30;
  
  // Círculo cinza para logo
  doc.setFillColor(236, 240, 241); // #ecf0f1 (cinza claro)
  doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, "F");
  
  // Texto "LOGO" dentro do círculo
  doc.setTextColor(149, 165, 166); // #95a5a6 (cinza médio)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("LOGO DO", logoX + logoSize/2, logoY + logoSize/2 - 2, { align: "center" });
  doc.text("CONDOMÍNIO", logoX + logoSize/2, logoY + logoSize/2 + 3, { align: "center" });

  // Informações do condomínio (ao lado do logo)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(dados.condominioNome, logoX + logoSize + 10, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(dados.condominioEndereco, logoX + logoSize + 10, 28);
  doc.text(`Porteiro: ${dados.porteiroNome}`, logoX + logoSize + 10, 35);
  doc.text(`Data/Hora: ${dados.dataHora}`, logoX + logoSize + 10, 42);

  // ========================================
  // 2. TÍTULO - ✅ ESPAÇAMENTO AUMENTADO
  // ========================================
  let yPos = headerHeight + 20; // ✅ 20mm de espaço
  doc.setTextColor(52, 73, 94);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("AVISO DE CORRESPONDÊNCIA", pageWidth / 2, yPos, { align: "center" });

  yPos += 15;

  // ========================================
  // 3. SEÇÃO DESTINATÁRIO
  // ========================================
  const sectionPadding = 5;
  const sectionWidth = pageWidth - 30;
  const sectionX = 15;

  // Cabeçalho da seção
  doc.setFillColor(41, 128, 185);
  doc.roundedRect(sectionX, yPos, sectionWidth, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DESTINATÁRIO", sectionX + sectionPadding, yPos + 7);

  yPos += 10;

  // Conteúdo da seção
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  const destinatarioHeight = 25;
  doc.roundedRect(sectionX, yPos, sectionWidth, destinatarioHeight, 2, 2, "S");

  doc.setTextColor(52, 73, 94);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`• Morador: ${dados.moradorNome}`, sectionX + sectionPadding, yPos + 7);
  doc.text(`• Bloco: ${dados.blocoNome}  |  Apartamento: ${dados.apartamento}`, sectionX + sectionPadding, yPos + 14);
  
  // ✅ Protocolo em destaque (negrito e maior)
  doc.text(`• Protocolo: `, sectionX + sectionPadding, yPos + 21);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`#${dados.protocolo}`, sectionX + sectionPadding + 22, yPos + 21);

  yPos += destinatarioHeight + 10;

  // ========================================
  // 4. SEÇÃO OBSERVAÇÕES
  // ========================================
  doc.setFillColor(41, 128, 185);
  doc.roundedRect(sectionX, yPos, sectionWidth, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES", sectionX + sectionPadding, yPos + 7);

  yPos += 10;

  const observacaoHeight = 20;
  doc.setDrawColor(41, 128, 185);
  doc.roundedRect(sectionX, yPos, sectionWidth, observacaoHeight, 2, 2, "S");

  doc.setTextColor(52, 73, 94);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const observacaoTexto = dados.observacao || "Sem observações";
  doc.text(observacaoTexto, sectionX + sectionPadding, yPos + 7, {
    maxWidth: sectionWidth - 2 * sectionPadding,
  });

  yPos += observacaoHeight + 10;

  // ========================================
  // 5. ✅ NOVA SEÇÃO: FOTO E RETIRADA (LADO A LADO)
  // ========================================
  
  // Cabeçalho da seção
  doc.setFillColor(41, 128, 185);
  doc.roundedRect(sectionX, yPos, sectionWidth, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FOTO E RETIRADA DA CORRESPONDÊNCIA", sectionX + sectionPadding, yPos + 7);

  yPos += 10;

  // Container da seção (altura fixa para ambos)
  const containerHeight = 75;
  doc.setDrawColor(41, 128, 185);
  doc.roundedRect(sectionX, yPos, sectionWidth, containerHeight, 2, 2, "S");

  // Calcular largura de cada coluna (50% cada, com espaçamento)
  const columnWidth = (sectionWidth - sectionPadding * 3) / 2;
  const leftColumnX = sectionX + sectionPadding;
  const rightColumnX = sectionX + sectionPadding * 2 + columnWidth;

  // ========================================
  // 5.1 COLUNA ESQUERDA: FOTO
  // ========================================
  if (dados.imagemUrl) {
    console.log("📸 Tentando adicionar imagem ao PDF:", dados.imagemUrl);
    
    try {
      // Título da coluna
      doc.setTextColor(41, 128, 185);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("FOTO", leftColumnX + columnWidth / 2, yPos + 5, { align: "center" });

      // Tentar adicionar a imagem
      const imageSize = 60;
      const imageX = leftColumnX + (columnWidth - imageSize) / 2;
      const imageY = yPos + 8;

      try {
        // Converter imagem para base64 se necessário
        let imagemBase64 = dados.imagemUrl;
        
        // Se for URL do Firebase, buscar como blob e converter
        if (dados.imagemUrl.startsWith("http")) {
          console.log("🔄 Baixando imagem do Firebase...");
          const response = await fetch(dados.imagemUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const blob = await response.blob();
          console.log("✅ Imagem baixada, tamanho:", blob.size, "bytes, tipo:", blob.type);
          
          imagemBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log("✅ Imagem convertida para base64");
              resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        // Detectar formato da imagem
        let format = "JPEG";
        if (imagemBase64.includes("data:image/png")) {
          format = "PNG";
        } else if (imagemBase64.includes("data:image/webp")) {
          format = "WEBP";
        }
        console.log("🖼️ Formato detectado:", format);

        // Adicionar imagem ao PDF
        doc.addImage(imagemBase64, format, imageX, imageY, imageSize, imageSize);
        console.log("✅ Imagem adicionada ao PDF com sucesso!");
      } catch (imgError: any) {
        console.error("❌ Erro ao adicionar imagem ao PDF:", imgError);
        
        // Fallback: mostrar mensagem de erro
        doc.setTextColor(192, 57, 43); // vermelho
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("Erro ao carregar", leftColumnX + columnWidth / 2, imageY + imageSize / 2 - 3, {
          align: "center",
        });
        doc.setFontSize(7);
        doc.text(imgError.message || "Erro desconhecido", leftColumnX + columnWidth / 2, imageY + imageSize / 2 + 2, {
          align: "center",
          maxWidth: columnWidth - 10,
        });
      }
    } catch (sectionError: any) {
      console.error("❌ Erro ao criar coluna de imagem:", sectionError);
    }
  } else {
    console.log("⚠️ Nenhuma imagem fornecida para o PDF");
    
    // Mostrar mensagem "Sem foto"
    doc.setTextColor(149, 165, 166);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Sem foto", leftColumnX + columnWidth / 2, yPos + containerHeight / 2, {
      align: "center",
    });
  }

  // ========================================
  // 5.2 COLUNA DIREITA: QR CODE
  // ========================================
  
  // Título da coluna
  doc.setTextColor(41, 128, 185);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RETIRADA", rightColumnX + columnWidth / 2, yPos + 5, { align: "center" });

  // QR Code centralizado na coluna direita
  const qrSize = 50;
  const qrX = rightColumnX + (columnWidth - qrSize) / 2;
  const qrY = yPos + 8;
  doc.addImage(dados.qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // Texto abaixo do QR Code
  doc.setTextColor(52, 73, 94);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Apresente o QR CODE",
    rightColumnX + columnWidth / 2,
    qrY + qrSize + 4,
    { align: "center" }
  );
  doc.text(
    "ou número de protocolo",
    rightColumnX + columnWidth / 2,
    qrY + qrSize + 8,
    { align: "center" }
  );

  yPos += containerHeight + 10;

  // ========================================
  // 6. RODAPÉ
  // ========================================
  doc.setTextColor(149, 165, 166);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    `Documento gerado automaticamente em ${new Date().toLocaleString("pt-BR")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  // ========================================
  // 7. RETORNAR OBJETO jsPDF
  // ========================================
  console.log("✅ PDF gerado com sucesso!");
  return doc;
}

// ========================================
// HOOK: useCorrespondencias
// ========================================
export function useCorrespondencias() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // ========================================
  // Função: Comprimir Imagem
  // ========================================
  const comprimirImagem = async (file: File): Promise<File> => {
    // ✅ VALIDAÇÃO: Verificar se é um File válido
    if (!file) {
      console.error("❌ Erro: file é null ou undefined");
      throw new Error("Arquivo não fornecido para compressão");
    }
    
    if (typeof file === 'string') {
      console.error("❌ Erro: objeto não é um File válido (é uma string/URL)", file);
      throw new Error("Não é possível comprimir uma URL. Forneça um File object.");
    }
    
    if (!(file instanceof File)) {
      console.error("❌ Erro: objeto não é um File válido", typeof file, file);
      throw new Error("Objeto fornecido não é uma instância de File");
    }

    const options = {
      maxSizeMB: 1.0, // ✅ 1MB (compressão mais rápida)
      maxWidthOrHeight: 1200, // ✅ Melhor resolução para impressão
      useWebWorker: true,
      quality: 0.85, // ✅ Melhor qualidade
      initialQuality: 0.85, // ✅ Acelera o processo
    };

    try {
      console.log("🔄 Comprimindo imagem...", {
        nome: file.name,
        tamanho: `${(file.size / 1024).toFixed(2)} KB`,
        tipo: file.type,
      });

      const compressedFile = await imageCompression(file, options);
      
      console.log("✅ Imagem comprimida:", {
        original: `${(file.size / 1024).toFixed(2)} KB`,
        comprimida: `${(compressedFile.size / 1024).toFixed(2)} KB`,
        reducao: `${(((file.size - compressedFile.size) / file.size) * 100).toFixed(1)}%`,
      });
      
      return compressedFile;
    } catch (err: any) {
      console.error("❌ Erro ao comprimir imagem:", err);
      console.log("⚠️ Usando imagem original sem compressão");
      return file; // Retorna original se falhar
    }
  };

  // ========================================
  // Função: Upload de Imagem para Firebase Storage
  // ========================================
  const uploadImagem = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const storageRef = ref(storage, `correspondencias/${timestamp}_${file.name}`);
    
    console.log("📤 Fazendo upload da imagem para Firebase Storage...");
    await uploadBytes(storageRef, file);
    
    const url = await getDownloadURL(storageRef);
    console.log("✅ Imagem enviada para Firebase:", url);
    return url;
  };

  // ========================================
  // Função: Upload de PDF para Firebase Storage
  // ========================================
  const uploadPDF = async (pdfDoc: jsPDF, protocolo: string): Promise<string> => {
    console.log("📤 Fazendo upload do PDF para Firebase Storage...");
    
    // Converter PDF para Blob
    const pdfBlob = pdfDoc.output("blob");
    console.log("✅ PDF convertido para Blob, tamanho:", pdfBlob.size, "bytes");
    
    // Upload para Firebase Storage
    const timestamp = Date.now();
    const storageRef = ref(storage, `correspondencias/pdf_${protocolo}_${timestamp}.pdf`);
    await uploadBytes(storageRef, pdfBlob);
    
    // Obter URL pública
    const url = await getDownloadURL(storageRef);
    console.log("✅ PDF enviado para Firebase:", url);
    return url;
  };

  // ========================================
  // Função: Criar Correspondência Completa
  // ========================================
  const criarCorrespondenciaCompleta = async (params: {
    condominioId: string;
    blocoId: string;
    moradorId: string;
    observacao: string;
    imagemFile: File | null;
    condominioNome?: string;
    blocoNome?: string;
    moradorNome?: string;
    apartamento?: string;
  }) => {
    setLoading(true);
    setError("");
    setProgress(0);
    setProgressMessage("Iniciando...");

    try {
      const protocolo = Math.floor(100000 + Math.random() * 900000).toString();
      const dataHora = new Date().toLocaleString("pt-BR");

      console.log("🚀 Iniciando criação de correspondência, protocolo:", protocolo);
      console.time("⏱️ Tempo total de registro");

      // ========================================
      // ETAPA 1: Processamento Paralelo
      // ========================================
      setProgress(10);
      setProgressMessage("Processando dados...");

      const tasks = [];

      // Task 1: Upload de imagem (se houver)
      let imagemUrl = "";
      if (params.imagemFile) {
        console.log("📸 Imagem fornecida:", params.imagemFile.name);
        tasks.push(
          (async () => {
            setProgressMessage("Comprimindo imagem...");
            const imagemComprimida = await comprimirImagem(params.imagemFile!);
            setProgress(30);
            setProgressMessage("Enviando imagem...");
            imagemUrl = await uploadImagem(imagemComprimida);
            setProgress(40);
            console.log("✅ Imagem processada e URL obtida:", imagemUrl);
          })()
        );
      } else {
        console.log("⚠️ Nenhuma imagem fornecida");
      }

      // Task 2: Buscar dados do morador (se não fornecidos)
      let moradorNome = params.moradorNome || "";
      let apartamento = params.apartamento || "";
      if (!moradorNome && params.moradorId) {
        tasks.push(
          (async () => {
            const mRef = doc(db, "users", params.moradorId);
            const mSnap = await getDoc(mRef);
            if (mSnap.exists()) {
              moradorNome = mSnap.data()?.nome || "";
              apartamento = mSnap.data()?.apartamento || "";
              console.log("✅ Dados do morador:", { moradorNome, apartamento });
            }
          })()
        );
      }

      // Task 3: Gerar QR Code
      let qrCodeDataUrl = "";
      tasks.push(
        (async () => {
          qrCodeDataUrl = await QRCode.toDataURL(protocolo, {
            width: 300,
            margin: 1,
          });
          console.log("✅ QR Code gerado");
        })()
      );

      // Executar todas as tasks em paralelo
      console.time("⏱️ Processamento paralelo");
      await Promise.all(tasks);
      console.timeEnd("⏱️ Processamento paralelo");

      setProgress(60);
      setProgressMessage("Salvando dados...");

      // ========================================
      // ETAPA 2: Buscar nome do porteiro
      // ========================================
      const userStr = localStorage.getItem("user");
      let porteiroNome = "Sistema";
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          porteiroNome = userData.nome || "Sistema";
          console.log("✅ Porteiro:", porteiroNome);
        } catch (e) {
          console.error("❌ Erro ao parsear user do localStorage:", e);
        }
      }

      // ✅ PDF SERÁ GERADO SOB DEMANDA (quando clicar em Baixar/WhatsApp)
      // Salvamos os dados necessários para gerar depois

      setProgress(80);
      setProgressMessage("Salvando no banco de dados...");

      // ========================================
      // ETAPA 5: Salvar no Firestore
      // ========================================
      const docRef = await addDoc(collection(db, "correspondencias"), {
        condominioId: params.condominioId,
        blocoId: params.blocoId,
        moradorId: params.moradorId,
        protocolo,
        observacao: params.observacao,
        imagemUrl,
        status: "pendente",
        criadoEm: serverTimestamp(),
        criadoPor: porteiroNome,
        // ✅ DADOS DESNORMALIZADOS (para listagem rápida)
        moradorNome: moradorNome || params.moradorNome || "",
        blocoNome: params.blocoNome || "",
        apartamento: apartamento || params.apartamento || "",
        condominioNome: params.condominioNome || "",
        // ✅ DADOS PARA GERAR PDF SOB DEMANDA
        observacao: params.observacao,
        dataHora,
        condominioEndereco: "Rua das Flores, 123, Centro",
      });

      console.log("✅ Correspondência salva no Firestore:", docRef.id);

      setProgress(100);
      setProgressMessage("Concluído!");

      console.log("✅ Correspondência registrada com sucesso!");
      console.timeEnd("⏱️ Tempo total de registro");

      setLoading(false);
      
      // ✅ GERA PDF EM BACKGROUND (não bloqueia)
      console.log("🔄 Iniciando geração de PDF em background...");
      setTimeout(async () => {
        try {
          const pdfUrl = await gerarPDFSobDemanda(docRef.id);
          if (pdfUrl) {
            console.log("✅ PDF gerado em background:", pdfUrl);
          }
        } catch (err) {
          console.error("❌ Erro ao gerar PDF em background:", err);
        }
      }, 100); // Inicia após 100ms
      
      return {
        id: docRef.id,
        protocolo,
        // PDF sendo gerado em background
      };
    } catch (err: any) {
      console.error("❌ Erro ao criar correspondência:", err);
      setError(err.message || "Erro desconhecido");
      setLoading(false);
      setProgress(0);
      setProgressMessage("");
      return null;
    }
  };

  // ========================================
  // Função: Listar Correspondências
  // ========================================
  const listarCorrespondencias = async () => {
    try {
      const q = query(collection(db, "correspondencias"));
      const snapshot = await getDocs(q);
      
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      console.log("✅ Correspondências listadas:", lista.length);
      return lista as any[];
    } catch (err: any) {
      console.error("❌ Erro ao listar correspondências:", err);
      return [];
    }
  };

  // ========================================
  // Função: Registrar Retirada
  // ========================================
  const registrarRetirada = async (
    dados: {
      id: string;
      condominioId: string;
      protocolo: string;
      condominioNome: string;
      blocoNome: string;
      moradorNome: string;
      apartamento: string;
    },
    assinaturas: {
      moradorDataUrl: string;
      porteiroDataUrl?: string;
      salvarPorteiroComoPadrao?: boolean;
    }
  ) => {
    try {
      setLoading(true);
      
      // Atualizar status no Firestore
      const docRef = doc(db, "correspondencias", dados.id);
      await updateDoc(docRef, {
        status: "retirada",
        retiradoEm: serverTimestamp(),
      });
      
      // Gerar URL do recibo (pode ser implementado depois)
      const reciboUrl = "";
      
      const mensagem = `Correspondência #${dados.protocolo} retirada com sucesso!`;
      const whatsLink = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
      const mailtoLink = `mailto:?subject=Retirada - Protocolo ${dados.protocolo}&body=${encodeURIComponent(mensagem)}`;
      
      setLoading(false);
      return {
        reciboUrl,
        whatsLink,
        mailtoLink,
      };
    } catch (err: any) {
      console.error("❌ Erro ao registrar retirada:", err);
      setLoading(false);
      return null;
    }
  };

  // ========================================
  // Função: Get Porteiro Assinatura URL
  // ========================================
  const getPorteiroAssinaturaUrl = async (porteiroId: string | null) => {
    try {
      // Implementação futura: buscar assinatura padrão do porteiro
      return null;
    } catch (err: any) {
      console.error("❌ Erro ao buscar assinatura:", err);
      return null;
    }
  };

  // ========================================
  // Função: Gerar PDF Sob Demanda
  // ========================================
  const gerarPDFSobDemanda = async (id: string) => {
    try {
      setLoading(true);
      console.log("📄 Gerando PDF sob demanda para ID:", id);
      console.time("⏱️ Geração de PDF sob demanda");
      
      // Buscar correspondência
      const docRef = doc(db, "correspondencias", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Correspondência não encontrada");
      }
      
      const data = docSnap.data();
      
      // Gerar QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(data.protocolo, {
        width: 300,
        margin: 1,
      });
      
      // Gerar PDF
      const pdfDoc = await gerarPDFProfissional({
        condominioNome: data.condominioNome || "",
        condominioEndereco: data.condominioEndereco || "Rua das Flores, 123, Centro",
        porteiroNome: data.criadoPor || "Sistema",
        moradorNome: data.moradorNome || "",
        blocoNome: data.blocoNome || "",
        apartamento: data.apartamento || "",
        protocolo: data.protocolo,
        observacao: data.observacao || "",
        dataHora: data.dataHora || new Date().toLocaleString("pt-BR"),
        imagemUrl: data.imagemUrl,
        qrCodeDataUrl,
      });
      
      // Upload do PDF para Firebase Storage
      const pdfUrl = await uploadPDF(pdfDoc, data.protocolo);
      
      // Atualizar Firestore com URL do PDF
      await updateDoc(docRef, {
        pdfUrl,
      });
      
      console.timeEnd("⏱️ Geração de PDF sob demanda");
      console.log("✅ PDF gerado e salvo:", pdfUrl);
      
      setLoading(false);
      return pdfUrl;
    } catch (err: any) {
      console.error("❌ Erro ao gerar PDF sob demanda:", err);
      setLoading(false);
      return null;
    }
  };

  // ========================================
  // Função: Gerar Segunda Via
  // ========================================
  const gerarSegundaVia = async (id: string, tipo: "aviso" | "recibo") => {
    try {
      setLoading(true);
      
      // Buscar correspondência
      const docRef = doc(db, "correspondencias", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Correspondência não encontrada");
      }
      
      const data = docSnap.data();
      
      // Retornar URL existente
      const url = tipo === "aviso" ? data.pdfUrl : data.reciboUrl;
      
      setLoading(false);
      return url || null;
    } catch (err: any) {
      console.error("❌ Erro ao gerar segunda via:", err);
      setLoading(false);
      return null;
    }
  };

  // ========================================
  // Função: Marcar Como Compartilhado
  // ========================================
  const marcarComoCompartilhado = async (id: string, via: "whatsapp" | "email") => {
    try {
      const docRef = doc(db, "correspondencias", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Correspondência não encontrada");
      }
      
      const data = docSnap.data();
      const compartilhadoVia = data.compartilhadoVia || [];
      
      // Adiciona via se não estiver na lista
      if (!compartilhadoVia.includes(via)) {
        compartilhadoVia.push(via);
      }
      
      await updateDoc(docRef, {
        compartilhadoVia,
        compartilhadoEm: serverTimestamp(),
      });
      
      console.log("✅ Correspondência marcada como compartilhada via:", via);
      return true;
    } catch (err: any) {
      console.error("❌ Erro ao marcar como compartilhado:", err);
      return false;
    }
  };

  return {
    criarCorrespondenciaCompleta,
    listarCorrespondencias,
    registrarRetirada,
    getPorteiroAssinaturaUrl,
    gerarSegundaVia,
    gerarPDFSobDemanda,
    marcarComoCompartilhado, // ✅ NOVA FUNÇÃO
    loading,
    error,
    progress,
    progressMessage,
  };
}