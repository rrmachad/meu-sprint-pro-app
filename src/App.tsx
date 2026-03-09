import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/AppLayout';
import { SetupWizard } from '@/components/SetupWizard';
import { useAppStore } from '@/store/useAppStore';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Indicators = lazy(() => import('./pages/Indicators'));
const Planning = lazy(() => import('./pages/Planning'));
const Syllabus = lazy(() => import('./pages/Syllabus'));
const MockExams = lazy(() => import('./pages/MockExams'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const Revisions = lazy(() => import('./pages/Revisions'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

function AppContent() {
  const setupCompleted = useAppStore((s) => s.settings.setupCompleted);

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

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

import { ThemeProvider } from 'next-themes';

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <AppContent />
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
