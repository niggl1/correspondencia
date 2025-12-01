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
// FUNÇÃO: Gerar PDF Profissional (COMPLETA)
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
  // 1. CABEÇALHO VERDE COM LOGO
  // ========================================
  const headerHeight = 50;
  doc.setFillColor(5, 115, 33); // #057321 (verde do sistema)
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Logo real do sistema
  const logoX = 15;
  const logoY = 10;
  const logoSize = 30;
  
  try {
    // Carregar logo da pasta public
    const logoUrl = "/logo-app-correspondencia.png";
    const logoBase64 = await fetch(logoUrl)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }));
    
    doc.addImage(logoBase64, "PNG", logoX, logoY, logoSize, logoSize);
  } catch (error) {
    console.error("Erro ao carregar logo:", error);
    // Fallback: círculo cinza
    doc.setFillColor(236, 240, 241);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, "F");
  }

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
  doc.setFillColor(5, 115, 33); // #057321
  doc.roundedRect(sectionX, yPos, sectionWidth, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("DESTINATÁRIO", sectionX + 10, yPos + 8);

  yPos += 12;

  // Conteúdo da seção
  doc.setDrawColor(5, 115, 33); // #057321
  doc.setLineWidth(0.5);
  const destinatarioHeight = 25;
  doc.roundedRect(sectionX, yPos, sectionWidth, destinatarioHeight, 2, 2, "S");

  doc.setTextColor(0, 0, 0); // ✅ PRETO
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`• Morador: ${dados.moradorNome}`, sectionX + 10, yPos + 7);
  doc.text(`• Bloco: ${dados.blocoNome}   |   Apartamento: ${dados.apartamento}`, sectionX + 10, yPos + 14);
  
  // ✅ Protocolo em destaque (negrito e maior)
  doc.text(`• Protocolo: `, sectionX + 10, yPos + 21);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`#${dados.protocolo}`, sectionX + 32, yPos + 21);

  yPos += destinatarioHeight + 10;

  // ========================================
  // 4. SEÇÃO OBSERVAÇÕES
  // ========================================
  doc.setFillColor(5, 115, 33); // ✅ VERDE ao invés de azul
  doc.roundedRect(sectionX, yPos, sectionWidth, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("OBSERVAÇÕES", sectionX + 10, yPos + 8);

  yPos += 12;

  const observacaoHeight = 20;
  doc.setDrawColor(5, 115, 33); // #057321
  doc.roundedRect(sectionX, yPos, sectionWidth, observacaoHeight, 2, 2, "S");

  doc.setTextColor(0, 0, 0); // ✅ PRETO
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const observacaoTexto = dados.observacao || "Sem observações";
  doc.text(observacaoTexto, sectionX + 10, yPos + 7, {
    maxWidth: sectionWidth - 20,
  });

  yPos += observacaoHeight + 10;

  // ========================================
  // 5. ✅ NOVA SEÇÃO: FOTO E RETIRADA (LADO A LADO)
  // ========================================
  
  // Cabeçalho da seção
  doc.setFillColor(5, 115, 33); // #057321
  doc.roundedRect(sectionX, yPos, sectionWidth, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("FOTO E RETIRADA DA CORRESPONDÊNCIA", sectionX + 10, yPos + 8);

  yPos += 12;

  // Container da seção (altura fixa para ambos)
  const containerHeight = 75;
  doc.setDrawColor(5, 115, 33); // #057321
  doc.roundedRect(sectionX, yPos, sectionWidth, containerHeight, 2, 2, "S");

  // Calcular largura de cada coluna (50% cada, com espaçamento) - ✅ margem de 10mm
  const columnWidth = (sectionWidth - 30) / 2;
  const leftColumnX = sectionX + 10;
  const rightColumnX = sectionX + 20 + columnWidth;

  // ========================================
  // 5.1 COLUNA ESQUERDA: FOTO
  // ========================================
  if (dados.imagemUrl) {
    console.log("📸 Tentando adicionar imagem ao PDF:", dados.imagemUrl);
    
    try {
      // Título da coluna
      doc.setTextColor(5, 115, 33); // #057321
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
  doc.setTextColor(5, 115, 33); // #057321
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
  // 📧 NOVA FUNÇÃO: Enviar E-mail via API (Resend)
  // ========================================
  const enviarEmailViaAPI = async (dados: {
    emailDestino: string;
    nomeMorador: string;
    condominioNome: string;
    blocoNome: string;
    numeroUnidade: string;
    protocolo: string;
    observacao?: string;
    dashboardUrl?: string;
  }) => {
    try {
      console.log("📧 Iniciando envio de e-mail via API...", dados.emailDestino);
      
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'nova-correspondencia',
          destinatario: dados.emailDestino,
          dados: {
            nomeMorador: dados.nomeMorador,
            tipoCorrespondencia: dados.observacao || "Correspondência",
            dataChegada: new Date().toLocaleDateString('pt-BR'),
            horaChegada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            condominioNome: dados.condominioNome,
            blocoNome: dados.blocoNome,
            numeroUnidade: dados.numeroUnidade,
            localRetirada: "Portaria",
            dashboardUrl: dados.dashboardUrl || (typeof window !== 'undefined' ? `${window.location.origin}/login` : '')
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao enviar e-mail');
      }

      console.log("✅ E-mail enviado com sucesso:", result);
      return true;
    } catch (err) {
      console.error("❌ Erro ao enviar e-mail via API:", err);
      return false;
    }
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
            try {
                const imagemComprimida = await comprimirImagem(params.imagemFile!);
                setProgress(30);
                setProgressMessage("Enviando imagem...");
                imagemUrl = await uploadImagem(imagemComprimida);
            } catch (e) {
                console.error("Erro na compressão, enviando original", e);
                imagemUrl = await uploadImagem(params.imagemFile!);
            }
            setProgress(40);
            console.log("✅ Imagem processada e URL obtida:", imagemUrl);
          })()
        );
      }

      // Task 2: Buscar dados do morador e E-MAIL
      let moradorNome = params.moradorNome || "";
      let apartamento = params.apartamento || "";
      let moradorEmail = "";

      if (params.moradorId) {
        tasks.push(
          (async () => {
            const mRef = doc(db, "users", params.moradorId);
            const mSnap = await getDoc(mRef);
            if (mSnap.exists()) {
              const data = mSnap.data();
              moradorNome = data.nome || moradorNome;
              apartamento = data.apartamento || apartamento;
              moradorEmail = data.email || ""; // 🔥 Recupera o e-mail
              console.log("✅ Dados do morador:", { moradorNome, apartamento, moradorEmail });
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
        } catch (e) {
          console.error("❌ Erro ao parsear user do localStorage:", e);
        }
      }

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
        moradorNome: moradorNome || params.moradorNome || "",
        blocoNome: params.blocoNome || "",
        apartamento: apartamento || params.apartamento || "",
        condominioNome: params.condominioNome || "",
        dataHora,
        condominioEndereco: "Rua das Flores, 123, Centro",
        moradorEmail // 🔥 Salvo no documento
      });

      console.log("✅ Correspondência salva no Firestore:", docRef.id);

      // ========================================
      // 🔥 Enviar E-mail Automático
      // ========================================
      if (moradorEmail) {
        setProgressMessage("Enviando e-mail de aviso...");
        enviarEmailViaAPI({
            emailDestino: moradorEmail,
            nomeMorador: moradorNome,
            condominioNome: params.condominioNome || "",
            blocoNome: params.blocoNome || "",
            numeroUnidade: apartamento,
            protocolo: protocolo,
            observacao: params.observacao,
        });
      }

      setProgress(100);
      setProgressMessage("Concluído!");

      console.log("✅ Correspondência registrada com sucesso!");
      console.timeEnd("⏱️ Tempo total de registro");

      setLoading(false);
      
      // GERA PDF EM BACKGROUND
      setTimeout(async () => {
        try {
          const pdfUrl = await gerarPDFSobDemanda(docRef.id);
          if (pdfUrl) console.log("✅ PDF gerado em background:", pdfUrl);
        } catch (err) {
          console.error("❌ Erro ao gerar PDF em background:", err);
        }
      }, 100);
      
      return {
        id: docRef.id,
        protocolo,
        moradorEmail // 🔥 Retorna para a tela
      };
    } catch (err: any) {
      console.error("❌ Erro ao criar correspondência:", err);
      setError(err.message || "Erro desconhecido");
      setLoading(false);
      setProgress(0);
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
      const docRef = doc(db, "correspondencias", dados.id);
      await updateDoc(docRef, {
        status: "retirada",
        retiradoEm: serverTimestamp(),
      });
      
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
    return null;
  };

  // ========================================
  // Função: Gerar PDF Sob Demanda
  // ========================================
  const gerarPDFSobDemanda = async (id: string) => {
    try {
      setLoading(true);
      const docRef = doc(db, "correspondencias", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error("Correspondência não encontrada");
      }
      
      const data = docSnap.data();
      
      const qrCodeDataUrl = await QRCode.toDataURL(data.protocolo, {
        width: 300,
        margin: 1,
      });
      
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
      
      const pdfUrl = await uploadPDF(pdfDoc, data.protocolo);
      
      await updateDoc(docRef, {
        pdfUrl,
      });
      
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
      const docRef = doc(db, "correspondencias", id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) throw new Error("Correspondência não encontrada");
      
      const data = docSnap.data();
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
      
      if (!docSnap.exists()) throw new Error("Correspondência não encontrada");
      
      const data = docSnap.data();
      const compartilhadoVia = data.compartilhadoVia || [];
      
      if (!compartilhadoVia.includes(via)) {
        compartilhadoVia.push(via);
      }
      
      await updateDoc(docRef, {
        compartilhadoVia,
        compartilhadoEm: serverTimestamp(),
      });
      
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
    marcarComoCompartilhado,
    enviarEmailViaAPI, // ✅ Função exportada
    loading,
    error,
    progress,
    progressMessage,
  };
}