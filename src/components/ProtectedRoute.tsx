import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { BarChart3 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
  allowedRoles?: string[]
}

export function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading, role } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin">
            <BarChart3 size={32} className="text-accent" />
          </div>
          <p className="text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check role restrictions
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role || '')) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
