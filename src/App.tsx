import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { Layout } from './components/Layout'
import { ClientPortalLayout } from './components/ClientPortalLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { CommandCenter } from './pages/CommandCenter'
import { Clients } from './pages/Clients'
import { Guards } from './pages/Guards'
import { Scheduling } from './pages/Scheduling'
import { PatrolTracking } from './pages/PatrolTracking'
import { Incidents } from './pages/Incidents'
import { KPIAnalytics } from './pages/KPIAnalytics'
import { Contracts } from './pages/Contracts'
import { Invoicing } from './pages/Invoicing'
import { ClientPortal } from './pages/ClientPortal'
import { AIIntelligence } from './pages/AIIntelligence'
import { RoutePlanning } from './pages/RoutePlanning'
import { Compliance } from './pages/Compliance'
import { Communications } from './pages/Communications'
import { Settings } from './pages/Settings'
import { AuditLog } from './pages/AuditLog'
import { AutomationRules } from './pages/AutomationRules'
import { EquipmentAssets } from './pages/EquipmentAssets'
import { FinancialDashboard } from './pages/FinancialDashboard'
import { HRWorkforce } from './pages/HRWorkforce'
import { NotificationsAlerts } from './pages/NotificationsAlerts'
import { ReportingEngine } from './pages/ReportingEngine'
import { SalesPipeline } from './pages/SalesPipeline'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'guard']}>
              <Layout>
                <CommandCenter />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <Layout>
                <Clients />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/guards"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <Layout>
                <Guards />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduling"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <Layout>
                <Scheduling />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/patrol-tracking"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <Layout>
                <PatrolTracking />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor', 'guard']}>
              <Layout>
                <Incidents />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/kpi-analytics"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <KPIAnalytics />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <Contracts />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoicing"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <Invoicing />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-portal"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <ClientPortal />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-intelligence"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <AIIntelligence />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/route-planning"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <Layout>
                <RoutePlanning />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <Compliance />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <Communications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <AuditLog />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/automation-rules"
          element={
            <ProtectedRoute requiredRole="admin">
              <Layout>
                <AutomationRules />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipment-assets"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <Layout>
                <EquipmentAssets />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/financial-dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <FinancialDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr-workforce"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <HRWorkforce />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'supervisor']}>
              <Layout>
                <NotificationsAlerts />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reporting"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <ReportingEngine />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales-pipeline"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Layout>
                <SalesPipeline />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Client Portal Routes */}
        <Route
          path="/portal/*"
          element={
            <ProtectedRoute requiredRole="client">
              <ClientPortalLayout>
                <ClientPortal />
              </ClientPortalLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
