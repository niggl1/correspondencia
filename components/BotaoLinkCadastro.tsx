"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Link as LinkIcon, Check } from "lucide-react";

export default function BotaoLinkCadastro() {
  const { user } = useAuth();
  const [cnpjCondominio, setCnpjCondominio] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(true);

  // Buscar o CNPJ do condomínio atual
  useEffect(() => {
    const fetchCnpj = async () => {
      if (user?.condominioId) {
        try {
          const docSnap = await getDoc(doc(db, "condominios", user.condominioId));
          if (docSnap.exists()) {
            setCnpjCondominio(docSnap.data().cnpj);
          }
        } catch (error) {
          console.error("Erro ao buscar CNPJ:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchCnpj();
  }, [user]);

  const copiarLinkCadastro = () => {
    if (!cnpjCondominio) return alert("CNPJ não encontrado ou carregando...");

    // Gera o link com o parâmetro ?cnpj=...
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/cadastro-morador?cnpj=${cnpjCondominio}`;

    navigator.clipboard.writeText(link);
    setCopiado(true);
    
    // Volta o ícone ao normal após 3 segundos
    setTimeout(() => setCopiado(false), 3000);
  };

  if (loading || !cnpjCondominio) return null; // Não mostra se não tiver CNPJ

  return (
    <button
      onClick={copiarLinkCadastro}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm sm:text-base whitespace-nowrap ${
        copiado 
          ? "bg-green-600 text-white border-2 border-green-600" 
          : "bg-white text-[#057321] border-2 border-[#057321] hover:bg-green-50"
      }`}
      title="Copiar link para enviar aos moradores"
    >
      {copiado ? <Check size={18} /> : <LinkIcon size={18} />}
      {copiado ? "Link Copiado!" : "Link de Cadastro"}
    </button>
  );
}