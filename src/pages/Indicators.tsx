import { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, CheckCircle2, BookOpen,
  Target, Brain, CalendarDays, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area,
} from 'recharts';
import { format, subDays, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = [
  'hsl(217, 91%, 60%)',  // primary
  'hsl(24, 95%, 53%)',   // accent
  'hsl(142, 71%, 45%)',  // success
  'hsl(280, 67%, 55%)',  // chart-4
  'hsl(199, 89%, 48%)',  // chart-5
  'hsl(38, 92%, 50%)',   // warning
  'hsl(350, 80%, 55%)',
  'hsl(170, 70%, 45%)',
];

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Indicators() {
  const disciplines = useAppStore((s) => s.disciplines);
  const studyRecords = useAppStore((s) => s.studyRecords);
  const topics = useAppStore((s) => s.topics);
  const simulados = useAppStore((s) => s.simulados);
  const goals = useAppStore((s) => s.settings.goals);

  const hasData = studyRecords.length > 0;

  // ─── Computed metrics ───
  const stats = useMemo(() => {
    const totalMinutes = studyRecords.reduce((a, r) => a + r.durationSeconds / 60, 0);
    const totalHours = totalMinutes / 60;
    const totalQuestions = studyRecords.reduce((a, r) => a + r.correctAnswers + r.wrongAnswers + r.blankAnswers, 0);
    const totalCorrect = studyRecords.reduce((a, r) => a + r.correctAnswers, 0);
    const totalPages = studyRecords.reduce((a, r) => a + r.pagesRead, 0);
    const hitRate = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    const uniqueDays = new Set(studyRecords.map((r) => r.date)).size;
    const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0;

    return { totalHours, totalQuestions, totalCorrect, totalPages, hitRate, uniqueDays, avgHoursPerDay };
  }, [studyRecords]);

  // ─── Last 30 days evolution ───
  const last30Days = useMemo(() => {
    const today = new Date();
    const days: { date: string; label: string; hours: number; questions: number; hitRate: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayRecords = studyRecords.filter((r) => r.date === dateStr);
      const hours = dayRecords.reduce((a, r) => a + r.durationSeconds / 3600, 0);
      const correct = dayRecords.reduce((a, r) => a + r.correctAnswers, 0);
      const total = dayRecords.reduce((a, r) => a + r.correctAnswers + r.wrongAnswers + r.blankAnswers, 0);
      days.push({
        date: dateStr,
        label: format(d, 'dd/MM'),
        hours: Math.round(hours * 100) / 100,
        questions: total,
        hitRate: total > 0 ? Math.round((correct / total) * 100) : 0,
      });
    }
    return days;
  }, [studyRecords]);

  // ─── Per discipline ───
  const disciplineStats = useMemo(() => {
    return disciplines.map((disc, i) => {
      const records = studyRecords.filter((r) => r.disciplineId === disc.id);
      const hours = records.reduce((a, r) => a + r.durationSeconds / 3600, 0);
      const correct = records.reduce((a, r) => a + r.correctAnswers, 0);
      const wrong = records.reduce((a, r) => a + r.wrongAnswers, 0);
      const blank = records.reduce((a, r) => a + r.blankAnswers, 0);
      const total = correct + wrong + blank;
      const discTopics = topics.filter((t) => t.disciplineId === disc.id);
      const completedTopics = discTopics.filter((t) => t.completed).length;
      const topicProgress = discTopics.length > 0 ? (completedTopics / discTopics.length) * 100 : 0;

      return {
        name: disc.name.length > 14 ? disc.name.slice(0, 12) + '…' : disc.name,
        fullName: disc.name,
        hours: Math.round(hours * 10) / 10,
        questions: total,
        correct,
        wrong,
        blank,
        hitRate: total > 0 ? Math.round((correct / total) * 100) : 0,
        topicProgress: Math.round(topicProgress),
        color: COLORS[i % COLORS.length],
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [disciplines, studyRecords, topics]);

  // ─── Radar data (top 8) ───
  const radarData = useMemo(() => {
    return disciplineStats.slice(0, 8).map((d) => ({
      subject: d.name,
      hours: Math.min(d.hours, 100),
      hitRate: d.hitRate,
      topics: d.topicProgress,
    }));
  }, [disciplineStats]);

  // ─── Weekly comparison ───
  const weeklyComparison = useMemo(() => {
    const today = new Date();
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekStart, 1);

    const thisWeekHours = studyRecords
      .filter((r) => { const d = parseISO(r.date); return isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd }); })
      .reduce((a, r) => a + r.durationSeconds / 3600, 0);

    const lastWeekHours = studyRecords
      .filter((r) => { const d = parseISO(r.date); return isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd }); })
      .reduce((a, r) => a + r.durationSeconds / 3600, 0);

    const change = lastWeekHours > 0 ? ((thisWeekHours - lastWeekHours) / lastWeekHours) * 100 : 0;
    return { thisWeek: Math.round(thisWeekHours * 10) / 10, lastWeek: Math.round(lastWeekHours * 10) / 10, change: Math.round(change) };
  }, [studyRecords]);

  // ─── Activity type distribution ───
  const activityDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    studyRecords.forEach((r) => {
      const label = r.activityType === 'estudo' ? 'Estudo' : r.activityType === 'revisao' ? 'Revisão' : r.activityType === 'exercicios' ? 'Exercícios' : 'Leitura';
      map[label] = (map[label] || 0) + r.durationSeconds / 3600;
    });
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value: Math.round(value * 10) / 10,
      color: COLORS[i % COLORS.length],
    }));
  }, [studyRecords]);

  const exportPdf = useCallback(async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      const addLine = (text: string, size: number, bold = false, color: [number, number, number] = [30, 30, 30]) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(size);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        doc.text(text, margin, y);
        y += size * 0.5 + 2;
      };

      const addSeparator = () => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pw - margin, y);
        y += 4;
      };

      // Header
      doc.setFillColor(26, 42, 108);
      doc.rect(0, 0, pw, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Desempenho', pw / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pw / 2, 23, { align: 'center' });
      doc.text(`${stats.uniqueDays} dias de estudo registrados`, pw / 2, 29, { align: 'center' });
      y = 45;

      // Summary
      addLine('Resumo Geral', 14, true, [26, 42, 108]);
      y += 2;
      const summaryItems = [
        [`Total de Horas: ${stats.totalHours.toFixed(1)}h`, `Média: ${stats.avgHoursPerDay.toFixed(1)}h/dia`],
        [`Questões: ${stats.totalQuestions}`, `Acertos: ${stats.totalCorrect} (${stats.hitRate.toFixed(1)}%)`],
        [`Páginas Lidas: ${stats.totalPages}`, `Semana Atual: ${weeklyComparison.thisWeek}h`],
      ];
      summaryItems.forEach(([left, right]) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(left, margin, y);
        doc.text(right, pw / 2, y);
        y += 6;
      });
      y += 2;
      addSeparator();

      // Per discipline
      addLine('Desempenho por Disciplina', 14, true, [26, 42, 108]);
      y += 2;

      // Table header
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, y - 4, pw - margin * 2, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      const cols = [margin, margin + 55, margin + 80, margin + 105, margin + 130, margin + 155];
      ['Disciplina', 'Horas', 'Questões', 'Acerto %', 'Edital %'].forEach((h, i) => {
        doc.text(h, cols[i], y);
      });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      disciplineStats.forEach((d) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setFontSize(8);
        const name = d.fullName.length > 30 ? d.fullName.slice(0, 28) + '…' : d.fullName;
        doc.text(name, cols[0], y);
        doc.text(`${d.hours}h`, cols[1], y);
        doc.text(String(d.questions), cols[2], y);
        doc.text(`${d.hitRate}%`, cols[3], y);
        doc.text(`${d.topicProgress}%`, cols[4], y);
        y += 5;
      });

      y += 4;
      addSeparator();

      // Last 7 days history
      addLine('Histórico — Últimos 7 dias', 14, true, [26, 42, 108]);
      y += 2;
      const recent7 = last30Days.slice(-7);
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, y - 4, pw - margin * 2, 7, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      ['Data', 'Horas', 'Questões', 'Acerto %'].forEach((h, i) => {
        doc.text(h, cols[i], y);
      });
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      recent7.forEach((d) => {
        doc.setFontSize(8);
        doc.text(d.label, cols[0], y);
        doc.text(`${d.hours}h`, cols[1], y);
        doc.text(String(d.questions), cols[2], y);
        doc.text(`${d.hitRate}%`, cols[3], y);
        y += 5;
      });

      y += 4;
      addSeparator();

      // Goals
      addLine('Metas Semanais', 14, true, [26, 42, 108]);
      y += 2;
      const goalPct = goals.weeklyHours > 0 ? Math.min(100, Math.round((weeklyComparison.thisWeek / goals.weeklyHours) * 100)) : 0;
      addLine(`Horas: ${weeklyComparison.thisWeek}h / ${goals.weeklyHours}h (${goalPct}%)`, 10);

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('ConcurseiroElite — Relatório de Desempenho', margin, 290);
        doc.text(`Página ${i}/${totalPages}`, pw - margin, 290, { align: 'right' });
      }

      doc.save(`relatorio-desempenho-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF.');
    }
  }, [stats, disciplineStats, last30Days, weeklyComparison, goals]);

  if (!hasData) {
    return (
      <motion.div variants={itemVariants} initial="initial" animate="animate" className="space-y-6">
        <h1 className="text-2xl font-bold">Indicadores</h1>
        <Card className="border-dashed glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Seus indicadores aparecerão aqui</h3>
            <p className="text-sm text-muted-foreground">Registre estudos para ver gráficos e análises detalhadas.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) => (
    <motion.div variants={itemVariants}>
      <Card className="glass card-hover stat-card">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0`} style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indicadores</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{stats.uniqueDays} dias de estudo registrados</span>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs" onClick={exportPdf}>
            <Download className="h-3.5 w-3.5" />
            Exportar PDF
          </Button>
        </div>
      </motion.div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Clock} label="Total de Horas" value={`${stats.totalHours.toFixed(1)}h`} sub={`Média ${stats.avgHoursPerDay.toFixed(1)}h/dia`} color="hsl(217, 91%, 60%)" />
        <StatCard icon={Target} label="Questões" value={String(stats.totalQuestions)} sub={`${stats.totalCorrect} acertos`} color="hsl(24, 95%, 53%)" />
        <StatCard icon={Brain} label="Taxa de Acerto" value={`${stats.hitRate.toFixed(1)}%`} sub={`${stats.totalCorrect}/${stats.totalQuestions}`} color="hsl(142, 71%, 45%)" />
        <StatCard
          icon={TrendingUp}
          label="Semana Atual"
          value={`${weeklyComparison.thisWeek}h`}
          sub={weeklyComparison.change !== 0 ? `${weeklyComparison.change > 0 ? '+' : ''}${weeklyComparison.change}% vs semana anterior` : 'Sem comparação'}
          color="hsl(280, 67%, 55%)"
        />
      </div>

      {/* ─── Tabs ─── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="evolucao" className="space-y-4">
          <TabsList className="glass">
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
            <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
            <TabsTrigger value="radar">Visão Geral</TabsTrigger>
          </TabsList>

          {/* ── Evolução ── */}
          <TabsContent value="evolucao" className="space-y-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Horas de Estudo — Últimos 30 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={last30Days}>
                    <defs>
                      <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 15%, 20%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(215, 20%, 45%)" interval={4} />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 20%, 45%)" />
                    <ReTooltip
                      contentStyle={{ background: 'hsl(228, 25%, 12%)', border: '1px solid hsl(224, 15%, 20%)', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: 'hsl(210, 40%, 90%)' }}
                    />
                    <Area type="monotone" dataKey="hours" stroke="hsl(217, 91%, 60%)" fill="url(#gradHours)" strokeWidth={2} name="Horas" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-accent" />
                    Questões por Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={last30Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 15%, 20%)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(215, 20%, 45%)" interval={6} />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 20%, 45%)" />
                      <ReTooltip contentStyle={{ background: 'hsl(228, 25%, 12%)', border: '1px solid hsl(224, 15%, 20%)', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="questions" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} name="Questões" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-success" />
                    Taxa de Acerto (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={last30Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 15%, 20%)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(215, 20%, 45%)" interval={6} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(215, 20%, 45%)" />
                      <ReTooltip contentStyle={{ background: 'hsl(228, 25%, 12%)', border: '1px solid hsl(224, 15%, 20%)', borderRadius: 12, fontSize: 12 }} />
                      <Line type="monotone" dataKey="hitRate" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="Acerto %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Disciplinas ── */}
          <TabsContent value="disciplinas" className="space-y-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Horas por Disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, disciplineStats.length * 36)}>
                  <BarChart data={disciplineStats} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(224, 15%, 20%)" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 20%, 45%)" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} stroke="hsl(215, 20%, 45%)" />
                    <ReTooltip contentStyle={{ background: 'hsl(228, 25%, 12%)', border: '1px solid hsl(224, 15%, 20%)', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="hours" name="Horas" radius={[0, 6, 6, 0]}>
                      {disciplineStats.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-3">
              {disciplineStats.map((d, i) => (
                <Card key={i} className="glass card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                        <span className="text-sm font-semibold">{d.fullName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{d.hours}h</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="block text-foreground font-semibold">{d.hitRate}%</span>
                        Taxa de acerto
                      </div>
                      <div>
                        <span className="block text-foreground font-semibold">{d.questions}</span>
                        Questões
                      </div>
                      <div>
                        <span className="block text-foreground font-semibold">{d.topicProgress}%</span>
                        Edital concluído
                      </div>
                    </div>
                    <Progress value={d.topicProgress} className="h-1 mt-3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Radar / Visão Geral ── */}
          <TabsContent value="radar" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Desempenho Multidimensional</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(224, 15%, 20%)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'hsl(215, 20%, 55%)' }} />
                      <PolarRadiusAxis tick={{ fontSize: 8 }} stroke="hsl(215, 20%, 35%)" />
                      <Radar name="Acerto %" dataKey="hitRate" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} />
                      <Radar name="Edital %" dataKey="topics" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.15} />
                      <ReTooltip contentStyle={{ background: 'hsl(228, 25%, 12%)', border: '1px solid hsl(224, 15%, 20%)', borderRadius: 12, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição por Atividade</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  {activityDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={activityDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {activityDistribution.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <ReTooltip contentStyle={{ background: 'hsl(228, 25%, 12%)', border: '1px solid hsl(224, 15%, 20%)', borderRadius: 12, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Metas */}
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Progresso Semanal vs Metas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Horas ({weeklyComparison.thisWeek}h / {goals.weeklyHours}h)</span>
                    <span className="font-mono">{Math.min(100, Math.round((weeklyComparison.thisWeek / goals.weeklyHours) * 100))}%</span>
                  </div>
                  <Progress value={Math.min(100, (weeklyComparison.thisWeek / goals.weeklyHours) * 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
