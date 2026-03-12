import { useMemo, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, CheckCircle2, BookOpen,
  Target, Brain, CalendarDays, Download, Timer, Crosshair, Activity,
  History, Trash2, Pencil, ChevronLeft, ChevronRight, X, Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/useAppStore';
import { useCountUp } from '@/hooks/useCountUp';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area,
} from 'recharts';
import { format, subDays, subMonths, parseISO, startOfWeek, endOfWeek, isWithinInterval, isAfter, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, eachWeekOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInView } from 'framer-motion';
import type { StudyRecord, ActivityType } from '@/types';

type PeriodFilter = '7d' | '30d' | '90d' | 'all';
const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '3 meses' },
  { value: 'all', label: 'Tudo' },
];

const COLORS = [
  'hsl(var(--neon-green))',
  'hsl(var(--electric-blue))',
  'hsl(var(--sporty-orange))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(38, 92%, 50%)',
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

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
  boxShadow: '0 8px 30px -7px hsl(var(--foreground) / 0.1)',
};

// ─── Animated Stat Card ───
function IndicatorStatCard({ icon: Icon, label, numericValue, formatFn, sub, gradient, iconBg, iconColor }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  numericValue: number;
  formatFn: (v: number) => string;
  sub?: string;
  gradient: string;
  iconBg: string;
  iconColor: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const animatedValue = useCountUp(isInView ? numericValue : 0, 1400);

  return (
    <motion.div ref={ref} variants={itemVariants}>
      <Card className={`glass border-border/30 bg-gradient-to-br ${gradient} transition-all duration-300 hover:border-primary/30`}>
        <CardContent className="p-4 flex items-center gap-4">
          <motion.div
            className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${iconBg} shadow-soft`}
            initial={{ rotate: -20, scale: 0 }}
            animate={isInView ? { rotate: 0, scale: 1 } : {}}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </motion.div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">{label}</p>
            <motion.p
              className="text-xl font-extrabold tracking-tight tabular-nums"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {formatFn(animatedValue)}
            </motion.p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Indicators() {
  const disciplines = useAppStore((s) => s.disciplines);
  const allStudyRecords = useAppStore((s) => s.studyRecords);
  const topics = useAppStore((s) => s.topics);
  const simulados = useAppStore((s) => s.simulados);
  const goals = useAppStore((s) => s.settings.goals);
  const { updateStudyRecord, removeStudyRecord } = useAppStore();
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const chartsRef = useRef<HTMLDivElement>(null);

  // ─── Histórico state ───
  const [historyDisciplineFilter, setHistoryDisciplineFilter] = useState<string>('all');
  const [editingRecord, setEditingRecord] = useState<StudyRecord | null>(null);
  const [editForm, setEditForm] = useState({ hours: 0, minutes: 0, correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0, pagesRead: 0, notes: '', activityType: 'estudo' as ActivityType });

  // ─── Linha do Tempo state ───
  const [timelineMode, setTimelineMode] = useState<'semana' | 'mes'>('semana');
  const [timelineOffset, setTimelineOffset] = useState(0);

  const studyRecords = useMemo(() => {
    if (period === 'all') return allStudyRecords;
    const now = new Date();
    const cutoff = period === '7d' ? subDays(now, 7) : period === '30d' ? subDays(now, 30) : subMonths(now, 3);
    return allStudyRecords.filter((r) => isAfter(parseISO(r.date), cutoff));
  }, [allStudyRecords, period]);

  const hasData = allStudyRecords.length > 0;

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

  // ─── Histórico: records grouped by date ───
  const historyGroups = useMemo(() => {
    const filtered = historyDisciplineFilter === 'all'
      ? studyRecords
      : studyRecords.filter((r) => r.disciplineId === historyDisciplineFilter);
    const grouped: Record<string, StudyRecord[]> = {};
    filtered.forEach((r) => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, records]) => ({
        date,
        records,
        totalSeconds: records.reduce((a, r) => a + r.durationSeconds, 0),
      }));
  }, [studyRecords, historyDisciplineFilter]);

  const openEditRecord = useCallback((record: StudyRecord) => {
    setEditingRecord(record);
    setEditForm({
      hours: Math.floor(record.durationSeconds / 3600),
      minutes: Math.floor((record.durationSeconds % 3600) / 60),
      correctAnswers: record.correctAnswers,
      wrongAnswers: record.wrongAnswers,
      blankAnswers: record.blankAnswers,
      pagesRead: record.pagesRead,
      notes: record.notes,
      activityType: record.activityType,
    });
  }, []);

  const saveEditRecord = useCallback(() => {
    if (!editingRecord) return;
    updateStudyRecord(editingRecord.id, {
      durationSeconds: editForm.hours * 3600 + editForm.minutes * 60,
      correctAnswers: editForm.correctAnswers,
      wrongAnswers: editForm.wrongAnswers,
      blankAnswers: editForm.blankAnswers,
      pagesRead: editForm.pagesRead,
      notes: editForm.notes,
      activityType: editForm.activityType,
    });
    toast.success('Registro atualizado!');
    setEditingRecord(null);
  }, [editingRecord, editForm, updateStudyRecord]);

  const deleteRecord = useCallback((id: string) => {
    removeStudyRecord(id);
    toast.success('Registro excluído.');
  }, [removeStudyRecord]);

  // ─── Linha do Tempo: stacked bar data ───
  const timelineData = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date, days: Date[];

    if (timelineMode === 'semana') {
      const baseStart = startOfWeek(today, { weekStartsOn: 1 });
      start = subWeeks(baseStart, -timelineOffset);
      end = endOfWeek(start, { weekStartsOn: 1 });
      days = eachDayOfInterval({ start, end });
    } else {
      const baseStart = startOfMonth(today);
      start = addMonths(baseStart, timelineOffset);
      end = endOfMonth(start);
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      days = weeks;
    }

    const topDiscs = disciplines.slice(0, 8);

    const data = days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = timelineMode === 'semana'
        ? format(day, 'EEE', { locale: ptBR })
        : format(day, 'dd/MM');

      const entry: Record<string, any> = { label, date: dayStr };
      topDiscs.forEach((disc) => {
        const dayRecords = allStudyRecords.filter((r) => {
          if (timelineMode === 'semana') return r.date === dayStr && r.disciplineId === disc.id;
          const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
          return r.disciplineId === disc.id && r.date >= dayStr && r.date <= format(weekEnd, 'yyyy-MM-dd');
        });
        entry[disc.name] = Math.round(dayRecords.reduce((a, r) => a + r.durationSeconds / 3600, 0) * 10) / 10;
      });
      return entry;
    });

    const periodLabel = timelineMode === 'semana'
      ? `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`
      : format(start, "MMMM 'de' yyyy", { locale: ptBR });

    const totalSeconds = allStudyRecords
      .filter((r) => r.date >= format(start, 'yyyy-MM-dd') && r.date <= format(end, 'yyyy-MM-dd'))
      .reduce((a, r) => a + r.durationSeconds, 0);

    return { data, discNames: topDiscs.map((d) => d.name), periodLabel, totalSeconds };
  }, [allStudyRecords, disciplines, timelineMode, timelineOffset]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const exportPdf = useCallback(async () => {
    try {
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas').then((m) => m.default),
      ]);
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
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 35, 'F');
      doc.setTextColor(74, 222, 128);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Sprint Pro — Relatório de Desempenho', pw / 2, 15, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pw / 2, 23, { align: 'center' });
      doc.text(`${stats.uniqueDays} dias de estudo registrados`, pw / 2, 29, { align: 'center' });
      y = 45;

      addLine('Resumo Geral', 14, true, [74, 222, 128]);
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

      if (chartsRef.current) {
        const chartCards = chartsRef.current.querySelectorAll<HTMLElement>('[data-pdf-chart]');
        for (const chartEl of chartCards) {
          const title = chartEl.getAttribute('data-pdf-chart') || 'Gráfico';
          if (y > 120) { doc.addPage(); y = 20; }
          addLine(title, 12, true, [74, 222, 128]);
          y += 2;
          const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#0f1729', logging: false, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pw - margin * 2;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const finalHeight = Math.min(imgHeight, 120);
          doc.addImage(imgData, 'PNG', margin, y, imgWidth, finalHeight);
          y += finalHeight + 6;
        }
        addSeparator();
      }

      addLine('Desempenho por Disciplina', 14, true, [74, 222, 128]);
      y += 2;
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

      addLine('Histórico — Últimos 7 dias', 14, true, [74, 222, 128]);
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

      addLine('Metas Semanais', 14, true, [74, 222, 128]);
      y += 2;
      const goalPct = goals.weeklyHours > 0 ? Math.min(100, Math.round((weeklyComparison.thisWeek / goals.weeklyHours) * 100)) : 0;
      addLine(`Horas: ${weeklyComparison.thisWeek}h / ${goals.weeklyHours}h (${goalPct}%)`, 10);

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Sprint Pro — Relatório de Desempenho', margin, 290);
        doc.text(`Página ${i}/${totalPages}`, pw - margin, 290, { align: 'right' });
      }

      doc.save(`sprint-pro-indicadores-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF.');
    }
  }, [stats, disciplineStats, last30Days, weeklyComparison, goals]);

  if (!hasData) {
    return (
      <motion.div variants={itemVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight">Indicadores</h1>
        <Card className="border-dashed glass border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-neon flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-neon-green-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Seus indicadores aparecerão aqui</h3>
            <p className="text-sm text-muted-foreground">Registre estudos para ver gráficos e análises detalhadas.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Indicadores</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center glass rounded-xl p-0.5 gap-0.5 border-border/30">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  period === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline font-mono">{stats.uniqueDays} dias</span>
          <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs border-border/40 hover:border-primary/40" onClick={exportPdf}>
            <Download className="h-3.5 w-3.5" />
            Exportar PDF
          </Button>
        </div>
      </motion.div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <IndicatorStatCard
          icon={Timer} label="Total de Horas"
          numericValue={Math.round(stats.totalHours * 10)}
          formatFn={(v) => `${(v / 10).toFixed(1)}h`}
          sub={`Média ${stats.avgHoursPerDay.toFixed(1)}h/dia`}
          gradient="from-electric-blue/15 to-electric-blue/5"
          iconBg="gradient-blue" iconColor="text-electric-blue-foreground"
        />
        <IndicatorStatCard
          icon={Crosshair} label="Questões"
          numericValue={stats.totalQuestions}
          formatFn={(v) => v.toString()}
          sub={`${stats.totalCorrect} acertos`}
          gradient="from-sporty-orange/15 to-sporty-orange/5"
          iconBg="gradient-orange" iconColor="text-sporty-orange-foreground"
        />
        <IndicatorStatCard
          icon={Brain} label="Taxa de Acerto"
          numericValue={Math.round(stats.hitRate * 10)}
          formatFn={(v) => `${(v / 10).toFixed(1)}%`}
          sub={`${stats.totalCorrect}/${stats.totalQuestions}`}
          gradient="from-neon-green/15 to-neon-green/5"
          iconBg="gradient-neon" iconColor="text-neon-green-foreground"
        />
        <IndicatorStatCard
          icon={TrendingUp} label="Semana Atual"
          numericValue={Math.round(weeklyComparison.thisWeek * 10)}
          formatFn={(v) => `${(v / 10).toFixed(1)}h`}
          sub={weeklyComparison.change !== 0 ? `${weeklyComparison.change > 0 ? '+' : ''}${weeklyComparison.change}% vs anterior` : 'Sem comparação'}
          gradient="from-chart-4/15 to-chart-5/5"
          iconBg="bg-chart-4" iconColor="text-primary-foreground"
        />
      </div>

      {/* ─── Tabs ─── */}
      <motion.div variants={itemVariants} ref={chartsRef}>
        <Tabs defaultValue="evolucao" className="space-y-4">
          <TabsList className="glass border-border/30 flex-wrap h-auto">
            <TabsTrigger value="evolucao">Evolução</TabsTrigger>
            <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            <TabsTrigger value="radar">Visão Geral</TabsTrigger>
          </TabsList>

          {/* ── Evolução ── */}
          <TabsContent value="evolucao" className="space-y-4">
            <Card className="glass border-border/30" data-pdf-chart="Horas de Estudo — Últimos 30 dias">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <CalendarDays className="h-4 w-4 text-electric-blue" />
                  Horas de Estudo — Últimos 30 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={last30Days}>
                    <defs>
                      <linearGradient id="gradHoursInd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--electric-blue))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--electric-blue))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <ReTooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="hours" stroke="hsl(var(--electric-blue))" fill="url(#gradHoursInd)" strokeWidth={2} name="Horas" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass border-border/30" data-pdf-chart="Questões por Dia">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <Crosshair className="h-4 w-4 text-sporty-orange" />
                    Questões por Dia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={last30Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={6} />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <ReTooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="questions" fill="hsl(var(--sporty-orange))" radius={[4, 4, 0, 0]} name="Questões" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass border-border/30" data-pdf-chart="Taxa de Acerto (%)">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <Brain className="h-4 w-4 text-neon-green" />
                    Taxa de Acerto (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={last30Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={6} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <ReTooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="hitRate" stroke="hsl(var(--neon-green))" strokeWidth={2} dot={false} name="Acerto %" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Disciplinas ── */}
          <TabsContent value="disciplinas" className="space-y-4">
            <Card className="glass border-border/30" data-pdf-chart="Horas por Disciplina">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Horas por Disciplina</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, disciplineStats.length * 36)}>
                  <BarChart data={disciplineStats} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <ReTooltip contentStyle={tooltipStyle} />
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
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.015, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Card className="glass border-border/30 hover:border-primary/40 hover:shadow-neon transition-all duration-300 group">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full shadow-soft group-hover:glow-neon transition-shadow duration-300" style={{ background: d.color }} />
                          <span className="text-sm font-semibold group-hover:text-primary transition-colors duration-300">{d.fullName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors duration-300">{d.hours}h</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="block text-foreground font-extrabold">{d.hitRate}%</span>
                          Taxa de acerto
                        </div>
                        <div>
                          <span className="block text-foreground font-extrabold">{d.questions}</span>
                          Questões
                        </div>
                        <div>
                          <span className="block text-foreground font-extrabold">{d.topicProgress}%</span>
                          Edital concluído
                        </div>
                      </div>
                      <div className="h-1.5 mt-3 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full gradient-neon group-hover:shadow-neon transition-shadow duration-300" style={{ width: `${d.topicProgress}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── Radar / Visão Geral ── */}
          <TabsContent value="radar" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass border-border/30" data-pdf-chart="Desempenho Multidimensional">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Desempenho Multidimensional</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <PolarRadiusAxis tick={{ fontSize: 8 }} stroke="hsl(var(--border))" />
                      <Radar name="Acerto %" dataKey="hitRate" stroke="hsl(var(--neon-green))" fill="hsl(var(--neon-green))" fillOpacity={0.15} />
                      <Radar name="Edital %" dataKey="topics" stroke="hsl(var(--electric-blue))" fill="hsl(var(--electric-blue))" fillOpacity={0.15} />
                      <ReTooltip contentStyle={tooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass border-border/30" data-pdf-chart="Distribuição por Atividade">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Distribuição por Atividade</CardTitle>
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
                        <ReTooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Metas */}
            <Card className="glass border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4 text-neon-green" />
                  Progresso Semanal vs Metas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">Horas ({weeklyComparison.thisWeek}h / {goals.weeklyHours}h)</span>
                    <span className="font-mono text-muted-foreground">{Math.min(100, Math.round((weeklyComparison.thisWeek / goals.weeklyHours) * 100))}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full gradient-neon transition-all duration-500" style={{ width: `${Math.min(100, (weeklyComparison.thisWeek / goals.weeklyHours) * 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
