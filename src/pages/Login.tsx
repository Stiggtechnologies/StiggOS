import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

function StiggLogo({ className = '', size = 160 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 400 100"
      width={size}
      height={size * 0.25}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="200"
        y="78"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="90"
        fill="#DC2626"
        letterSpacing="-2"
      >
        stigg
      </text>
      <text
        x="380"
        y="40"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="400"
        fontSize="16"
        fill="#DC2626"
      >
        ™
      </text>
    </svg>
  )
}

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <StiggLogo size={200} />
          <p className="text-secondary text-center mt-2">Security Operations Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-secondary rounded-lg border border-default p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-primary mb-6">Sign In</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-20 border border-red-500 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 bg-primary border border-default rounded-lg text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-primary border border-default rounded-lg text-primary placeholder-secondary focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#DC2626', color: '#ffffff' }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#B91C1C')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#DC2626')}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-default">
            <p className="text-xs text-secondary mb-3 font-semibold uppercase">Demo Credentials</p>
            <div className="space-y-2 text-xs bg-primary bg-opacity-50 p-3 rounded border border-default">
              <div>
                <p className="text-secondary">Admin Account:</p>
                <p className="text-primary font-mono">admin@stigg.ca / demo123</p>
              </div>
              <div className="pt-2">
                <p className="text-secondary">Client Account:</p>
                <p className="text-primary font-mono">client@northview.ca / demo123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-secondary text-xs mt-6">
          © 2026 Stigg Security Operations. All rights reserved.
        </p>
      </div>
    </div>
  )
}
