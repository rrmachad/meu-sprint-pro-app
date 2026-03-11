import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { StudyTimer } from '@/components/StudyTimer';
import { useAppStore } from '@/store/useAppStore';
import { useStudyReminders } from '@/hooks/useStudyReminders';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';

export function AppLayout() {
  const contestName = useAppStore((s) => s.settings.contest.name);
  const location = useLocation();
  const { connectionStatus } = useSupabaseSync();
  useStudyReminders();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border/50 bg-card/60 backdrop-blur-xl px-4 shrink-0 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <div className="h-5 w-px bg-border/60" />
            {contestName && (
              <span className="text-sm font-medium text-muted-foreground truncate">
                {contestName}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-500" title="Conectado em tempo real">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Wifi className="h-3.5 w-3.5" />
                </div>
              ) : connectionStatus === 'disconnected' ? (
                <div className="flex items-center gap-1.5 text-xs text-destructive" title="Desconectado">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                  </span>
                  <WifiOff className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Conectando...">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                  <Wifi className="h-3.5 w-3.5 opacity-50" />
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 gradient-mesh">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <StudyTimer />
      </div>
    </SidebarProvider>
  );
}
