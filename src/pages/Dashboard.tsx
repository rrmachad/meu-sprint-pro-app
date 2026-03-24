import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Clock, Target, TrendingUp, CheckCircle2, BarChart3, FileText, Flame, Bell, AlertTriangle, CalendarCheck, Sparkles, Trophy, Timer, Crosshair, Activity, Crown, Zap } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { SetupBanner } from '@/components/SetupBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line, Label,
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

interface StatCardProps {
  stat: {
    label: string;
    numericValue: number;
    formatFn: (v: number) => string;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    iconBg: string;
    iconColor: string;
    glowClass: string;
  };
}

function StatCard({ stat }: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const animatedValue = useCountUp(isInView ? stat.numericValue : 0, 1400);

  return (
    <motion.div ref={ref} variants={itemVariants}>
      <Card className={`bg-slate-800/60 backdrop-blur-md border border-slate-700/50 bg-gradient-to-br ${stat.gradient} transition-all duration-300 hover:border-slate-600/60`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <motion.p
                className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground tabular-nums"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {stat.formatFn(animatedValue)}
              </motion.p>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              )}
            </div>
            <motion.div
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} shadow-soft`}
              initial={{ rotate: -20, scale: 0 }}
              animate={isInView ? { rotate: 0, scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
            >
              <div className={`absolute inset-0 rounded-xl ${stat.iconBg} blur-md opacity-40`} />
              <stat.icon className={`h-5 w-5 ${stat.iconColor} relative z-10`} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AnimatedSprintRow({ icon: Icon, iconColor, label, current, goal, formatCurrent, formatGoal, barClass, percent }: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  current: number;
  goal: number;
  formatCurrent: (v: number) => string;
  formatGoal: string;
  barClass: string;
  percent: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const animatedCurrent = useCountUp(isInView ? current : 0, 1200);
  const animatedPercent = useCountUp(isInView ? percent : 0, 1400);

  return (
    <div ref={ref} className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          {label}
        </span>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {formatCurrent(animatedCurrent)} / {formatGoal}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${percent}%` } : { width: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function getMasteryLabel(percent: number): { label: string; color: string; bgColor: string } {
  if (percent >= 70) return { label: 'Avançada', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15 border-emerald-500/25' };
  if (percent >= 30) return { label: 'Intermediária', color: 'text-amber-400', bgColor: 'bg-amber-500/15 border-amber-500/25' };
  return { label: 'Fase Básica', color: 'text-blue-400', bgColor: 'bg-blue-500/15 border-blue-500/25' };
}

function getDisciplineBadge(percent: number): { label: string; className: string } {
  if (percent >= 70) return { label: 'Avançada', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' };
  if (percent >= 30) return { label: 'Intermediária', className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' };
  return { label: 'Básica', className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' };
}

// Custom donut label renderer
function MasteryDonutLabel({ viewBox, globalPercent }: { viewBox?: any; globalPercent: number }) {
  const { cx, cy } = viewBox || {};
  const mastery = getMasteryLabel(globalPercent);
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: 32, fontWeight: 800 }}>
        {globalPercent}%
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle" className={mastery.color} style={{ fontSize: 11, fontWeight: 600 }}>
        {mastery.label}
      </text>
    </g>
  );
}

export default function Dashboard() {
  const studyRecords = useAppStore((s) => s.studyRecords);
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const goals = useAppStore((s) => s.settings.goals);
  const streak = useAppStore((s) => s.streak);
  const revisions = useAppStore((s) => s.revisions);
  const completeRevision = useAppStore((s) => s.completeRevision);
  const candidateName = useAppStore((s) => s.settings.contest.candidateName);
  const cycles = useAppStore((s) => s.cycles);
  const updateCycle = useAppStore((s) => s.updateCycle);
  const { isFree } = useSubscriptionLimits();
  const navigate = useNavigate();
  const { session } = useAuth();

  const activeCycle = cycles.find((c) => c.active);
  const nextBlockIndex = activeCycle?.currentBlockIndex || 0;
  const nextBlock = activeCycle?.blocks[nextBlockIndex];
  const nextBlockDisc = nextBlock ? disciplines.find((d) => d.id === nextBlock.disciplineId) : null;

  // Block timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0); // seconds elapsed
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timerTotal = nextBlock ? nextBlock.durationMinutes * 60 : 0;
  const timerRemaining = Math.max(0, timerTotal - timerElapsed);
  const timerPercent = timerTotal > 0 ? Math.min(100, Math.round((timerElapsed / timerTotal) * 100)) : 0;

  const startTimer = useCallback(() => {
    setTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerElapsed(0);
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerElapsed((prev) => {
          const next = prev + 1;
          if (next >= timerTotal) {
            setTimerRunning(false);
            toast.success('⏰ Tempo do bloco finalizado!', { description: 'Você pode concluir e avançar para o próximo bloco.' });
            return timerTotal;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerTotal]);

  // Reset timer when block changes
  useEffect(() => {
    setTimerElapsed(0);
    setTimerRunning(false);
  }, [nextBlockIndex, activeCycle?.id]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Block completion tracking (localStorage-based)
  const BLOCK_LOG_KEY = 'msp_block_completions';
  const getBlockLog = useCallback((): Record<string, number> => {
    try {
      return JSON.parse(localStorage.getItem(BLOCK_LOG_KEY) || '{}');
    } catch { return {}; }
  }, []);

  const [blockLog, setBlockLog] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(BLOCK_LOG_KEY) || '{}'); } catch { return {}; }
  });

  const logBlockCompletion = useCallback(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setBlockLog((prev) => {
      const updated = { ...prev, [todayStr]: (prev[todayStr] || 0) + 1 };
      localStorage.setItem(BLOCK_LOG_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayBlocks = blockLog[today] || 0;

  const weeklyBlocksData = useMemo(() => {
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
      return { name: label, blocos: blockLog[dateStr] || 0 };
    });
  }, [blockLog]);

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
          name: d.name.length > 25 ? d.name.substring(0, 25) + '…' : d.name,
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

  const weeklyGoalsData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

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
    {
      label: 'Blocos Hoje',
      numericValue: todayBlocks,
      formatFn: (v: number) => v.toString(),
      subtitle: activeCycle ? `de ${activeCycle.blocks.length} no ciclo` : undefined,
      icon: Zap,
      gradient: 'from-chart-3/15 to-chart-3/5',
      iconBg: 'bg-chart-3',
      iconColor: 'text-primary-foreground',
      glowClass: '',
    },
  ];

  const mastery = getMasteryLabel(globalPercent);

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">

      <SetupBanner />

      {isFree && (
        <motion.div variants={itemVariants}>
          <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Você está no plano gratuito</p>
                  <p className="text-xs text-muted-foreground">Limite de 3 disciplinas e revisão apenas 24h. Faça upgrade para desbloquear tudo.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate('/assinatura')} className="shrink-0">
                Ver Planos
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Next Block Card with Timer */}
      {activeCycle && nextBlock && nextBlockDisc && (
        <motion.div variants={itemVariants}>
          <Card className={`bg-slate-800/60 backdrop-blur-md border transition-all duration-500 ${timerRunning ? 'border-primary/60 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]' : 'border-slate-700/50'} bg-gradient-to-r from-primary/10 via-primary/5 to-transparent`}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                {/* Top: Block info + Timer display */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`relative flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${timerRunning ? 'gradient-blue shadow-[0_0_20px_-3px_hsl(var(--primary)/0.5)]' : 'gradient-neon shadow-neon'}`}>
                      <div className={`absolute inset-0 rounded-xl blur-md opacity-40 ${timerRunning ? 'gradient-blue' : 'gradient-neon'}`} />
                      {timerRunning ? (
                        <Timer className="h-6 w-6 text-primary-foreground relative z-10 animate-pulse" />
                      ) : (
                        <BookOpen className="h-6 w-6 text-neon-green-foreground relative z-10" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        {timerRunning ? 'Estudando Agora' : 'Próximo Bloco'}
                      </p>
                      <p className="text-lg font-bold text-foreground">{nextBlockDisc.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground font-mono">
                          Bloco {nextBlockIndex + 1} de {activeCycle.blocks.length}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {nextBlock.durationMinutes}min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timer display */}
                  <div className="flex flex-col items-center gap-1 sm:items-end">
                    <motion.span
                      className={`text-3xl font-mono font-extrabold tabular-nums tracking-tight ${timerRemaining === 0 && timerElapsed > 0 ? 'text-emerald-400' : timerRunning ? 'text-primary' : 'text-foreground'}`}
                      key={timerRemaining}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      {formatTimer(timerRemaining)}
                    </motion.span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                      {timerRemaining === 0 && timerElapsed > 0 ? 'Tempo esgotado' : 'Tempo restante'}
                    </span>
                  </div>
                </div>

                {/* Timer progress bar */}
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${timerRemaining === 0 && timerElapsed > 0 ? 'bg-emerald-500' : 'bg-primary'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${timerPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!timerRunning && timerElapsed === 0 && (
                        <Button onClick={startTimer} className="gap-2 rounded-xl font-bold">
                          <Timer className="h-4 w-4" />
                          Iniciar Bloco
                        </Button>
                      )}
                      {timerRunning && (
                        <Button onClick={pauseTimer} variant="outline" className="gap-2 rounded-xl font-bold">
                          <Clock className="h-4 w-4" />
                          Pausar
                        </Button>
                      )}
                      {!timerRunning && timerElapsed > 0 && timerRemaining > 0 && (
                        <Button onClick={startTimer} className="gap-2 rounded-xl font-bold">
                          <Timer className="h-4 w-4" />
                          Retomar
                        </Button>
                      )}
                      {timerElapsed > 0 && (
                        <Button onClick={resetTimer} variant="ghost" size="sm" className="text-xs text-muted-foreground">
                          Reiniciar Timer
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        className="gap-2 rounded-xl font-bold flex-1 sm:flex-none"
                        variant={timerRemaining === 0 && timerElapsed > 0 ? 'default' : 'secondary'}
                        onClick={() => {
                          logBlockCompletion();
                          resetTimer();
                          const newIdx = nextBlockIndex + 1;
                          if (newIdx >= activeCycle.blocks.length) {
                            updateCycle(activeCycle.id, { currentBlockIndex: 0 });
                            toast.success('🎉 Ciclo completo! Recomeçando do início.');
                          } else {
                            updateCycle(activeCycle.id, { currentBlockIndex: newIdx });
                            toast.success(`Bloco ${nextBlockIndex + 1} concluído! Próximo: ${disciplines.find(d => d.id === activeCycle.blocks[newIdx]?.disciplineId)?.name || ''}`);
                          }
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        Concluir e Avançar
                      </Button>
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary shrink-0">
                        {Math.round((nextBlockIndex / activeCycle.blocks.length) * 100)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}


      {(goals.weeklyHours > 0 || goals.dailyQuestions > 0 || goals.dailyPages > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Sprints */}
          <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <div className="relative flex h-7 w-7 items-center justify-center rounded-lg gradient-neon">
                  <div className="absolute inset-0 rounded-lg gradient-neon blur-md opacity-40" />
                  <Target className="h-3.5 w-3.5 text-neon-green-foreground relative z-10" />
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
                  <AnimatedSprintRow
                    icon={Clock} iconColor="text-electric-blue" label="Horas"
                    current={todaySeconds} goal={dailyGoalSeconds}
                    formatCurrent={(v) => formatTime(v)}
                    formatGoal={`${goalH}h${goalM > 0 ? ` ${goalM}m` : ''}`}
                    barClass="gradient-blue" percent={hoursPercent}
                  />
                );
              })()}
              {goals.dailyQuestions > 0 && (() => {
                const questPercent = Math.min(100, Math.round((todayQuestions / goals.dailyQuestions) * 100));
                return (
                  <AnimatedSprintRow
                    icon={Crosshair} iconColor="text-sporty-orange" label="Questões"
                    current={todayQuestions} goal={goals.dailyQuestions}
                    formatCurrent={(v) => v.toString()}
                    formatGoal={goals.dailyQuestions.toString()}
                    barClass="gradient-orange" percent={questPercent}
                  />
                );
              })()}
              {goals.dailyPages > 0 && (() => {
                const pagesPercent = Math.min(100, Math.round((todayPages / goals.dailyPages) * 100));
                return (
                  <AnimatedSprintRow
                    icon={FileText} iconColor="text-neon-green" label="Páginas"
                    current={todayPages} goal={goals.dailyPages}
                    formatCurrent={(v) => v.toString()}
                    formatGoal={goals.dailyPages.toString()}
                    barClass="gradient-neon" percent={pagesPercent}
                  />
                );
              })()}
            </CardContent>
          </Card>

          {/* Weekly Sprints */}
          <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-sporty-orange/10">
                    <div className="absolute inset-0 rounded-lg bg-sporty-orange/10 blur-md opacity-40" />
                    <Trophy className="h-3.5 w-3.5 text-sporty-orange relative z-10" />
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
                <AnimatedSprintRow
                  icon={Clock} iconColor="text-electric-blue" label="Horas"
                  current={Math.round(weeklyTotals.horas * 10)} goal={goals.weeklyHours * 10}
                  formatCurrent={(v) => `${(v / 10).toFixed(1)}h`}
                  formatGoal={`${goals.weeklyHours}h`}
                  barClass="gradient-blue" percent={weeklyHoursPercent}
                />
              )}
              {goals.dailyQuestions > 0 && (
                <AnimatedSprintRow
                  icon={Crosshair} iconColor="text-sporty-orange" label="Questões"
                  current={weeklyTotals.questoes} goal={weeklyQuestionsGoal}
                  formatCurrent={(v) => v.toString()}
                  formatGoal={weeklyQuestionsGoal.toString()}
                  barClass="gradient-orange" percent={weeklyQuestionsPercent}
                />
              )}
              {goals.dailyPages > 0 && (
                <AnimatedSprintRow
                  icon={FileText} iconColor="text-neon-green" label="Páginas"
                  current={weeklyTotals.paginas} goal={weeklyPagesGoal}
                  formatCurrent={(v) => v.toString()}
                  formatGoal={weeklyPagesGoal.toString()}
                  barClass="gradient-neon" percent={weeklyPagesPercent}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts Grid: Performance + Blocks */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance Line Chart */}
        <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg gradient-neon">
                <div className="absolute inset-0 rounded-lg gradient-neon blur-md opacity-40" />
                <Activity className="h-3.5 w-3.5 text-neon-green-foreground relative z-10" />
              </div>
              Performance Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyPerformanceData} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}h`, 'Horas']} />
                <Line type="monotone" dataKey="horas" stroke="hsl(var(--neon-green))" strokeWidth={3}
                  dot={{ r: 4, fill: 'hsl(var(--neon-green))', stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--neon-green))', stroke: 'hsl(var(--neon-green))', strokeWidth: 2 }}
                  filter="url(#glow)"
                />
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Blocks Chart */}
        <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-chart-3/20">
                <div className="absolute inset-0 rounded-lg bg-chart-3/20 blur-md opacity-40" />
                <Zap className="h-3.5 w-3.5 text-chart-3 relative z-10" />
              </div>
              Blocos Concluídos na Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyBlocksData} margin={{ left: 0, right: 10, top: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}`, 'Blocos']} />
                <Bar dataKey="blocos" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Revision Notifications */}
      {pendingRevisions.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className={`bg-slate-800/60 backdrop-blur-md border border-slate-700/50 ${overdueCount > 0 ? 'border-destructive/30' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-electric-blue/10">
                    <div className="absolute inset-0 rounded-lg bg-electric-blue/10 blur-md opacity-40" />
                    <Bell className="h-3.5 w-3.5 text-electric-blue relative z-10" />
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

      {/* Charts Row: Horizontal Bar + Mastery Gauge + Study Hours */}
      {(disciplineProgress.length > 0 || studyHoursData.length > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Horizontal Bar Chart - Fixed layout */}
          {disciplineProgress.length > 0 && (
            <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-electric-blue/10">
                    <div className="absolute inset-0 rounded-lg bg-electric-blue/10 blur-md opacity-40" />
                    <BarChart3 className="h-3.5 w-3.5 text-electric-blue relative z-10" />
                  </div>
                  Progresso por Disciplina
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={Math.max(220, disciplineProgress.length * 38)}>
                  <BarChart data={disciplineProgress} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Progresso']} />
                    <Bar dataKey="percent" radius={[0, 8, 8, 0]} maxBarSize={22}>
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
            {/* Mastery Gauge (upgraded donut) */}
            {pieData.length > 0 && (
              <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-neon-green/10">
                      <div className="absolute inset-0 rounded-lg bg-neon-green/10 blur-md opacity-40" />
                      <Target className="h-3.5 w-3.5 text-neon-green relative z-10" />
                    </div>
                    Nível de Maturidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pb-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <defs>
                        <linearGradient id="masteryGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="hsl(199 89% 48%)" />
                          <stop offset="100%" stopColor="hsl(160 60% 50%)" />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={90}
                        dataKey="value"
                        strokeWidth={3}
                        stroke="hsl(var(--card))"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <Cell fill="url(#masteryGradient)" />
                        <Cell fill="hsl(var(--muted) / 0.4)" />
                        <Label content={<MasteryDonutLabel globalPercent={globalPercent} />} position="center" />
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 -mt-2">
                    <Badge variant="outline" className={`text-xs rounded-full px-3 py-1 border ${mastery.bgColor} ${mastery.color} font-semibold`}>
                      {mastery.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">{completedTopics}/{totalTopics} tópicos</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Study Hours Chart */}
            {studyHoursData.length > 0 && (
              <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-sporty-orange/10">
                      <div className="absolute inset-0 rounded-lg bg-sporty-orange/10 blur-md opacity-40" />
                      <Clock className="h-3.5 w-3.5 text-sporty-orange relative z-10" />
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

      {/* High-Performance Tracking Table */}
      {disciplineProgress.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-chart-5/10">
                  <div className="absolute inset-0 rounded-lg bg-chart-5/10 blur-md opacity-40" />
                  <BookOpen className="h-3.5 w-3.5 text-chart-5 relative z-10" />
                </div>
                Detalhamento por Disciplina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {disciplineProgress.map((d, i) => {
                const badge = getDisciplineBadge(d.percent);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/80 transition-colors p-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm text-foreground font-medium truncate">{d.fullName}</span>
                        <Badge variant="outline" className={`text-[9px] rounded-full px-2 py-0 border shrink-0 ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary/60 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${d.percent}%` }}
                          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
                          style={{
                            background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-[80px]">
                      <p className="text-sm font-bold tabular-nums text-foreground">{d.percent}%</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{d.completed}/{d.total}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {studyRecords.length === 0 && topics.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-slate-800/60 backdrop-blur-md border-dashed border border-slate-700/50">
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
