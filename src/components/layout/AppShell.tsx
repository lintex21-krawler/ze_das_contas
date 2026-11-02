import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarNavigation } from './SidebarNavigation';
import { BottomNavigation } from './BottomNavigation';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      {/* Banner de estado offline persistente */}
      <OfflineBanner />

      <div className="flex-1 flex w-full">
        {/* Barra lateral desktop */}
        <SidebarNavigation />

        {/* Conteúdo principal */}
        <main className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 py-3 md:py-6 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Barra de navegação inferior mobile */}
      <BottomNavigation />
    </div>
  );
};
