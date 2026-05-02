import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { CommandCenter } from './pages/CommandCenter';
import { Incidents } from './pages/Incidents';
import { IncidentCopilot } from './pages/IncidentCopilot';
import { AIIntelligence } from './pages/AIIntelligence';
import { Scheduling } from './pages/Scheduling';
import { Compliance } from './pages/Compliance';
import { ForensicSearch } from './pages/ForensicSearch';
import { Guards } from './pages/Guards';
import { Sites } from './pages/Sites';
import { Clients } from './pages/Clients';
import { Contracts } from './pages/Contracts';
import { Invoices } from './pages/Invoices';
import { AuditLog } from './pages/AuditLog';
import { Settings } from './pages/Settings';
import { SalesPipeline } from './pages/SalesPipeline';
import { Patrols } from './pages/Patrols';
import { EquipmentAssets } from './pages/EquipmentAssets';
import { ITCyber } from './pages/ITCyber';
import { SecureTransport } from './pages/SecureTransport';
import { Messages } from './pages/Messages';
import { Cameras } from './pages/Cameras';
import { Vehicles } from './pages/Vehicles';
import { Assets } from './pages/Assets';
import { Dispatch } from './pages/Dispatch';

const STAFF = ['owner','admin','manager','dispatcher','supervisor','guard'] as const;
const MGR   = ['owner','admin','manager'] as const;
const ADMIN = ['owner','admin'] as const;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute allowed={[...STAFF]}><Layout><CommandCenter /></Layout></ProtectedRoute>} />

      <Route path="/incidents" element={<ProtectedRoute allowed={[...STAFF]}><Layout><Incidents /></Layout></ProtectedRoute>} />
      <Route path="/incidents/copilot" element={<ProtectedRoute allowed={[...STAFF]}><Layout><IncidentCopilot /></Layout></ProtectedRoute>} />

      <Route path="/ai" element={<ProtectedRoute allowed={[...MGR, 'supervisor']}><Layout><AIIntelligence /></Layout></ProtectedRoute>} />
      <Route path="/ai/forensic" element={<ProtectedRoute allowed={[...MGR, 'supervisor']}><Layout><ForensicSearch /></Layout></ProtectedRoute>} />

      <Route path="/scheduling" element={<ProtectedRoute allowed={[...MGR, 'dispatcher']}><Layout><Scheduling /></Layout></ProtectedRoute>} />
      <Route path="/compliance" element={<ProtectedRoute allowed={[...MGR]}><Layout><Compliance /></Layout></ProtectedRoute>} />

      <Route path="/guards"      element={<ProtectedRoute allowed={[...MGR, 'supervisor']}><Layout><Guards /></Layout></ProtectedRoute>} />
      <Route path="/sites"       element={<ProtectedRoute allowed={[...MGR, 'supervisor']}><Layout><Sites /></Layout></ProtectedRoute>} />
      <Route path="/patrols"     element={<ProtectedRoute allowed={[...STAFF]}><Layout><Patrols /></Layout></ProtectedRoute>} />
      <Route path="/transport"   element={<ProtectedRoute allowed={[...STAFF]}><Layout><SecureTransport /></Layout></ProtectedRoute>} />
      <Route path="/equipment-assets" element={<ProtectedRoute allowed={[...STAFF]}><Layout><EquipmentAssets /></Layout></ProtectedRoute>} />
      <Route path="/cameras"     element={<ProtectedRoute allowed={[...MGR, 'supervisor', 'dispatcher']}><Layout><Cameras /></Layout></ProtectedRoute>} />
      <Route path="/vehicles"    element={<ProtectedRoute allowed={[...MGR, 'supervisor', 'dispatcher']}><Layout><Vehicles /></Layout></ProtectedRoute>} />
      <Route path="/assets"      element={<ProtectedRoute allowed={[...MGR, 'supervisor']}><Layout><Assets /></Layout></ProtectedRoute>} />
      <Route path="/dispatch"    element={<ProtectedRoute allowed={[...MGR, 'dispatcher']}><Layout><Dispatch /></Layout></ProtectedRoute>} />
      <Route path="/it"          element={<ProtectedRoute allowed={[...MGR, 'it_tech']}><Layout><ITCyber /></Layout></ProtectedRoute>} />

      <Route path="/clients"     element={<ProtectedRoute allowed={[...MGR]}><Layout><Clients /></Layout></ProtectedRoute>} />
      <Route path="/leads"       element={<ProtectedRoute allowed={[...MGR]}><Layout><SalesPipeline /></Layout></ProtectedRoute>} />
      <Route path="/contracts"   element={<ProtectedRoute allowed={[...MGR]}><Layout><Contracts /></Layout></ProtectedRoute>} />
      <Route path="/invoices"    element={<ProtectedRoute allowed={[...MGR]}><Layout><Invoices /></Layout></ProtectedRoute>} />

      <Route path="/audit"       element={<ProtectedRoute allowed={[...ADMIN]}><Layout><AuditLog /></Layout></ProtectedRoute>} />
      <Route path="/messages"    element={<ProtectedRoute allowed={[...STAFF]}><Layout><Messages /></Layout></ProtectedRoute>} />
      <Route path="/settings"    element={<ProtectedRoute allowed={[...ADMIN]}><Layout><Settings /></Layout></ProtectedRoute>} />

      {/* Monitoring is its own app — the console links out via the Layout sidebar. */}
      <Route path="/monitoring" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
