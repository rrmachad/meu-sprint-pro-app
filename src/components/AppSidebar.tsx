import {
  Home, BarChart3, CalendarDays, ClipboardList,
  FileText, Settings, GraduationCap, Flame, Sparkles, Sun, Moon, Bell, RotateCcw,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useAppStore } from '@/store/useAppStore';
import { Progress } from '@/components/ui/progress';

const navItems = [
  { title: 'Painel Inicial', url: '/', icon: Home },
  { title: 'Indicadores', url: '/indicadores', icon: BarChart3 },
  { title: 'Planejamento', url: '/planejamento', icon: CalendarDays },
  { title: 'Revisões', url: '/revisoes', icon: RotateCcw },
  { title: 'Edital', url: '/edital', icon: ClipboardList },
  { title: 'Simulados', url: '/simulados', icon: FileText },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const streak = useAppStore((s) => s.streak);
  const topics = useAppStore((s) => s.topics);
  const revisions = useAppStore((s) => s.revisions);
  const { theme, setTheme } = useTheme();

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
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow-sm shrink-0">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
            <div className="absolute -inset-0.5 rounded-xl bg-primary/20 blur-sm -z-10" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
                ConcurseiroElite
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 font-medium">
                Planejamento Estratégico
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {!collapsed && streak > 0 && (
          <div className="mx-1 mb-2 flex items-center gap-2.5 rounded-xl bg-accent/10 border border-accent/20 px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-accent shrink-0">
              <Flame className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-accent">
                {streak} {streak === 1 ? 'dia' : 'dias'} seguidos!
              </span>
              <span className="text-[10px] text-sidebar-foreground/40">Continue assim 🔥</span>
            </div>
          </div>
        )}

        {!collapsed && totalTopics > 0 && (
          <div className="mx-1 mb-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-sidebar-foreground/50 uppercase tracking-wider">Edital</span>
              <span className="text-xs font-bold text-primary">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <span className="text-[10px] text-sidebar-foreground/40">{completedTopics} de {totalTopics} tópicos</span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-primary/10 text-primary font-semibold shadow-glow-sm"
                    >
                      <div className="relative shrink-0">
                        <item.icon className="h-4 w-4" />
                        {(item.url === '/' || item.url === '/revisoes') && pendingRevisionCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground px-0.5">
                            {pendingRevisionCount > 9 ? '9+' : pendingRevisionCount}
                          </span>
                        )}
                      </div>
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
        {!collapsed && (
          <div className="rounded-xl bg-sidebar-accent/30 border border-sidebar-border/30 p-3 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-sidebar-foreground/40">
              <Sparkles className="h-3 w-3" />
              <span className="text-[10px] font-medium">v1.0</span>
            </div>
            <p className="text-[9px] text-sidebar-foreground/30">
              Feito com dedicação
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
