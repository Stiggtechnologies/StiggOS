import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { AuthUser } from './types'

interface AuthContextType {
  user: AuthUser | null
  profile: AuthUser | null
  role: string | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo mode credentials
const DEMO_USERS = {
  'admin@stigg.ca': {
    password: 'demo123',
    role: 'admin' as const,
    fullName: 'Admin User',
  },
  'client@northview.ca': {
    password: 'demo123',
    role: 'client' as const,
    fullName: 'Client User',
  },
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<AuthUser | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if there's an existing session
        const { data: sessionData } = await supabase.auth.getSession()

        if (sessionData?.session?.user) {
          // Fetch user profile
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', sessionData.session.user.id)
            .single()

          if (profileData) {
            const authUser: AuthUser = {
              id: profileData.id,
              email: profileData.email,
              full_name: profileData.full_name,
              role: profileData.role,
              org_id: profileData.org_id,
              client_id: profileData.client_id,
            }
            setUser(authUser)
            setProfile(authUser)
            setRole(profileData.role)
          }
        }
      } catch (error) {
        console.log('Auth init error (expected if Supabase is not configured):', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Try Supabase auth first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Fall back to demo mode
        const demoUser = DEMO_USERS[email as keyof typeof DEMO_USERS]
        if (demoUser && demoUser.password === password) {
          // Successful demo login
          const authUser: AuthUser = {
            id: `demo-${email}`,
            email: email,
            full_name: demoUser.fullName,
            role: demoUser.role,
            org_id: 'demo-org',
            client_id: demoUser.role === 'client' ? 'demo-client-1' : undefined,
          }
          setUser(authUser)
          setProfile(authUser)
          setRole(demoUser.role)
          setDemoMode(true)
        } else {
          throw new Error('Invalid email or password')
        }
      } else if (data?.user) {
        // Supabase auth succeeded, fetch profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileData) {
          const authUser: AuthUser = {
            id: profileData.id,
            email: profileData.email,
            full_name: profileData.full_name,
            role: profileData.role,
            org_id: profileData.org_id,
            client_id: profileData.client_id,
          }
          setUser(authUser)
          setProfile(authUser)
          setRole(profileData.role)
          setDemoMode(false)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      if (!demoMode) {
        await supabase.auth.signOut()
      }
      setUser(null)
      setProfile(null)
      setRole(null)
      setDemoMode(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
