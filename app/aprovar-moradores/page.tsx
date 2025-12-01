'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/app/lib/firebase'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore'
// IMPORTS DE PADRONIZAÇÃO
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";
// ✅ IMPORTADO AQUI
import BotaoLinkCadastro from "../../components/BotaoLinkCadastro";

interface Morador {
  id: string
  nome: string
  email: string
  whatsapp: string
  perfil: string
  blocoNome: string
  numeroUnidade: string
  condominioNome: string
  aprovado: boolean
  ativo: boolean
  criadoEm: any
}

export default function AprovarMoradores() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [moradores, setMoradores] = useState<Morador[]>([])
  const [processando, setProcessando] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth as any, async (currentUser) => {
      if (!currentUser) {
        router.push('/') // ✅ CORREÇÃO: Manda para a Raiz
        return
      }

      setUser(currentUser)
      await carregarMoradores(currentUser.uid)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const carregarMoradores = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'morador'),
        where('aprovado', '==', false)
      )

      const querySnapshot = await getDocs(q)
      const moradoresData: Morador[] = []

      querySnapshot.forEach((doc) => {
        moradoresData.push({
          id: doc.id,
          ...doc.data()
        } as Morador)
      })

      moradoresData.sort((a, b) => {
        const dataA = a.criadoEm?.toDate() || new Date(0)
        const dataB = b.criadoEm?.toDate() || new Date(0)
        return dataB.getTime() - dataA.getTime()
      })

      setMoradores(moradoresData)
    } catch (error) {
      console.error('Erro ao carregar moradores:', error)
      alert('Erro ao carregar moradores pendentes')
    }
  }

  const enviarEmailAprovacao = async (morador: Morador) => {
    try {
      const response = await fetch('/api/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'aprovacao',
          destinatario: {
            nome: morador.nome,
            email: morador.email,
          },
          dados: {
            condominioNome: morador.condominioNome,
            blocoNome: morador.blocoNome,
            numeroUnidade: morador.numeroUnidade,
          },
        }),
      })

      if (!response.ok) {
        console.error('Erro ao enviar email de aprovação')
      } else {
        console.log('✅ Email de aprovação enviado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error)
    }
  }

  const aprovarMorador = async (moradorId: string) => {
    if (!confirm('Deseja aprovar este morador?')) {
      return
    }

    try {
      setProcessando(moradorId)

      const moradorDoc = await getDoc(doc(db, 'users', moradorId))
      const moradorData = moradorDoc.data()

      await updateDoc(doc(db, 'users', moradorId), {
        aprovado: true,
        ativo: true,
        aprovadoEm: serverTimestamp(),
        aprovadoPor: user?.uid
      })

      if (moradorData) {
        await enviarEmailAprovacao({
          id: moradorId,
          nome: moradorData.nome,
          email: moradorData.email,
          whatsapp: moradorData.whatsapp || '',
          perfil: moradorData.perfil || '',
          blocoNome: moradorData.blocoNome || '',
          numeroUnidade: moradorData.numeroUnidade || '',
          condominioNome: moradorData.condominioNome || '',
          aprovado: true,
          ativo: true,
          criadoEm: moradorData.criadoEm
        })
      }

      alert('✅ Morador aprovado com sucesso! Um email de confirmação foi enviado.')
      await carregarMoradores(user.uid)
    } catch (error) {
      console.error('Erro ao aprovar morador:', error)
      alert('❌ Erro ao aprovar morador')
    } finally {
      setProcessando(null)
    }
  }

  const rejeitarMorador = async (moradorId: string) => {
    if (!confirm('Deseja rejeitar este cadastro? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      setProcessando(moradorId)

      await updateDoc(doc(db, 'users', moradorId), {
        aprovado: false,
        ativo: false,
        rejeitado: true,
        rejeitadoEm: serverTimestamp(),
        rejeitadoPor: user?.uid
      })

      alert('Cadastro rejeitado')
      await carregarMoradores(user.uid)
    } catch (error) {
      console.error('Erro ao rejeitar morador:', error)
      alert('❌ Erro ao rejeitar cadastro')
    } finally {
      setProcessando(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. NAVBAR GLOBAL */}
      <Navbar />

      {/* 2. ESPAÇAMENTO E CONTAINER PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        
        {/* 3. BOTÃO VOLTAR PADRONIZADO */}
        <BotaoVoltar url="/dashboard-responsavel" />

        {/* Header com Botão de Link */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Aprovar Moradores</h1>
            <p className="text-gray-600 text-sm mt-1">
                Cadastros pendentes de aprovação
            </p>
          </div>
          
          {/* ✅ BOTÃO DE LINK ADICIONADO AQUI */}
          <BotaoLinkCadastro />
        </div>

        {/* Lista de Moradores */}
        {moradores.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <p className="text-gray-500 text-lg font-medium">
              ✅ Não há moradores pendentes de aprovação
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {moradores.map((morador) => (
              <div
                key={morador.id}
                className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500 hover:shadow-md transition-shadow"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Informações do Morador */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {morador.nome}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold text-gray-700">Email:</span>{' '}
                        <span className="text-gray-600">{morador.email}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">WhatsApp:</span>{' '}
                        <span className="text-gray-600">{morador.whatsapp}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">Perfil:</span>{' '}
                        <span className="text-gray-600 capitalize">{morador.perfil}</span>
                      </p>
                    </div>
                  </div>

                  {/* Informações da Unidade */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Unidade</h4>
                    
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold text-gray-700">Condomínio:</span>{' '}
                        <span className="text-gray-600">{morador.condominioNome}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">Bloco:</span>{' '}
                        <span className="text-gray-600">{morador.blocoNome}</span>
                      </p>
                      <p>
                        <span className="font-semibold text-gray-700">Número:</span>{' '}
                        <span className="text-gray-600">{morador.numeroUnidade}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-3">
                        Cadastrado em:{' '}
                        {morador.criadoEm?.toDate().toLocaleDateString('pt-BR') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="mt-6 flex flex-col sm:flex-row gap-4 border-t border-gray-100 pt-4">
                  <button
                    onClick={() => aprovarMorador(morador.id)}
                    disabled={processando === morador.id}
                    className="flex-1 bg-[#057321] text-white px-6 py-3 rounded-lg hover:bg-[#046119] disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors shadow-sm"
                  >
                    {processando === morador.id ? 'Processando...' : '✅ Aprovar Cadastro'}
                  </button>
                  
                  <button
                    onClick={() => rejeitarMorador(morador.id)}
                    disabled={processando === morador.id}
                    className="flex-1 bg-white border border-red-200 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors"
                  >
                    {processando === morador.id ? 'Processando...' : '❌ Rejeitar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}