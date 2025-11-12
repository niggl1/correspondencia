"use client";

import { useEffect, useState, useCallback } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  onSelect: (data: {
    condominioId: string;
    blocoId: string;
    moradorId: string;
  }) => void;
}

export default function SelectCondominioBlocoMorador({ onSelect }: Props) {
  const { role, condominioId: userCondominioId } = useAuth() as any;
  
  const [condominios, setCondominios] = useState<any[]>([]);
  const [blocos, setBlocos] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);

  const [selectedCondominio, setSelectedCondominio] = useState("");
  const [selectedBloco, setSelectedBloco] = useState("");
  const [selectedMorador, setSelectedMorador] = useState("");

  // ✅ Carrega condomínios
  useEffect(() => {
    const carregarCondominios = async () => {
      try {
        // Admin vê todos, responsável/porteiro vê apenas o seu
        if (role === "adminMaster" || role === "admin") {
          const snapshot = await getDocs(collection(db, "condominios"));
          const lista = snapshot.docs.map((doc) => {
            const id = doc.id;
            const data = doc.data();
            return { id, ...data };
          });
          setCondominios(lista);
        } else {
          // Responsável/Porteiro: carrega apenas seu condomínio
          if (userCondominioId) {
            const q = query(
              collection(db, "condominios"),
              where("__name__", "==", userCondominioId)
            );
            const snapshot = await getDocs(q);
            const lista = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setCondominios(lista);
            // Pré-seleciona automaticamente
            setSelectedCondominio(userCondominioId);
          }
        }
      } catch (error) {
        console.error("❌ Erro ao buscar condomínios:", error);
      }
    };
    carregarCondominios();
  }, [role, userCondominioId]);

  // ✅ Carrega blocos quando condomínio é selecionado
  const carregarBlocos = useCallback(async (condominioId: string) => {
    if (!condominioId) {
      setBlocos([]);
      setMoradores([]);
      setSelectedBloco("");
      setSelectedMorador("");
      return;
    }

    try {
      const q = query(
        collection(db, "blocos"),
        where("condominioId", "==", condominioId)
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBlocos(lista);
      setMoradores([]);
      setSelectedBloco("");
      setSelectedMorador("");
    } catch (error) {
      console.error("❌ Erro ao buscar blocos:", error);
    }
  }, []);

  // ✅ Carrega moradores quando bloco é selecionado
  const carregarMoradores = useCallback(async (blocoId: string) => {
    if (!blocoId) {
      setMoradores([]);
      setSelectedMorador("");
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("blocoId", "==", blocoId),
        where("role", "==", "morador")
      );
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMoradores(lista);
      setSelectedMorador("");
    } catch (error) {
      console.error("❌ Erro ao buscar moradores:", error);
    }
  }, []);

  // ✅ Efeito para carregar blocos quando condomínio muda
  useEffect(() => {
    if (selectedCondominio) {
      carregarBlocos(selectedCondominio);
    }
  }, [selectedCondominio, carregarBlocos]);

  // ✅ Efeito para carregar moradores quando bloco muda
  useEffect(() => {
    if (selectedBloco) {
      carregarMoradores(selectedBloco);
    }
  }, [selectedBloco, carregarMoradores]);

  // ✅ Notifica seleção completa
  useEffect(() => {
    onSelect({
      condominioId: selectedCondominio,
      blocoId: selectedBloco,
      moradorId: selectedMorador,
    });
  }, [selectedCondominio, selectedBloco, selectedMorador, onSelect]);

  return (
    <div className="space-y-4">
      {/* Seletor de Condomínio */}
      <div>
          <label className="block text-sm font-medium mb-1">Condomínio</label>
          <select
            value={selectedCondominio}
            onChange={(e) => setSelectedCondominio(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Selecione um condomínio</option>
            {condominios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome || c.id}
              </option>
            ))}
          </select>
        </div>

      {/* Seletor de Bloco */}
      <div>
        <label className="block text-sm font-medium mb-1">Bloco</label>
        <select
          value={selectedBloco}
          onChange={(e) => setSelectedBloco(e.target.value)}
          disabled={!selectedCondominio}
          className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
        >
          <option value="">Selecione um bloco</option>
          {blocos.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome || b.id}
            </option>
          ))}
        </select>
      </div>

      {/* Seletor de Morador */}
      <div>
        <label className="block text-sm font-medium mb-1">Morador</label>
        <select
          value={selectedMorador}
          onChange={(e) => setSelectedMorador(e.target.value)}
          disabled={!selectedBloco}
          className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
        >
          <option value="">Selecione um morador</option>
          {moradores.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.nome} - Apto {m.apartamento}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}