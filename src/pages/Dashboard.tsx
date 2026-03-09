import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Target, TrendingUp, CheckCircle2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = studyRecords.filter((r) => r.date === today);
  const todaySeconds = todayRecords.reduce((a, r) => a + r.durationSeconds, 0);
  const todayQuestions = todayRecords.reduce((a, r) => a + r.correctAnswers + r.wrongAnswers + r.blankAnswers, 0);

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
