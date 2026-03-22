import {
  Home, BarChart3, CalendarDays, ClipboardList,
  FileText, Settings, Flame, Sun, Moon, LogOut, RotateCcw,
  Zap, Route, Brain, Crosshair, FlaskConical, CreditCard, Lock,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import { useUpgradeModal } from '@/components/UpgradeModal';

const PREMIUM_ROUTES = ['/indicadores', '/planejamento', '/edital', '/simulados', '/revisoes'];

const navItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Indicadores', url: '/indicadores', icon: BarChart3 },
  { title: 'Rota', url: '/planejamento', icon: Route },
  { title: 'Fixação', url: '/revisoes', icon: Brain },
  { title: 'Raio-X', url: '/edital', icon: Crosshair },
  { title: 'Testes', url: '/simulados', icon: FlaskConical },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
  { title: 'Assinatura', url: '/assinatura', icon: CreditCard },
];

function LogoutButton({ collapsed }: { collapsed: boolean }) {
  const { signOut } = useAuth();
  return (
    <button
      onClick={signOut}
      className="flex items-center gap-3 w-full rounded-xl px-3 py-3 min-h-[44px] text-sm text-destructive/70 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {!collapsed && <span>Sair</span>}
    </button>
  );
}

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const streak = useAppStore((s) => s.streak);
  const topics = useAppStore((s) => s.topics);
  const revisions = useAppStore((s) => s.revisions);
  const { theme, setTheme } = useTheme();
  const { subscribed } = useSubscription();
  const { showUpgradeModal } = useUpgradeModal();

  const pendingRevisionCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return revisions.filter((r) => !r.completed && r.dueDate <= today).length;
  }, [revisions]);

  const completedTopics = topics.filter((t) => t.completed).length;
  const totalTopics = topics.length;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-neon shadow-neon shrink-0">
            <Zap className="h-5 w-5 text-neon-green-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold text-sidebar-foreground tracking-tight uppercase">
                Meu Sprint Pro
              </span>
              <span className="text-[10px] text-neon-green/70 font-semibold tracking-wider uppercase">
                Performance Mental
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {!collapsed && streak > 0 && (
          <div className="mx-1 mb-2 flex items-center gap-2.5 rounded-xl bg-sporty-orange/10 border border-sporty-orange/20 px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-orange shrink-0">
              <Flame className="h-3.5 w-3.5 text-sporty-orange-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-sporty-orange">
                {streak} {streak === 1 ? 'dia' : 'dias'} de streak!
              </span>
              <span className="text-[10px] text-sidebar-foreground/40">Mantenha o ritmo 🔥</span>
            </div>
          </div>
        )}

        {!collapsed && totalTopics > 0 && (
          <div className="mx-1 mb-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Progresso</span>
              <span className="text-xs font-bold text-neon-green">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <span className="text-[10px] text-sidebar-foreground/40">{completedTopics} de {totalTopics} tópicos</span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isLocked = !subscribed && PREMIUM_ROUTES.includes(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={isLocked ? '#' : item.url}
                        end={item.url === '/'}
                        onClick={(e) => {
                          if (isLocked) {
                            e.preventDefault();
                            showUpgradeModal(item.title);
                          } else {
                            setOpenMobile(false);
                          }
                        }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 min-h-[44px] text-sm transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground ${isLocked ? 'text-sidebar-foreground/40' : 'text-sidebar-foreground/70'}`}
                        activeClassName={isLocked ? '' : 'bg-neon-green/10 text-neon-green font-semibold glow-neon'}
                      >
                        <div className="relative shrink-0">
                          <item.icon className="h-4 w-4" />
                          {item.url === '/revisoes' && !isLocked && pendingRevisionCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-sporty-orange text-[8px] font-bold text-sporty-orange-foreground px-0.5">
                              {pendingRevisionCount > 9 ? '9+' : pendingRevisionCount}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-3 min-h-[44px] text-sm text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && (
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          )}
        </button>
        <LogoutButton collapsed={collapsed} />
        {!collapsed && (
          <div className="rounded-xl bg-sidebar-accent/30 border border-sidebar-border/30 p-3 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-sidebar-foreground/40">
              <Zap className="h-3 w-3 text-neon-green/50" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Meu Sprint Pro v1.0</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
