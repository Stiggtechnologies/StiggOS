import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
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

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/guards" element={<Guards />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/patrol-tracking" element={<PatrolTracking />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/kpi-analytics" element={<KPIAnalytics />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/invoicing" element={<Invoicing />} />
        <Route path="/client-portal" element={<ClientPortal />} />
        <Route path="/ai-intelligence" element={<AIIntelligence />} />
        <Route path="/route-planning" element={<RoutePlanning />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/communications" element={<Communications />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
