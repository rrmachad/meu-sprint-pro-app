import { useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import {
  CalendarCheck, CheckCircle2, AlertTriangle, Clock,
  Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/store/useAppStore';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths,
  startOfWeek, endOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function RevisionStatCard({ label, value, icon: Icon, gradient, iconBg, iconColor }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  gradient: string; iconBg: string; iconColor: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const animatedValue = useCountUp(isInView ? value : 0, 1200);

  return (
    <motion.div ref={ref} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
      <Card className={`glass border-border/30 bg-gradient-to-br ${gradient} hover:border-primary/30 hover:shadow-neon transition-all duration-300`}>
        <CardContent className="p-4 flex items-center gap-3">
          <motion.div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${iconBg}`}
            initial={{ rotate: -20, scale: 0.8 }}
            animate={isInView ? { rotate: 0, scale: 1 } : {}}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </motion.div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
            <motion.p className="text-xl font-extrabold tabular-nums"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {animatedValue}
            </motion.p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Revisions() {
  const revisions = useAppStore((s) => s.revisions);
  const disciplines = useAppStore((s) => s.disciplines);
  const completeRevision = useAppStore((s) => s.completeRevision);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const enrichedRevisions = useMemo(() => {
    return revisions.map((r) => {
      const disc = disciplines.find((d) => d.id === r.disciplineId);
      return {
        ...r,
        disciplineName: disc?.name || 'Desconhecida',
        isOverdue: !r.completed && r.dueDate < today,
        isToday: r.dueDate === today,
      };
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [revisions, disciplines, today]);

  const stats = useMemo(() => {
    const pending = enrichedRevisions.filter((r) => !r.completed);
    const completed = enrichedRevisions.filter((r) => r.completed);
    const overdue = pending.filter((r) => r.isOverdue);
    const todayRevs = pending.filter((r) => r.isToday);
    return { pending: pending.length, completed: completed.length, overdue: overdue.length, today: todayRevs.length };
  }, [enrichedRevisions]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Revisions grouped by date for calendar
  const revisionsByDate = useMemo(() => {
    const map: Record<string, { pending: number; completed: number; overdue: number }> = {};
    enrichedRevisions.forEach((r) => {
      if (!map[r.dueDate]) map[r.dueDate] = { pending: 0, completed: 0, overdue: 0 };
      if (r.completed) map[r.dueDate].completed++;
      else if (r.isOverdue) map[r.dueDate].overdue++;
      else map[r.dueDate].pending++;
    });
    return map;
  }, [enrichedRevisions]);

  const selectedRevisions = useMemo(() => {
    if (!selectedDate) return [];
    return enrichedRevisions.filter((r) => r.dueDate === selectedDate);
  }, [enrichedRevisions, selectedDate]);

  const listRevisions = (filter: 'all' | 'pending' | 'completed') => {
    if (filter === 'pending') return enrichedRevisions.filter((r) => !r.completed);
    if (filter === 'completed') return enrichedRevisions.filter((r) => r.completed);
    return enrichedRevisions;
  };

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl gradient-blue flex items-center justify-center">
            <CalendarCheck className="h-4 w-4 text-electric-blue-foreground" />
          </div>
          Revisões
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas revisões espaçadas</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pendentes', value: stats.pending, icon: Clock, gradient: 'from-electric-blue/15 to-electric-blue/5', iconBg: 'gradient-blue', iconColor: 'text-electric-blue-foreground' },
          { label: 'Para Hoje', value: stats.today, icon: CalendarCheck, gradient: 'from-sporty-orange/15 to-sporty-orange/5', iconBg: 'gradient-orange', iconColor: 'text-sporty-orange-foreground' },
          { label: 'Atrasadas', value: stats.overdue, icon: AlertTriangle, gradient: 'from-destructive/15 to-destructive/5', iconBg: 'bg-destructive', iconColor: 'text-destructive-foreground' },
          { label: 'Concluídas', value: stats.completed, icon: CheckCircle2, gradient: 'from-neon-green/15 to-neon-green/5', iconBg: 'gradient-neon', iconColor: 'text-neon-green-foreground' },
        ].map((s) => (
          <RevisionStatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Calendar */}
        <motion.div variants={itemVariants}>
          <Card className="glass border-border/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Calendário de Revisões</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-semibold min-w-[140px] text-center capitalize font-mono">
                    {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const data = revisionsByDate[dateStr];
                  const inMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate === dateStr;
                  const todayDay = isToday(day);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`relative flex flex-col items-center justify-center rounded-xl p-1.5 min-h-[48px] text-xs transition-all ${
                        !inMonth ? 'opacity-30' : ''
                      } ${isSelected ? 'bg-primary/15 ring-1 ring-primary shadow-neon' : 'hover:bg-muted/50'} ${
                        todayDay ? 'font-bold' : ''
                      }`}
                    >
                      <span className={todayDay ? 'text-primary' : ''}>{format(day, 'd')}</span>
                      {data && (
                        <div className="flex gap-0.5 mt-0.5">
                          {data.overdue > 0 && <span className="h-1.5 w-1.5 rounded-full bg-destructive" />}
                          {data.pending > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          {data.completed > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Atrasada</div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Pendente</div>
                <div className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Concluída</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Selected date / detail panel */}
        <motion.div variants={itemVariants} className="space-y-4">
          {selectedDate ? (
            <Card className="glass border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  {format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedRevisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma revisão nesta data</p>
                ) : (
                  selectedRevisions.map((r) => (
                    <motion.div
                      key={r.id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={`flex items-center justify-between rounded-xl p-3 border transition-all ${
                        r.completed
                          ? 'border-neon-green/20 bg-neon-green/5'
                          : r.isOverdue
                          ? 'border-destructive/20 bg-destructive/5'
                          : 'border-electric-blue/20 bg-electric-blue/5'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{r.disciplineName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{r.mark}</Badge>
                          {r.completed && <span className="text-[10px] text-success font-medium">✓ Concluída</span>}
                          {r.isOverdue && <span className="text-[10px] text-destructive font-medium">Atrasada</span>}
                        </div>
                      </div>
                      {!r.completed && (
                        <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs" onClick={() => completeRevision(r.id)}>
                          Concluir
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="glass border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Selecione um dia no calendário</p>
              </CardContent>
            </Card>
          )}

          {/* Quick list of overdue */}
          {stats.overdue > 0 && (
            <Card className="glass border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Atrasadas ({stats.overdue})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-[200px] overflow-auto">
                {enrichedRevisions.filter((r) => r.isOverdue).slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs py-1.5">
                    <div className="min-w-0">
                      <span className="font-medium truncate block">{r.disciplineName}</span>
                      <span className="text-muted-foreground">{r.mark} · {format(new Date(r.dueDate + 'T12:00:00'), 'dd/MM')}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] shrink-0" onClick={() => completeRevision(r.id)}>
                      Concluir
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
