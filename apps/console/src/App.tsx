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
import { Placeholder } from './pages/Placeholder';

const STAFF = ['owner','admin','manager','dispatcher','supervisor','guard'] as const;
const MGR   = ['owner','admin','manager'] as const;

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

      {/* Stubs — same shape, different copy. Replaced as we extend. */}
      <Route path="/guards"      element={<ProtectedRoute allowed={[...STAFF]}><Layout><Placeholder title="Guards" /></Layout></ProtectedRoute>} />
      <Route path="/sites"       element={<ProtectedRoute allowed={[...STAFF]}><Layout><Placeholder title="Sites & Posts" /></Layout></ProtectedRoute>} />
      <Route path="/patrols"     element={<ProtectedRoute allowed={[...STAFF]}><Layout><Placeholder title="Patrols" /></Layout></ProtectedRoute>} />
      <Route path="/monitoring"  element={<ProtectedRoute allowed={[...STAFF]}><Layout><Placeholder title="Virtual Guarding" /></Layout></ProtectedRoute>} />
      <Route path="/transport"   element={<ProtectedRoute allowed={[...STAFF]}><Layout><Placeholder title="Secure Transport" /></Layout></ProtectedRoute>} />
      <Route path="/it"          element={<ProtectedRoute allowed={[...STAFF]}><Layout><Placeholder title="IT & Cyber" /></Layout></ProtectedRoute>} />
      <Route path="/clients"     element={<ProtectedRoute allowed={[...MGR]}><Layout><Placeholder title="Clients" /></Layout></ProtectedRoute>} />
      <Route path="/leads"       element={<ProtectedRoute allowed={[...MGR]}><Layout><Placeholder title="Sales Pipeline" /></Layout></ProtectedRoute>} />
      <Route path="/contracts"   element={<ProtectedRoute allowed={[...MGR]}><Layout><Placeholder title="Contracts" /></Layout></ProtectedRoute>} />
      <Route path="/invoices"    element={<ProtectedRoute allowed={[...MGR]}><Layout><Placeholder title="Invoices" /></Layout></ProtectedRoute>} />
      <Route path="/audit"       element={<ProtectedRoute allowed={[...MGR]}><Layout><Placeholder title="Audit Log" /></Layout></ProtectedRoute>} />
      <Route path="/messages"    element={<ProtectedRoute allowed={[...STAFF]}><Layout><Placeholder title="Messages" /></Layout></ProtectedRoute>} />
      <Route path="/settings"    element={<ProtectedRoute allowed={[...MGR]}><Layout><Placeholder title="Settings" /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
