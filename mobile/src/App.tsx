import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastViewport } from '@/components/common/ToastViewport';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ExplorePage } from '@/pages/ExplorePage';
import { GroupsPage } from '@/pages/GroupsPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { SignupPage } from '@/pages/SignupPage';
import { StockDetailPage } from '@/pages/StockDetailPage';
import { useAuthStore } from '@/stores/authStore';

function PublicOnlyRoute(props: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);

  if (token) {
    return <Navigate to="/" replace />;
  }

  return <>{props.children}</>;
}

function ThemeBridge() {
  useEffect(() => {
    const stored = window.localStorage.getItem('glance-mobile-theme');
    document.documentElement.dataset.theme = stored === 'light' ? 'light' : 'dark';
  }, []);

  return null;
}

export default function App() {
  return (
    <>
      <ThemeBridge />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:symbol" element={<StockDetailPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastViewport />
    </>
  );
}
