import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { BookOpen, Clock, Flame, Bell, AlertTriangle, CalendarCheck, Sparkles, Timer, Crown, TrendingUp } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { SetupBanner } from '@/components/SetupBanner';
import { playSuccessChime } from '@/lib/sounds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
} as const;

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

export default function Dashboard() {
  const studyRecords = useAppStore((s) => s.studyRecords);
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const goals = useAppStore((s) => s.settings.goals);
  const streak = useAppStore((s) => s.streak);
  const revisions = useAppStore((s) => s.revisions);
  const completeRevision = useAppStore((s) => s.completeRevision);
  const cycles = useAppStore((s) => s.cycles);
  const updateCycle = useAppStore((s) => s.updateCycle);
  const { isFree } = useSubscriptionLimits();
  const navigate = useNavigate();

  const activeCycle = cycles.find((c) => c.active);
  const nextBlockIndex = activeCycle?.currentBlockIndex || 0;
  const nextBlock = activeCycle?.blocks[nextBlockIndex];
  const nextBlockDisc = nextBlock ? disciplines.find((d) => d.id === nextBlock.disciplineId) : null;

  // Block timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timerTotal = nextBlock ? nextBlock.durationMinutes * 60 : 0;
  const timerRemaining = Math.max(0, timerTotal - timerElapsed);
  const timerPercent = timerTotal > 0 ? Math.min(100, Math.round((timerElapsed / timerTotal) * 100)) : 0;

  const startTimer = useCallback(() => { setTimerRunning(true); }, []);
  const pauseTimer = useCallback(() => { setTimerRunning(false); }, []);
  const resetTimer = useCallback(() => { setTimerRunning(false); setTimerElapsed(0); }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerElapsed((prev) => {
          const next = prev + 1;
          if (next >= timerTotal) {
            setTimerRunning(false);
            playSuccessChime();
            toast.success('⏰ Tempo do bloco finalizado!', { description: 'Você pode concluir e avançar para o próximo bloco.' });
            return timerTotal;
          }
          return next;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerTotal]);

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

  const BLOCK_LOG_KEY = 'msp_block_completions';

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
  const todayRecords = studyRecords.filter((r) => r.date === today);
  const todaySeconds = todayRecords.reduce((a, r) => a + r.durationSeconds, 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

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

  const statCards = [
    {
      label: 'Foco Hoje',
      numericValue: todaySeconds,
      formatFn: (v: number) => formatTime(v),
      subtitle: todayBlocks > 0
        ? `${todayBlocks} bloco${todayBlocks !== 1 ? 's' : ''} concluído${todayBlocks !== 1 ? 's' : ''}`
        : 'Nenhum bloco ainda',
      icon: Timer,
      gradient: 'from-electric-blue/15 to-electric-blue/5',
      iconBg: 'gradient-blue',
      iconColor: 'text-electric-blue-foreground',
      glowClass: 'hover:glow-blue',
    },
    {
      label: 'Sequência',
      numericValue: streak,
      formatFn: (v: number) => v.toString(),
      subtitle: streak === 1 ? 'dia seguido' : 'dias seguidos',
      icon: Flame,
      gradient: 'from-sporty-orange/15 to-sporty-orange/5',
      iconBg: 'gradient-orange',
      iconColor: 'text-sporty-orange-foreground',
      glowClass: 'hover:glow-orange',
    },
    {
      label: 'Meta Semanal',
      numericValue: weeklyHoursPercent,
      formatFn: (v: number) => `${v}%`,
      subtitle: goals.weeklyHours > 0
        ? `${weeklyTotals.horas.toFixed(1)}h de ${goals.weeklyHours}h`
        : 'Meta não configurada',
      icon: TrendingUp,
      gradient: 'from-neon-green/15 to-neon-green/5',
      iconBg: 'gradient-neon',
      iconColor: 'text-neon-green-foreground',
      glowClass: 'hover:glow-neon',
    },
  ];

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

      {/* Hero: Próximo Bloco + Timer */}
      {activeCycle && nextBlock && nextBlockDisc && (
        <motion.div variants={itemVariants}>
          <Card className={`bg-slate-800/60 backdrop-blur-md border transition-all duration-500 ${timerRunning ? 'border-primary/60 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]' : 'border-slate-700/50'} bg-gradient-to-r from-primary/10 via-primary/5 to-transparent`}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
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

                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${timerRemaining === 0 && timerElapsed > 0 ? 'bg-emerald-500' : 'bg-primary'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${timerPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!timerRunning && timerElapsed === 0 && (
                        <Button onClick={startTimer} className="gap-2 rounded-xl font-bold">
                          <Timer className="h-4 w-4" />
                          Começar a Estudar
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

      {/* 3 Stats do dia */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      {/* Lembretes de Revisão */}
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

      {/* Link para Indicadores */}
      <motion.div variants={itemVariants} className="flex justify-center pb-2">
        <Button
          variant="ghost"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/indicadores')}
        >
          Ver meus indicadores completos →
        </Button>
      </motion.div>

    </motion.div>
  );
}
