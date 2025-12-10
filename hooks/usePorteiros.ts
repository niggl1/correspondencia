"use client";

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/app/lib/firebase'
// Tipos e Constantes (Se certifique que os caminhos estão corretos)
import { Porteiro, PorteiroFormData } from '@/types/porteiro.types'
import { MENSAGENS } from '@/constants/porteiro.constants'

// 👇 DETECÇÃO DE URL PARA API (CRUCIAL PARA CAPACITOR)
const getApiUrl = (endpoint: string) => {
  // Se estiver no navegador normal, usa caminho relativo
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
  
  if (isCapacitor) {
    // ⚠️ IMPORTANTE: Defina NEXT_PUBLIC_APP_URL no seu .env.local
    // Se não tiver definido, coloque seu dominio da Vercel hardcoded aqui como fallback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sua-url-da-vercel.app"; 
    return `${baseUrl.replace(/\/$/, '')}${endpoint}`;
  }

  return endpoint;
};

interface UsePorteirosReturn {
  porteiros: Porteiro[]
  loading: boolean
  error: string | null
  criarPorteiro: (formData: PorteiroFormData) => Promise<void>
  atualizarPorteiro: (id: string, formData: Partial<PorteiroFormData>) => Promise<void>
  excluirPorteiro: (id: string) => Promise<void>
  toggleStatus: (porteiro: Porteiro) => Promise<void>
}

export const usePorteiros = (condominioId: string): UsePorteirosReturn => {
  const [porteiros, setPorteiros] = useState<Porteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar porteiros em tempo real
  useEffect(() => {
    if (!condominioId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'porteiros'),
      where('condominioId', '==', condominioId)
    )

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const lista: Porteiro[] = querySnapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Porteiro)
        )
        setPorteiros(lista.sort((a, b) => a.nome.localeCompare(b.nome)))
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Erro ao carregar porteiros:', err)
        setError(MENSAGENS?.ERRO?.CARREGAR_PORTEIROS || "Erro ao carregar lista.")
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [condominioId])

  const criarPorteiro = useCallback(
    async (formData: PorteiroFormData) => {
      try {
        const url = getApiUrl('/api/criar-porteiro');
        console.log("Chamando API em:", url); // Para debug

        // Chamar Firebase Function (Next API Route)
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            senha: formData.senha,
            nome: formData.nome,
            whatsapp: formData.whatsapp,
            condominioId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || MENSAGENS?.ERRO?.SALVAR_PORTEIRO || "Erro ao salvar.")
        }

        const { uid } = await response.json()

        // Criar documento no Firestore
        await addDoc(collection(db, 'porteiros'), {
          uid,
          nome: formData.nome,
          email: formData.email,
          whatsapp: formData.whatsapp,
          condominioId,
          role: 'porteiro',
          ativo: true,
          criadoEm: serverTimestamp(),
        })
      } catch (err: any) {
        console.error('Erro ao criar porteiro:', err)
        if (err.message && err.message.includes('email-already-in-use')) {
          throw new Error(MENSAGENS?.ERRO?.EMAIL_EM_USO || "E-mail já está em uso.")
        }
        throw new Error(MENSAGENS?.ERRO?.SALVAR_PORTEIRO || "Erro ao criar porteiro.")
      }
    },
    [condominioId]
  )

  const atualizarPorteiro = useCallback(
    async (id: string, formData: Partial<PorteiroFormData>) => {
      try {
        const updateData: any = {
          atualizadoEm: serverTimestamp(),
        }

        if (formData.nome) updateData.nome = formData.nome
        if (formData.whatsapp) updateData.whatsapp = formData.whatsapp

        await updateDoc(doc(db, 'porteiros', id), updateData)
      } catch (err) {
        console.error('Erro ao atualizar porteiro:', err)
        throw new Error(MENSAGENS?.ERRO?.SALVAR_PORTEIRO || "Erro ao atualizar.")
      }
    },
    []
  )

  const excluirPorteiro = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'porteiros', id))
    } catch (err) {
      console.error('Erro ao excluir porteiro:', err)
      throw new Error(MENSAGENS?.ERRO?.EXCLUIR_PORTEIRO || "Erro ao excluir.")
    }
  }, [])

  const toggleStatus = useCallback(async (porteiro: Porteiro) => {
    try {
      await updateDoc(doc(db, 'porteiros', porteiro.id), {
        ativo: !porteiro.ativo,
        atualizadoEm: serverTimestamp(),
      })
    } catch (err) {
      console.error('Erro ao alterar status:', err)
      throw new Error(MENSAGENS?.ERRO?.ALTERAR_STATUS || "Erro ao alterar status.")
    }
  }, [])

  return {
    porteiros,
    loading,
    error,
    criarPorteiro,
    atualizarPorteiro,
    excluirPorteiro,
    toggleStatus,
  }
}