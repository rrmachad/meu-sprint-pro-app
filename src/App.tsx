import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { AppLayout } from '@/components/AppLayout';
import { SetupWizard } from '@/components/SetupWizard';
import { useAppStore } from '@/store/useAppStore';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
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

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const setupCompleted = useAppStore((s) => s.settings.setupCompleted);

  // Sync data from Supabase when logged in
  useSupabaseSync();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;

  if (!setupCompleted) {
    return <SetupWizard />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/indicadores" element={<Indicators />} />
        <Route path="/planejamento" element={<Planning />} />
        <Route path="/edital" element={<Syllabus />} />
        <Route path="/simulados" element={<MockExams />} />
        <Route path="/revisoes" element={<Revisions />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/cadastro" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/*" element={<ProtectedRoutes />} />
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
            <Suspense fallback={<Loading />}>
              <AppRoutes />
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
