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
  imagemUrl?: string; 
}

export function useAvisosRapidos() {
  const { user } = useAuth();
  const condominioId = user?.condominioId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const registrarAviso = async (dados: CriarAvisoRapidoDTO) => {
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "avisos_rapidos"), {
        ...dados,
        criadoEm: Timestamp.now(),
        dataEnvio: Timestamp.now(), 
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

  const buscarAvisos = async (params?: { condominioId: string }, limite = 50) => {
    const targetCondominio = params?.condominioId || condominioId;
    if (!targetCondominio) return [];
    
    setLoading(true);
    try {
      const avisosRef = collection(db, "avisos_rapidos");
      const q = query(
        avisosRef,
        where("condominioId", "==", targetCondominio),
        orderBy("criadoEm", "desc"),
        limit(limite)
      );

      const snapshot = await getDocs(q);
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
      console.error("❌ Erro ao buscar avisos:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const buscarAvisosHoje = async (targetCondominioId?: string) => {
    const condId = targetCondominioId || condominioId;
    if (!condId) return [];

    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);

      const q = query(
        collection(db, "avisos_rapidos"),
        where("condominioId", "==", condId),
        where("criadoEm", ">=", Timestamp.fromDate(hoje)),
        where("criadoEm", "<", Timestamp.fromDate(amanha)),
        orderBy("criadoEm", "desc")
      );

      const snapshot = await getDocs(q);

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
      console.error("❌ Erro busca hoje:", err);
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