import { useMemo, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { BookOpen, Clock, Target, TrendingUp, CheckCircle2, BarChart3, FileText, Flame, Bell, AlertTriangle, CalendarCheck, Sparkles, Trophy, Timer, Crosshair, Activity } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
} as const;

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(199 89% 48%)',
  'hsl(350 80% 55%)',
  'hsl(170 60% 45%)',
];

export default function Dashboard() {
  const studyRecords = useAppStore((s) => s.studyRecords);
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const goals = useAppStore((s) => s.settings.goals);
  const streak = useAppStore((s) => s.streak);
  const revisions = useAppStore((s) => s.revisions);
  const completeRevision = useAppStore((s) => s.completeRevision);
  const candidateName = useAppStore((s) => s.settings.contest.candidateName);

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = studyRecords.filter((r) => r.date === today);
  const todaySeconds = todayRecords.reduce((a, r) => a + r.durationSeconds, 0);
  const todayQuestions = todayRecords.reduce((a, r) => a + r.correctAnswers + r.wrongAnswers + r.blankAnswers, 0);
  const todayPages = todayRecords.reduce((a, r) => a + r.pagesRead, 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const disciplineProgress = useMemo(() => {
    return disciplines
      .map((d) => {
        const dTopics = topics.filter((t) => t.disciplineId === d.id);
        const completed = dTopics.filter((t) => t.completed).length;
        const total = dTopics.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          name: d.name.length > 20 ? d.name.substring(0, 20) + '…' : d.name,
          fullName: d.name,
          completed,
          pending: total - completed,
          total,
          percent,
        };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [disciplines, topics]);

  const studyHoursData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

    const hoursMap: Record<string, number> = {};
    studyRecords
      .filter((r) => r.date >= cutoff)
      .forEach((r) => {
        hoursMap[r.disciplineId] = (hoursMap[r.disciplineId] || 0) + r.durationSeconds;
      });

    return disciplines
      .map((d) => ({
        name: d.name.length > 15 ? d.name.substring(0, 15) + '…' : d.name,
        horas: Math.round(((hoursMap[d.id] || 0) / 3600) * 10) / 10,
      }))
      .filter((d) => d.horas > 0)
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);
  }, [disciplines, studyRecords]);

  const pieData = useMemo(() => {
    const total = topics.length;
    const completed = topics.filter((t) => t.completed).length;
    if (total === 0) return [];
    return [
      { name: 'Concluídos', value: completed },
      { name: 'Pendentes', value: total - completed },
    ];
  }, [topics]);

  // Weekly performance line chart data
  const weeklyPerformanceData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    return weekDays.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRecords = studyRecords.filter((r) => r.date === dateStr);
      const hours = dayRecords.reduce((a, r) => a + r.durationSeconds, 0) / 3600;
      return { name: label, horas: Math.round(hours * 10) / 10 };
    });
  }, [studyRecords]);

  // Weekly goals cumulative data
  const weeklyGoalsData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split('T')[0];

    const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    let cumHours = 0, cumQuestions = 0, cumPages = 0;

    return weekDays.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRecords = studyRecords.filter((r) => r.date === dateStr);
      cumHours += dayRecords.reduce((a, r) => a + r.durationSeconds, 0) / 3600;
      cumQuestions += dayRecords.reduce((a, r) => a + r.correctAnswers + r.wrongAnswers + r.blankAnswers, 0);
      cumPages += dayRecords.reduce((a, r) => a + r.pagesRead, 0);
      return { name: label, horas: Math.round(cumHours * 10) / 10, questoes: cumQuestions, paginas: cumPages };
    });
  }, [studyRecords]);

  const weeklyTotals = weeklyGoalsData[weeklyGoalsData.length - 1] || { horas: 0, questoes: 0, paginas: 0 };
  const weeklyHoursPercent = goals.weeklyHours > 0 ? Math.min(100, Math.round((weeklyTotals.horas / goals.weeklyHours) * 100)) : 0;
  const weeklyQuestionsGoal = goals.dailyQuestions * 7;
  const weeklyQuestionsPercent = weeklyQuestionsGoal > 0 ? Math.min(100, Math.round((weeklyTotals.questoes / weeklyQuestionsGoal) * 100)) : 0;
  const weeklyPagesGoal = goals.dailyPages * 7;
  const weeklyPagesPercent = weeklyPagesGoal > 0 ? Math.min(100, Math.round((weeklyTotals.paginas / weeklyPagesGoal) * 100)) : 0;

  // Completion notifications
  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const checks = [
      { key: 'hours', pct: weeklyHoursPercent, label: 'Horas semanais' },
      { key: 'questions', pct: weeklyQuestionsPercent, label: 'Questões semanais' },
      { key: 'pages', pct: weeklyPagesPercent, label: 'Páginas semanais' },
    ];
    checks.forEach(({ key, pct, label }) => {
      if (pct >= 100 && !notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        toast.success(`🎉 Meta concluída: ${label}!`, { description: 'Parabéns pelo seu esforço!' });
      }
    });
  }, [weeklyHoursPercent, weeklyQuestionsPercent, weeklyPagesPercent]);

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;
  const globalPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const pendingRevisions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return revisions
      .filter((r) => !r.completed)
      .map((r) => {
        const disc = disciplines.find((d) => d.id === r.disciplineId);
        const isOverdue = r.dueDate < today;
        const isToday = r.dueDate === today;
        return { ...r, disciplineName: disc?.name || 'Desconhecida', isOverdue, isToday };
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [revisions, disciplines]);

  const overdueCount = pendingRevisions.filter((r) => r.isOverdue).length;
  const todayRevisions = pendingRevisions.filter((r) => r.isToday).length;
  const upcomingRevisions = pendingRevisions.filter((r) => !r.isOverdue && !r.isToday).slice(0, 5);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    color: 'hsl(var(--foreground))',
    fontSize: 12,
    boxShadow: '0 8px 30px -7px hsl(var(--foreground) / 0.1)',
  };

  const statCards = [
    {
      label: 'Tempo de Foco',
      numericValue: todaySeconds,
      formatFn: (v: number) => formatTime(v),
      icon: Timer,
      gradient: 'from-electric-blue/15 to-electric-blue/5',
      iconBg: 'gradient-blue',
      iconColor: 'text-electric-blue-foreground',
      glowClass: 'hover:glow-blue',
    },
    {
      label: 'Questões Hoje',
      numericValue: todayQuestions,
      formatFn: (v: number) => v.toString(),
      icon: Crosshair,
      gradient: 'from-sporty-orange/15 to-sporty-orange/5',
      iconBg: 'gradient-orange',
      iconColor: 'text-sporty-orange-foreground',
      glowClass: 'hover:glow-orange',
    },
    {
      label: 'Progresso do Alvo',
      numericValue: globalPercent,
      formatFn: (v: number) => `${v}%`,
      subtitle: `${completedTopics}/${totalTopics} tópicos`,
      icon: CheckCircle2,
      gradient: 'from-neon-green/15 to-neon-green/5',
      iconBg: 'gradient-neon',
      iconColor: 'text-neon-green-foreground',
      glowClass: 'hover:glow-neon',
    },
    {
      label: 'Registros Totais',
      numericValue: studyRecords.length,
      formatFn: (v: number) => v.toString(),
      icon: Activity,
      gradient: 'from-chart-4/15 to-chart-5/5',
      iconBg: 'bg-chart-4',
      iconColor: 'text-primary-foreground',
      glowClass: '',
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">

      {/* Stat Cards - Tactile glassmorphism with count-up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Sprints do Dia & Sprints da Semana */}
      {(goals.weeklyHours > 0 || goals.dailyQuestions > 0 || goals.dailyPages > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Sprints */}
          <Card className="glass border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-neon">
                  <Target className="h-3.5 w-3.5 text-neon-green-foreground" />
                </div>
                Sprints do Dia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.weeklyHours > 0 && (() => {
                const dailyGoalSeconds = (goals.weeklyHours / 7) * 3600;
                const hoursPercent = dailyGoalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / dailyGoalSeconds) * 100)) : 0;
                const goalH = Math.floor(dailyGoalSeconds / 3600);
                const goalM = Math.round((dailyGoalSeconds % 3600) / 60);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-electric-blue" />
                        Horas
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatTime(todaySeconds)} / {goalH}h{goalM > 0 ? ` ${goalM}m` : ''}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-blue transition-all duration-500"
                        style={{ width: `${hoursPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {goals.dailyQuestions > 0 && (() => {
                const questPercent = Math.min(100, Math.round((todayQuestions / goals.dailyQuestions) * 100));
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-2">
                        <Crosshair className="h-3.5 w-3.5 text-sporty-orange" />
                        Questões
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {todayQuestions} / {goals.dailyQuestions}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-orange transition-all duration-500"
                        style={{ width: `${questPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {goals.dailyPages > 0 && (() => {
                const pagesPercent = Math.min(100, Math.round((todayPages / goals.dailyPages) * 100));
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-neon-green" />
                        Páginas
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {todayPages} / {goals.dailyPages}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-neon transition-all duration-500"
                        style={{ width: `${pagesPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Weekly Sprints */}
          <Card className="glass border-border/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sporty-orange/10">
                    <Trophy className="h-3.5 w-3.5 text-sporty-orange" />
                  </div>
                  Sprints da Semana
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  {weeklyHoursPercent >= 100 && <Badge className="text-[9px] rounded-full px-2 bg-neon-green/10 text-neon-green border-neon-green/20">✓</Badge>}
                  {weeklyQuestionsPercent >= 100 && <Badge className="text-[9px] rounded-full px-2 bg-neon-green/10 text-neon-green border-neon-green/20">✓</Badge>}
                  {weeklyPagesPercent >= 100 && <Badge className="text-[9px] rounded-full px-2 bg-neon-green/10 text-neon-green border-neon-green/20">✓</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {goals.weeklyHours > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-electric-blue" />
                      Horas
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {weeklyTotals.horas}h / {goals.weeklyHours}h
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-blue transition-all duration-500"
                      style={{ width: `${weeklyHoursPercent}%` }}
                    />
                  </div>
                </div>
              )}
              {goals.dailyQuestions > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-2">
                      <Crosshair className="h-3.5 w-3.5 text-sporty-orange" />
                      Questões
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {weeklyTotals.questoes} / {weeklyQuestionsGoal}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-orange transition-all duration-500"
                      style={{ width: `${weeklyQuestionsPercent}%` }}
                    />
                  </div>
                </div>
              )}
              {goals.dailyPages > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-neon-green" />
                      Páginas
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {weeklyTotals.paginas} / {weeklyPagesGoal}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-neon transition-all duration-500"
                      style={{ width: `${weeklyPagesPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Performance Line Chart */}
      <motion.div variants={itemVariants}>
        <Card className="glass border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-neon">
                <Activity className="h-3.5 w-3.5 text-neon-green-foreground" />
              </div>
              Performance Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyPerformanceData} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
                <Line
                  type="monotone"
                  dataKey="horas"
                  stroke="hsl(var(--neon-green))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'hsl(var(--neon-green))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--neon-green))', stroke: 'hsl(var(--neon-green))', strokeWidth: 2 }}
                  filter="url(#glow)"
                />
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revision Notifications */}
      {pendingRevisions.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className={`glass border-border/30 ${overdueCount > 0 ? 'border-destructive/30' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-electric-blue/10">
                    <Bell className="h-3.5 w-3.5 text-electric-blue" />
                  </div>
                  Lembretes de Revisão
                </CardTitle>
                <div className="flex items-center gap-2">
                  {overdueCount > 0 && (
                    <Badge variant="destructive" className="text-xs rounded-full px-2.5">
                      {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                  {todayRevisions > 0 && (
                    <Badge className="text-xs rounded-full px-2.5 bg-neon-green text-neon-green-foreground">
                      {todayRevisions} para hoje
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingRevisions.filter((r) => r.isOverdue).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.disciplineName}</p>
                      <p className="text-xs text-muted-foreground">
                        Revisão {r.mark} · Vencida em {new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs rounded-lg border-neon-green/30 text-neon-green hover:bg-neon-green/10" onClick={() => completeRevision(r.id)}>
                    Concluir
                  </Button>
                </div>
              ))}

              {pendingRevisions.filter((r) => r.isToday).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-neon-green/20 bg-neon-green/5 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-neon-green" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.disciplineName}</p>
                      <p className="text-xs text-muted-foreground">Revisão {r.mark} · Hoje</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs rounded-lg border-neon-green/30 text-neon-green hover:bg-neon-green/10" onClick={() => completeRevision(r.id)}>
                    Concluir
                  </Button>
                </div>
              ))}

              {upcomingRevisions.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.disciplineName}</p>
                      <p className="text-xs text-muted-foreground">
                        Revisão {r.mark} · {new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 ml-2 text-xs" onClick={() => completeRevision(r.id)}>
                    Concluir
                  </Button>
                </div>
              ))}

              {pendingRevisions.length > (overdueCount + todayRevisions + upcomingRevisions.length) && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{pendingRevisions.length - overdueCount - todayRevisions - upcomingRevisions.length} revisões futuras
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts Row */}
      {(disciplineProgress.length > 0 || studyHoursData.length > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {disciplineProgress.length > 0 && (
            <Card className="glass border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-electric-blue/10">
                    <BarChart3 className="h-3.5 w-3.5 text-electric-blue" />
                  </div>
                  Progresso por Disciplina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, disciplineProgress.length * 36)}>
                  <BarChart data={disciplineProgress} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Progresso']} />
                    <Bar dataKey="percent" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {disciplineProgress.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {pieData.length > 0 && (
              <Card className="glass border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neon-green/10">
                      <Target className="h-3.5 w-3.5 text-neon-green" />
                    </div>
                    Progresso Geral
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        <Cell fill="hsl(var(--neon-green))" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Legend
                        formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 12 }}>{value}</span>}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {studyHoursData.length > 0 && (
              <Card className="glass border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sporty-orange/10">
                      <Clock className="h-3.5 w-3.5 text-sporty-orange" />
                    </div>
                    Horas de Estudo (30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={studyHoursData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
                      <Bar dataKey="horas" fill="hsl(var(--electric-blue))" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}

      {/* Discipline Progress List */}
      {disciplineProgress.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="glass border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-chart-5/10">
                  <BookOpen className="h-3.5 w-3.5 text-chart-5" />
                </div>
                Detalhamento por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {disciplineProgress.map((d, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground font-medium truncate max-w-[60%]">{d.fullName}</span>
                    <span className="text-muted-foreground text-xs font-mono">{d.completed}/{d.total} ({d.percent}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${d.percent}%`,
                        background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {studyRecords.length === 0 && topics.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="glass border-dashed border-border/30">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-neon shadow-neon mb-6">
                <Sparkles className="h-8 w-8 text-neon-green-foreground" />
              </div>
              <h3 className="text-xl font-extrabold text-foreground mb-2">Pronto para o Sprint?</h3>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Importe seu edital e registre seu primeiro estudo.
                Suas métricas de performance vão aparecer aqui.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
