// app/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // ✅ Para uploads (imagens, PDFs, recibos)

// Detecta se está rodando em modo DEMO (opcional)
const demo = process.env.NEXT_PUBLIC_DEMO === "true";

let app: FirebaseApp | null = null;

try {
  // ✅ Configuração do Firebase — com suas credenciais do projeto
  const config = {
    apiKey: "AIzaSyAzruTLO_g7UtNB5nWgsI-phczP9txTfIY",
    authDomain: "app-correspondencia-1a054.firebaseapp.com",
    projectId: "app-correspondencia-1a054",
    storageBucket: "app-correspondencia-1a054.firebasestorage.app", // ✅ CORRIGIDO!
    messagingSenderId: "706771378163",
    appId: "1:706771378163:web:06d1a9765bede54631fc86",
  };

  // ✅ Evita re-inicialização em ambiente de desenvolvimento
  if (!getApps().length) {
    app = initializeApp(config as any);
  } else {
    app = getApps()[0]!;
  }
} catch (e) {
  console.warn("[firebase] Falha ao inicializar. Rodando em modo demo.", e);
  app = null;
}

// ✅ Exporta as instâncias principais — protegendo o app contra falhas de inicialização
export const auth = app ? getAuth(app) : ({} as any);
export const db = app ? getFirestore(app) : ({} as any);
export const storage = app ? getStorage(app) : ({} as any);

// ✅ Exporta também o app (opcional)
export { app };
