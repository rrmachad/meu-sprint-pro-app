import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { StudyTimer } from '@/components/StudyTimer';
import { useAppStore } from '@/store/useAppStore';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  const contestName = useAppStore((s) => s.settings.contest.name);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border bg-card px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            {contestName && (
              <span className="text-sm font-medium text-muted-foreground truncate">
                {contestName}
              </span>
            )}
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
        <StudyTimer />
      </div>
    </SidebarProvider>
  );
}
