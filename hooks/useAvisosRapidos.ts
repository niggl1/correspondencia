import { useState } from "react";
import { db } from "@/app/lib/firebase";
import { 
  collection, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit 
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

// ==========================================
// TIPAGEM
// ==========================================
export interface CriarAvisoRapidoDTO {
  enviadoPorId: string;
  enviadoPorNome: string;
  enviadoPorRole: string;
  moradorId: string;
  moradorNome: string;
  moradorTelefone: string;
  condominioId: string;
  blocoId: string;
  blocoNome: string;
  apartamento: string;
  mensagem: string;
  protocolo?: string;
  fotoUrl?: string;
}

export interface AvisoRapido extends CriarAvisoRapidoDTO {
  id: string;
  criadoEm: any;
  dataEnvio: any;
  status: "enviado" | "erro";
  
  // ✅ Adicionando o campo opcional para compatibilidade
  imagemUrl?: string; 
}

// ==========================================
// HOOK
// ==========================================
export function useAvisosRapidos() {
  const { user } = useAuth();
  const condominioId = user?.condominioId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1. REGISTRAR
  const registrarAviso = async (dados: CriarAvisoRapidoDTO) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "avisos_rapidos"), {
        ...dados,
        criadoEm: Timestamp.now(),
        dataEnvio: Timestamp.now(), // Garantir compatibilidade
        protocolo: dados.protocolo || null,
        fotoUrl: dados.fotoUrl || null,
        status: "enviado"
      });
      return docRef.id;
    } catch (err: any) {
      console.error("❌ Erro ao registrar:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 2. BUSCAR TODOS
  const buscarAvisos = async (params?: { condominioId: string }, limite = 50) => {
    const targetCondominio = params?.condominioId || condominioId;
    
    console.log("🔍 [DEBUG] Iniciando busca de avisos...");
    console.log("🏢 [DEBUG] Condomínio Alvo:", targetCondominio);

    if (!targetCondominio) {
      console.warn("⚠️ [DEBUG] Busca cancelada: condominioId está vazio.");
      return [];
    }
    
    setLoading(true);
    try {
      const avisosRef = collection(db, "avisos_rapidos");
      
      // Tenta query com ordenação primeiro
      const q = query(
        avisosRef,
        where("condominioId", "==", targetCondominio),
        orderBy("criadoEm", "desc"),
        limit(limite)
      );

      console.log("📡 [DEBUG] Executando query no Firebase...");
      const snapshot = await getDocs(q);
      
      console.log(`✅ [DEBUG] Encontrados ${snapshot.docs.length} avisos.`);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          status: (data.status === "enviado" || data.status === "erro") ? data.status : "enviado",
          dataEnvio: data.criadoEm || data.dataEnvio 
        };
      }) as AvisoRapido[];
      
    } catch (err: any) {
      console.error("❌ [DEBUG] Erro CRÍTICO ao buscar avisos:", err);
      
      // ⚠️ VERIFICAÇÃO DE ÍNDICE
      if (err.message.includes("indexes")) {
        console.error("🚨 [ATENÇÃO] O Firebase precisa de um índice. CLIQUE NO LINK DO ERRO ACIMA NO CONSOLE.");
        alert("Erro de configuração: É necessário criar um índice no Firebase. Verifique o Console (F12) e clique no link fornecido pelo Google.");
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 3. BUSCAR HOJE
  const buscarAvisosHoje = async (targetCondominioId?: string) => {
    const condId = targetCondominioId || condominioId;
    if (!condId) return [];

    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);

      console.log("📅 [DEBUG] Buscando avisos de hoje:", hoje.toLocaleString());

      const q = query(
        collection(db, "avisos_rapidos"),
        where("condominioId", "==", condId),
        where("criadoEm", ">=", Timestamp.fromDate(hoje)),
        where("criadoEm", "<", Timestamp.fromDate(amanha)),
        orderBy("criadoEm", "desc")
      );

      const snapshot = await getDocs(q);
      console.log(`✅ [DEBUG] Avisos de hoje: ${snapshot.docs.length}`);

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          status: (data.status === "enviado" || data.status === "erro") ? data.status : "enviado",
          dataEnvio: data.criadoEm || data.dataEnvio 
        };
      }) as AvisoRapido[];

    } catch (err: any) {
      console.error("❌ [DEBUG] Erro busca hoje:", err);
      if (err.message.includes("indexes")) {
         console.error("🚨 [ATENÇÃO] CLIQUE NO LINK DO ERRO NO CONSOLE PARA CRIAR O ÍNDICE.");
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    registrarAviso,
    buscarAvisos,
    buscarAvisosHoje,
    loading,
    error,
  };
}
