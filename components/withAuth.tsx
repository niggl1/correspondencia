'use client'
import { useAuth } from '@/hooks/useAuth'

export default function withAuth<T>(Component: (props: T)=>JSX.Element, roles?: string[]) {
  return function Protected(props: T) {
    const { loading } = useAuth()
    if (loading) return <div className="card">Verificando sessão...</div>
    return <Component {...props} />
  }
}
