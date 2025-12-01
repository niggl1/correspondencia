'use client'
import { useAuth } from '@/hooks/useAuth'
import { ComponentType } from 'react'

export default function withAuth<P extends object>(
  Component: ComponentType<P>, 
  roles?: string[]
) {
  return function Protected(props: P) {
    const { loading } = useAuth()
    if (loading) return <div className="card">Verificando sessão...</div>
    return <Component {...props} />
  }
}
