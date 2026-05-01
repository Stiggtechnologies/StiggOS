import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../lib/AuthContext';
import type { UserRole } from '@stigg/shared';

export function ProtectedRoute({
  children,
  allowed,
}: {
  children: ReactNode;
  allowed: UserRole[];
}) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-400">Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (profile && !allowed.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
