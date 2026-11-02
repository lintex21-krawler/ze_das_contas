import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthGuard: React.FC = () => {
  const { user, families, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-text-primary gap-3">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        <span className="text-xs text-text-secondary font-medium">
          Carregando ambiente seguro...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se o usuário está logado mas ainda não tem família criada/associada, direciona para o onboarding
  if (families.length === 0 && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};
