// hooks/useAuth.ts
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/app/lib/firebase'
import { MENSAGENS } from '@/constants/porteiro.constants'

interface UserData {
  uid: string
  email: string
  nome: string
  telefone?: string
  role: 'adminMaster' | 'responsavel' | 'porteiro' | 'morador' | 'admin'
  condominioId: string
  apartamento?: string
  bloco?: string
  ativo?: boolean
}

interface UseAuthReturn {
  uid?: string
  role?: 'adminMaster' | 'responsavel' | 'porteiro' | 'morador' | 'admin'
  condominioId: string
  user?: UserData  // ✅ ADICIONADO: objeto user completo
  loading: boolean
  error: string | null
}

const DEMO = process.env.NEXT_PUBLIC_DEMO === 'true'

export const useAuth = (): UseAuthReturn => {
  const router = useRouter()
  const [uid, setUid] = useState<string|undefined>(undefined)
  const [condominioId, setCondominioId] = useState<string>('')
  const [role, setRole] = useState<'adminMaster'|'responsavel'|'porteiro'|'morador'|'admin'|undefined>(undefined)
  const [user, setUser] = useState<UserData|undefined>(undefined)  // ✅ ADICIONADO
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    if (DEMO) {
      const demoUser: UserData = {
        uid: 'demo-uid',
        email: 'demo@exemplo.com',
        nome: 'Usuário Demo',
        telefone: '(11) 99999-9999',
        role: 'responsavel',
        condominioId: 'demo-condominio',
      }
      setUid('demo-uid')
      setRole('responsavel')
      setCondominioId('demo-condominio')
      setUser(demoUser)  // ✅ ADICIONADO
      setLoading(false)
      return
    }

    const unsub = onAuthStateChanged(auth as any, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setError(MENSAGENS?.ERRO?.AUTENTICACAO || 'Você precisa entrar.')
          router.push('/login')
          return
        }
        
        setUid(firebaseUser.uid)
        const ref = doc(db as any, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)
        
        if (!snap.exists()) {
          setError('Usuário sem perfil cadastrado.')
          router.push('/login')
          return
        }
        
        const data = snap.data() as any
        setRole(data.role)
        setCondominioId(data.condominioId || '')
        
        // ✅ ADICIONADO: Criar objeto user completo
        const userData: UserData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || data.email || '',
          nome: data.nome || '',
          telefone: data.telefone || '',
          role: data.role,
          condominioId: data.condominioId || '',
          apartamento: data.apartamento,
          bloco: data.bloco,
          ativo: data.ativo !== false,  // default true
        }
        setUser(userData)
        
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err)
        setError(MENSAGENS?.ERRO?.AUTENTICACAO || 'Erro de autenticação.')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    })

    return () => unsub()
  }, [router])

  return { uid, role, condominioId, user, loading, error }  // ✅ ADICIONADO: user no retorno
}