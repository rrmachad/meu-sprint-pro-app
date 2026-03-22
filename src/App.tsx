import { lazy, Suspense, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSubscription } from '@/hooks/useSubscription';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { AppLayout } from '@/components/AppLayout';
import { SetupWizard } from '@/components/SetupWizard';
import { MobileOnboarding } from '@/components/MobileOnboarding';
import { useAppStore } from '@/store/useAppStore';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { UpgradeModalProvider } from '@/components/UpgradeModal';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Indicators = lazy(() => import('./pages/Indicators'));
const Planning = lazy(() => import('./pages/Planning'));
const Syllabus = lazy(() => import('./pages/Syllabus'));
const MockExams = lazy(() => import('./pages/MockExams'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const Revisions = lazy(() => import('./pages/Revisions'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

const queryClient = new QueryClient();

const ONBOARDING_KEY = 'meu-sprint-pro-onboarding-done';

function useOnboardingSeen() {
  const [seen, setSeen] = useState(() => localStorage.getItem(ONBOARDING_KEY) === '1');
  const markSeen = () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setSeen(true);
  };
  const reset = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setSeen(false);
  };
  return { seen, markSeen, reset };
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const setupCompleted = useAppStore((s) => s.settings.setupCompleted);
  const { syncing } = useSupabaseSync();
  const { subscribed, loading: subLoading } = useSubscription();

  if (loading || syncing || subLoading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;

  if (!setupCompleted) {
    return <SetupWizard />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assinatura" element={<SubscriptionPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/indicadores" element={subscribed ? <Indicators /> : <Navigate to="/assinatura" replace />} />
        <Route path="/planejamento" element={subscribed ? <Planning /> : <Navigate to="/assinatura" replace />} />
        <Route path="/edital" element={subscribed ? <Syllabus /> : <Navigate to="/assinatura" replace />} />
        <Route path="/simulados" element={subscribed ? <MockExams /> : <Navigate to="/assinatura" replace />} />
        <Route path="/revisoes" element={subscribed ? <Revisions /> : <Navigate to="/assinatura" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const { seen, markSeen } = useOnboardingSeen();

  if (loading) return <Loading />;

  // Show onboarding BEFORE login for first-time visitors
  if (!seen) {
    return <MobileOnboarding onComplete={markSeen} />;
  }

  return (
    <Routes>
      <Route path="/landing" element={user ? <Navigate to="/" replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/cadastro" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/esqueci-senha" element={user ? <Navigate to="/" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/*" element={user ? <ProtectedRoutes /> : <Navigate to="/landing" replace />} />
    </Routes>
  );
}

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <UpgradeModalProvider>
              <Suspense fallback={<Loading />}>
                <AppRoutes />
              </Suspense>
            </UpgradeModalProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

// Export for settings page reset
export { ONBOARDING_KEY };
