import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

function StiggPortalLogo() {
  return (
    <svg viewBox="0 0 300 70" width={80} height={19} xmlns="http://www.w3.org/2000/svg">
      <text
        x="0"
        y="58"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="68"
        fill="#DC2626"
        letterSpacing="-2"
      >
        stigg
      </text>
    </svg>
  )
}

interface ClientPortalLayoutProps {
  children: React.ReactNode
}

export function ClientPortalLayout({ children }: ClientPortalLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Mock properties for demo
  const properties = [
    { id: '1', name: 'North Tower - Downtown' },
    { id: '2', name: 'South Commons - Midtown' },
    { id: '3', name: 'East Plaza - Harbor District' },
  ]
  const [selectedProperty, setSelectedProperty] = useState(properties[0])

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* Header */}
      <header className="bg-secondary border-b border-default px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo and Branding */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <StiggPortalLogo />
            <div className="hidden sm:block">
              <p className="text-xs text-secondary font-medium" style={{ marginTop: '2px' }}>Client Portal</p>
            </div>
          </div>

          {/* Property Selector */}
          <div className="flex-1 max-w-xs mx-4 hidden sm:block">
            <div className="relative">
              <button
                onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-primary border border-default rounded-lg text-primary hover:border-accent transition-colors"
              >
                <span className="text-sm truncate">{selectedProperty.name}</span>
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 transition-transform ${
                    propertyDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {propertyDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-secondary border border-default rounded-lg shadow-lg z-50">
                  {properties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => {
                        setSelectedProperty(property)
                        setPropertyDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        property.id === selectedProperty.id
                          ? 'bg-accent text-secondary font-semibold'
                          : 'text-primary hover:bg-card'
                      }`}
                    >
                      {property.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-medium text-primary">{profile?.full_name}</p>
              <p className="text-xs text-secondary">{profile?.email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-card rounded-lg transition-colors"
              title="Log out"
            >
              <LogOut size={20} className="text-secondary" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 hover:bg-card rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <X size={20} className="text-secondary" />
              ) : (
                <Menu size={20} className="text-secondary" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Property Selector */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-4 pt-4 border-t border-default">
            <p className="text-xs text-secondary font-semibold mb-2 uppercase">Property</p>
            <div className="space-y-1">
              {properties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => {
                    setSelectedProperty(property)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    property.id === selectedProperty.id
                      ? 'bg-accent text-secondary font-semibold'
                      : 'text-primary hover:bg-card'
                  }`}
                >
                  {property.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}
