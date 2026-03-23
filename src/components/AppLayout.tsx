import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { StudyTimer } from '@/components/StudyTimer';
import { AdminNotificationBell } from '@/components/AdminNotificationBell';
import { useAppStore } from '@/store/useAppStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStudyReminders } from '@/hooks/useStudyReminders';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Wifi, WifiOff, Zap, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function AppLayout() {
  const candidateName = useAppStore((s) => s.settings.contest.candidateName);
  const location = useLocation();
  const { connectionStatus } = useSupabaseSync();
  const { user } = useAuth();
  useStudyReminders();

  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'moderator'])
      .maybeSingle()
      .then(({ data }) => setHasAdminAccess(!!data));
  }, [user?.id]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 md:h-16 flex items-center gap-3 border-b border-border/30 bg-card/40 backdrop-blur-xl px-4 md:px-6 shrink-0 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors h-11 w-11 flex items-center justify-center" />
            <div className="h-5 w-px bg-border/40" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm md:text-base font-semibold text-foreground truncate">
                {greeting()}, <span className="text-neon-green">{candidateName || 'Concurseiro'}</span>
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {hasAdminAccess && <AdminNotificationBell />}
              {connectionStatus === 'connected' ? (
                <div className="flex items-center gap-1.5 text-xs text-neon-green" title="Conectado em tempo real">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
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
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 pb-20 gradient-mesh">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, scale: 0.99, filter: 'blur(2px)' }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
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