import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/app/guards/AuthGuard';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { QuickTransactionPage } from '@/modules/transactions/pages/QuickTransactionPage';
import { AnalyticsPage } from '@/modules/analytics/pages/AnalyticsPage';
import { CardsPage } from '@/modules/cards/pages/CardsPage';
import { AccountsPage } from '@/modules/accounts/pages/AccountsPage';
import { CategoriesPage } from '@/modules/categories/pages/CategoriesPage';
import { ShoppingListsPage } from '@/modules/shopping/pages/ShoppingListsPage';
import { RecurringPage } from '@/modules/recurring/pages/RecurringPage';
import { FamilyPage } from '@/modules/family/pages/FamilyPage';
import { SettingsPage } from '@/modules/settings/pages/SettingsPage';
import { MoreMenuPage } from '@/modules/settings/pages/MoreMenuPage';
import { SyncDebugPage } from '@/modules/settings/pages/SyncDebugPage';
import { ExtractPage } from '@/modules/analytics/pages/ExtractPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { OnboardingPage } from '@/modules/auth/pages/OnboardingPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    path: '/',
    element: <AuthGuard />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'lancar',
            element: <QuickTransactionPage />,
          },
          {
            path: 'analises',
            element: <AnalyticsPage />,
          },
          {
            path: 'cartoes',
            element: <CardsPage />,
          },
          {
            path: 'contas',
            element: <AccountsPage />,
          },
          {
            path: 'categorias',
            element: <CategoriesPage />,
          },
          {
            path: 'listas',
            element: <ShoppingListsPage />,
          },
          {
            path: 'recorrencias',
            element: <RecurringPage />,
          },
          {
            path: 'familia',
            element: <FamilyPage />,
          },
          {
            path: 'configuracoes',
            element: <SettingsPage />,
          },
          {
            path: 'mais',
            element: <MoreMenuPage />,
          },
          {
            path: 'extrato',
            element: <ExtractPage />,
          },
          {
            path: 'sync-debug',
            element: <SyncDebugPage />,
          },
          {
            path: '*',
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
]);
