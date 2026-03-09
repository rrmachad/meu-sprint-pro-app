import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Target, TrendingUp, CheckCircle2, BarChart3, FileText, Flame, Bell, AlertTriangle, CalendarCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

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

const statCardStyles = [
  { gradient: 'from-primary/10 to-primary/5', iconBg: 'gradient-primary', iconColor: 'text-primary-foreground' },
  { gradient: 'from-accent/10 to-accent/5', iconBg: 'gradient-accent', iconColor: 'text-accent-foreground' },
  { gradient: 'from-success/10 to-success/5', iconBg: 'gradient-success', iconColor: 'text-success-foreground' },
  { gradient: 'from-chart-4/10 to-chart-5/5', iconBg: 'bg-chart-4', iconColor: 'text-primary-foreground' },
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const statCards = [
    { label: 'Tempo Hoje', value: formatTime(todaySeconds), icon: Clock, style: statCardStyles[0] },
    { label: 'Questões Hoje', value: todayQuestions.toString(), icon: Target, style: statCardStyles[1] },
    { label: 'Edital', value: `${globalPercent}%`, subtitle: `${completedTopics}/${totalTopics} tópicos`, icon: CheckCircle2, style: statCardStyles[2] },
    { label: 'Registros Totais', value: studyRecords.length.toString(), icon: TrendingUp, style: statCardStyles[3] },
  ];

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            {greeting()}, <span className="text-primary">{candidateName || 'Estudante'}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {streak > 0 && (
          <div className="hidden sm:flex items-center gap-2 rounded-xl gradient-accent px-4 py-2.5 shadow-lg">
            <Flame className="h-5 w-5 text-accent-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-accent-foreground">{streak} {streak === 1 ? 'dia' : 'dias'}</span>
              <span className="text-[10px] text-accent-foreground/70">seguidos 🔥</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} variants={itemVariants}>
            <Card className={`card-hover border-border/50 bg-gradient-to-br ${stat.style.gradient}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.style.iconBg} shadow-soft`}>
                    <stat.icon className={`h-5 w-5 ${stat.style.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Daily Goals */}
      {(goals.weeklyHours > 0 || goals.dailyQuestions > 0 || goals.dailyPages > 0) && (
        <motion.div variants={itemVariants}>
          <Card className="card-hover border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
                    <Target className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  Metas Diárias
                </CardTitle>
                {streak > 0 && (
                  <div className="sm:hidden flex items-center gap-1.5 text-xs font-bold text-accent">
                    <Flame className="h-4 w-4" />
                    {streak} dia{streak > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {goals.weeklyHours > 0 && (() => {
                  const dailyGoalSeconds = (goals.weeklyHours / 7) * 3600;
                  const hoursPercent = dailyGoalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / dailyGoalSeconds) * 100)) : 0;
                  const goalH = Math.floor(dailyGoalSeconds / 3600);
                  const goalM = Math.round((dailyGoalSeconds % 3600) / 60);
                  return (
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm font-semibold">
                          <Clock className="h-4 w-4 text-primary" />
                          Horas
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${hoursPercent >= 100 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {hoursPercent >= 100 ? '✓ Concluído' : `${hoursPercent}%`}
                        </span>
                      </div>
                      <Progress value={hoursPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {formatTime(todaySeconds)} / {goalH}h{goalM > 0 ? ` ${goalM}m` : ''}
                      </p>
                    </div>
                  );
                })()}

                {goals.dailyQuestions > 0 && (() => {
                  const questPercent = Math.min(100, Math.round((todayQuestions / goals.dailyQuestions) * 100));
                  return (
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                          Questões
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${questPercent >= 100 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {questPercent >= 100 ? '✓ Concluído' : `${questPercent}%`}
                        </span>
                      </div>
                      <Progress value={questPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {todayQuestions} / {goals.dailyQuestions} questões
                      </p>
                    </div>
                  );
                })()}

                {goals.dailyPages > 0 && (() => {
                  const pagesPercent = Math.min(100, Math.round((todayPages / goals.dailyPages) * 100));
                  return (
                    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-sm font-semibold">
                          <FileText className="h-4 w-4 text-chart-4" />
                          Páginas
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pagesPercent >= 100 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {pagesPercent >= 100 ? '✓ Concluído' : `${pagesPercent}%`}
                        </span>
                      </div>
                      <Progress value={pagesPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {todayPages} / {goals.dailyPages} páginas
                      </p>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Revision Notifications */}
      {pendingRevisions.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className={`card-hover border-border/50 ${overdueCount > 0 ? 'border-destructive/30' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-3.5 w-3.5 text-primary" />
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
                    <Badge className="text-xs rounded-full px-2.5 bg-primary text-primary-foreground">
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
                  <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs rounded-lg" onClick={() => completeRevision(r.id)}>
                    Concluir
                  </Button>
                </div>
              ))}

              {pendingRevisions.filter((r) => r.isToday).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.disciplineName}</p>
                      <p className="text-xs text-muted-foreground">Revisão {r.mark} · Hoje</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 ml-2 text-xs rounded-lg" onClick={() => completeRevision(r.id)}>
                    Concluir
                  </Button>
                </div>
              ))}

              {upcomingRevisions.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3">
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
            <Card className="card-hover border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-chart-1/10">
                    <BarChart3 className="h-3.5 w-3.5 text-chart-1" />
                  </div>
                  Progresso por Disciplina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, disciplineProgress.length * 36)}>
                  <BarChart data={disciplineProgress} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        color: 'hsl(var(--foreground))',
                        fontSize: 12,
                        boxShadow: '0 8px 30px -7px hsl(var(--foreground) / 0.1)',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Progresso']}
                    />
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
              <Card className="card-hover border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10">
                      <Target className="h-3.5 w-3.5 text-success" />
                    </div>
                    Progresso Geral do Edital
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
                        <Cell fill="hsl(var(--success))" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Legend
                        formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 12 }}>{value}</span>}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          color: 'hsl(var(--foreground))',
                          fontSize: 12,
                          boxShadow: '0 8px 30px -7px hsl(var(--foreground) / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {studyHoursData.length > 0 && (
              <Card className="card-hover border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-chart-2/10">
                      <Clock className="h-3.5 w-3.5 text-chart-2" />
                    </div>
                    Horas de Estudo (últimos 30 dias)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={studyHoursData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          color: 'hsl(var(--foreground))',
                          fontSize: 12,
                          boxShadow: '0 8px 30px -7px hsl(var(--foreground) / 0.1)',
                        }}
                        formatter={(value: number) => [`${value}h`, 'Horas']}
                      />
                      <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={30} />
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
          <Card className="card-hover border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
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
                    <span className="text-muted-foreground text-xs font-medium">{d.completed}/{d.total} ({d.percent}%)</span>
                  </div>
                  <Progress value={d.percent} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {studyRecords.length === 0 && topics.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-glow mb-6">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Comece sua jornada!</h3>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Importe seu edital e registre seu primeiro estudo.
                Seu progresso vai aparecer aqui com gráficos e métricas detalhadas.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
