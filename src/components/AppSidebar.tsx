import {
  Home, BarChart3, CalendarDays, ClipboardList,
  FileText, Settings, GraduationCap, Flame,
} from 'lucide-react';
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

  const completedTopics = topics.filter((t) => t.completed).length;
  const totalTopics = topics.length;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">
                ConcurseiroElite
              </span>
              <span className="text-[10px] text-sidebar-foreground/60">
                Planejamento Estratégico
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && streak > 0 && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2">
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-sidebar-foreground">
              {streak} {streak === 1 ? 'dia' : 'dias'} seguidos!
            </span>
          </div>
        )}

        {!collapsed && totalTopics > 0 && (
          <div className="mx-3 mb-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-sidebar-foreground/60">Progresso do Edital</span>
              <span className="text-[10px] font-medium text-sidebar-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent/50 p-3 text-center">
            <p className="text-[10px] text-sidebar-foreground/50">
              v1.0 — Feito com dedicação
            </p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
