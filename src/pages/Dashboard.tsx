import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Target, TrendingUp, CheckCircle2, BarChart3, FileText, Flame, Bell, AlertTriangle, CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 67% 55%)',
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

  // Progress per discipline
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

  // Study hours per discipline (last 30 days)
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

  // Pie chart data for overall progress
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

  // Pending revisions
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

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Inicial</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Hoje</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(todaySeconds)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Questões Hoje</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Edital</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalPercent}%</div>
            <p className="text-xs text-muted-foreground">{completedTopics}/{totalTopics} tópicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyRecords.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Goals */}
      {(goals.weeklyHours > 0 || goals.dailyQuestions > 0 || goals.dailyPages > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Metas Diárias
              </CardTitle>
              {streak > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-orange-500">
                  <Flame className="h-4 w-4" />
                  {streak} dia{streak > 1 ? 's' : ''} seguidos
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hours goal */}
              {goals.weeklyHours > 0 && (() => {
                const dailyGoalSeconds = (goals.weeklyHours / 7) * 3600;
                const hoursPercent = dailyGoalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / dailyGoalSeconds) * 100)) : 0;
                const goalH = Math.floor(dailyGoalSeconds / 3600);
                const goalM = Math.round((dailyGoalSeconds % 3600) / 60);
                return (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-primary" />
                        Horas
                      </div>
                      <span className={`text-xs font-semibold ${hoursPercent >= 100 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {hoursPercent >= 100 ? '✓ Concluído' : `${hoursPercent}%`}
                      </span>
                    </div>
                    <Progress value={hoursPercent} className="h-2.5" />
                    <p className="text-xs text-muted-foreground">
                      {formatTime(todaySeconds)} / {goalH}h{goalM > 0 ? ` ${goalM}m` : ''}
                    </p>
                  </div>
                );
              })()}

              {/* Questions goal */}
              {goals.dailyQuestions > 0 && (() => {
                const questPercent = Math.min(100, Math.round((todayQuestions / goals.dailyQuestions) * 100));
                return (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Questões
                      </div>
                      <span className={`text-xs font-semibold ${questPercent >= 100 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {questPercent >= 100 ? '✓ Concluído' : `${questPercent}%`}
                      </span>
                    </div>
                    <Progress value={questPercent} className="h-2.5" />
                    <p className="text-xs text-muted-foreground">
                      {todayQuestions} / {goals.dailyQuestions} questões
                    </p>
                  </div>
                );
              })()}

              {/* Pages goal */}
              {goals.dailyPages > 0 && (() => {
                const pagesPercent = Math.min(100, Math.round((todayPages / goals.dailyPages) * 100));
                return (
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-primary" />
                        Páginas
                      </div>
                      <span className={`text-xs font-semibold ${pagesPercent >= 100 ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {pagesPercent >= 100 ? '✓ Concluído' : `${pagesPercent}%`}
                      </span>
                    </div>
                    <Progress value={pagesPercent} className="h-2.5" />
                    <p className="text-xs text-muted-foreground">
                      {todayPages} / {goals.dailyPages} páginas
                    </p>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      {(disciplineProgress.length > 0 || studyHoursData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Progress Bar Chart */}
          {disciplineProgress.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
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
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) => [`${value}%`, 'Progresso']}
                    />
                    <Bar dataKey="percent" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {disciplineProgress.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Pie Chart or Study Hours */}
          <div className="space-y-4">
            {pieData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
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
                        <Cell fill="hsl(142 71% 45%)" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Legend
                        formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 12 }}>{value}</span>}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {studyHoursData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
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
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${value}h`, 'Horas']}
                      />
                      <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Discipline Progress List */}
      {disciplineProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Detalhamento por Disciplina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {disciplineProgress.map((d, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium truncate max-w-[60%]">{d.fullName}</span>
                  <span className="text-muted-foreground text-xs">{d.completed}/{d.total} ({d.percent}%)</span>
                </div>
                <Progress value={d.percent} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {studyRecords.length === 0 && topics.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum estudo registrado ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Comece importando seu edital e registrando seu primeiro estudo.
              Seu progresso aparecerá aqui!
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
