import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { clientAuthAPI } from '@/lib/client-auth-api'
import { Loader2 } from 'lucide-react'

interface ClientProtectedRouteProps {
  children: React.ReactNode
}

export function ClientProtectedRoute({ children }: ClientProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = clientAuthAPI.getToken()
      if (!token) {
        setIsAuthenticated(false)
        return
      }

      // Verify token is still valid by calling /me
      await clientAuthAPI.getMe()
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Auth check failed:', error)
      clientAuthAPI.logout()
      setIsAuthenticated(false)
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to='/client/login' replace />
  }

  return <>{children}</>
}
