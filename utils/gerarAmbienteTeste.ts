import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp, collection } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

// Configuração para o App Secundário (Criar usuário sem deslogar o atual)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface DadosTeste {
  condominioId: string;
  condominioNome: string;
  whatsappDestino: string; // O WhatsApp do responsável
}

export const gerarAmbienteTeste = async ({ condominioId, condominioNome, whatsappDestino }: DadosTeste) => {
  console.log("🛠️ Iniciando geração de ambiente de teste...");

  // 1. Inicializa App Secundário
  const secondaryApp = initializeApp(firebaseConfig, "SecondaryAppGenerador");
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // --- A. CRIAR BLOCO DE TESTE ---
    // Cria um ID automático para o bloco
    const blocoRef = doc(collection(db, "blocos")); 
    const blocoId = blocoRef.id;

    await setDoc(blocoRef, {
      nome: "Bloco Teste",
      condominioId: condominioId,
      criadoEm: Timestamp.now()
    });

    // --- B. CRIAR MORADOR DE TESTE ---
    // Gera um email único baseado no ID do condomínio para não dar conflito
    const sufixo = condominioId.substring(0, 6).toLowerCase();
    const emailMorador = `morador.${sufixo}@teste.com`;
    const senhaPadrao = "123456";

    // Cria no Authentication
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, emailMorador, senhaPadrao);
    const uid = userCred.user.uid;

    // Cria no Firestore
    await setDoc(doc(db, "users", uid), {
      uid: uid,
      nome: "Morador (Seu Teste)", // Nome sugestivo
      email: emailMorador,
      role: "morador",
      condominioId: condominioId,
      condominioNome: condominioNome,
      status: "ativo",
      aprovado: true,
      criadoEm: Timestamp.now(),
      
      // Dados Vinculados
      blocoId: blocoId,
      blocoNome: "Bloco Teste",
      unidade: "100",
      apartamento: "100",
      
      // O Pulo do Gato: O WhatsApp do Responsável
      whatsapp: whatsappDestino.replace(/\D/g, ""), 
    });

    console.log("✅ Ambiente de teste gerado com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao gerar dados de teste:", error);
    // Não lançamos o erro para não travar o cadastro principal, apenas logamos
  } finally {
    // Limpa a instância secundária para liberar memória
    await deleteApp(secondaryApp);
  }
};