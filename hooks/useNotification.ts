// hooks/useNotification.ts

import { useState, useCallback } from 'react'
import { TIMEOUT } from '@/constants/porteiro.constants'

type NotificationType = 'success' | 'error' | null

interface Notification {
  type: NotificationType
  message: string
}

interface UseNotificationReturn {
  notification: Notification | null
  showSuccess: (message: string) => void
  showError: (message: string) => void
  clearNotification: () => void
}

export const useNotification = (): UseNotificationReturn => {
  const [notification, setNotification] = useState<Notification | null>(null)

  const clearNotification = useCallback(() => {
    setNotification(null)
  }, [])

  const showSuccess = useCallback((message: string) => {
    setNotification({ type: 'success', message })
    setTimeout(() => {
      setNotification(null)
    }, TIMEOUT.MENSAGEM_SUCESSO)
  }, [])

  const showError = useCallback((message: string) => {
    setNotification({ type: 'error', message })
    setTimeout(() => {
      setNotification(null)
    }, TIMEOUT.MENSAGEM_ERRO)
  }, [])

  return {
    notification,
    showSuccess,
    showError,
    clearNotification,
  }
}
