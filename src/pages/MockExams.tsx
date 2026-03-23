import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Trash2, TrendingUp, BarChart3, Download, ChevronDown, Target } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import type { Simulado, SimuladoDiscipline } from '@/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { toast } from 'sonner';

const containerVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const COLORS = [
  'hsl(var(--neon-green))',
  'hsl(var(--electric-blue))',
  'hsl(var(--sporty-orange))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
  boxShadow: '0 8px 30px -7px hsl(var(--foreground) / 0.1)',
};

export default function MockExams() {
  const { simulados, disciplines, settings, addSimulado, removeSimulado } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newBanca, setNewBanca] = useState('');
  const [newDisciplines, setNewDisciplines] = useState<SimuladoDiscipline[]>([]);
  const [selectedDiscId, setSelectedDiscId] = useState('');

  const phases = settings.contest.phases || [{ name: 'P1', minPercent: 60, weight: 1 }];
  const getProvaWeight = (prova: string) => phases.find(p => p.name === prova)?.weight ?? 1;
  const getDiscProvaWeight = (discId: string) => {
    const disc = disciplines.find(d => d.id === discId);
    return disc ? getProvaWeight(disc.prova) : 1;
  };

  const sorted = useMemo(
    () => [...simulados].sort((a, b) => a.date.localeCompare(b.date)),
    [simulados]
  );

  const discName = (id: string) => disciplines.find((d) => d.id === id)?.name ?? id;

  const addDiscToSimulado = () => {
    if (!selectedDiscId || newDisciplines.find((d) => d.disciplineId === selectedDiscId)) return;
    setNewDisciplines((prev) => [
      ...prev,
      { disciplineId: selectedDiscId, questions: 10, weight: 1, correct: 0, blank: 0, wrong: 0 },
    ]);
    setSelectedDiscId('');
  };

  const updateDiscField = (idx: number, field: keyof SimuladoDiscipline, value: number) => {
    setNewDisciplines((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const removeDiscFromForm = (idx: number) => {
    setNewDisciplines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!newDate || newDisciplines.length === 0) {
      toast.error('Preencha a data e adicione ao menos uma disciplina');
      return;
    }
    const discs = newDisciplines.map((d) => ({
      ...d,
      wrong: Math.max(0, d.questions - d.correct - d.blank),
    }));
    const sim: Simulado = {
      id: crypto.randomUUID(),
      date: newDate,
      banca: newBanca,
      metaPercent: 70,
      hasP2: false,
      p1MinPercent: 0,
      p2MinPercent: 0,
      totalMinPercent: 0,
      p1Disciplines: [],
      p2Disciplines: [],
      disciplines: discs,
      createdAt: new Date().toISOString(),
    };
    addSimulado(sim);
    setDialogOpen(false);
    setNewDate('');
    setNewBanca('');
    setNewDisciplines([]);
    toast.success('Simulado registrado!');
  };

  // ---- Chart data ----
  const evolutionData = useMemo(() => {
    return sorted.map((s) => {
      const totalQ = s.disciplines.reduce((a, d) => a + d.questions, 0);
      const totalC = s.disciplines.reduce((a, d) => a + d.correct, 0);
      const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
      return {
        label: format(parseISO(s.date), 'dd/MM/yy'),
        aproveitamento: pct,
        questoes: totalQ,
        acertos: totalC,
      };
    });
  }, [sorted]);

  const allDiscIds = useMemo(() => {
    const ids = new Set<string>();
    simulados.forEach((s) => s.disciplines.forEach((d) => ids.add(d.disciplineId)));
    return Array.from(ids);
  }, [simulados]);

  const perDiscEvolution = useMemo(() => {
    return sorted.map((s) => {
      const row: Record<string, unknown> = { label: format(parseISO(s.date), 'dd/MM/yy') };
      for (const did of allDiscIds) {
        const sd = s.disciplines.find((d) => d.disciplineId === did);
        row[did] = sd && sd.questions > 0 ? Math.round((sd.correct / sd.questions) * 100) : null;
      }
      return row;
    });
  }, [sorted, allDiscIds]);

  const radarData = useMemo(() => {
    if (sorted.length === 0) return [];
    const last = sorted[sorted.length - 1];
    return last.disciplines.map((d) => ({
      subject: discName(d.disciplineId).substring(0, 15),
      pct: d.questions > 0 ? Math.round((d.correct / d.questions) * 100) : 0,
    }));
  }, [sorted, disciplines]);

  const hasData = simulados.length > 0;
  const chartsRef = useRef<HTMLDivElement>(null);

  const exportPdf = async () => {
    if (!chartsRef.current) return;
    toast.info('Gerando PDF...');
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 10;
      let y = margin;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 25, 'F');
      doc.setTextColor(74, 222, 128);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Sprint Pro — Relatório de Simulados', margin, y + 10);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, margin, y + 18);
      y = 35;

      const charts = chartsRef.current.querySelectorAll<HTMLElement>('[data-pdf-chart]');
      for (const el of Array.from(charts)) {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0f1729', useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const imgW = pw - margin * 2;
        const imgH = (canvas.height * imgW) / canvas.width;
        if (y + imgH > ph - margin) { doc.addPage(); y = margin; }
        doc.addImage(imgData, 'PNG', margin, y, imgW, Math.min(imgH, 130));
        y += Math.min(imgH, 130) + 8;
      }

      doc.save('sprint-pro-simulados.pdf');
      toast.success('PDF exportado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Simulados</h1>
        <div className="flex gap-2">
          {hasData && (
            <Button size="sm" variant="outline" onClick={exportPdf} className="rounded-xl border-border/40 hover:border-primary/40 gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exportar PDF
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Novo Simulado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto glass border-border/30">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Registrar Simulado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider">Data</Label>
                    <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider">Banca</Label>
                    <Input placeholder="Ex: CESPE" value={newBanca} onChange={(e) => setNewBanca(e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select value={selectedDiscId} onValueChange={setSelectedDiscId}>
                    <SelectTrigger className="flex-1 rounded-xl"><SelectValue placeholder="Disciplina" /></SelectTrigger>
                    <SelectContent>
                      {disciplines.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={addDiscToSimulado} className="rounded-xl">Adicionar</Button>
                </div>

                {newDisciplines.map((d, idx) => (
                  <Card key={idx} className="glass border-border/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{discName(d.disciplineId)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeDiscFromForm(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider">Questões</Label>
                        <Input type="number" min={0} value={d.questions} onChange={(e) => updateDiscField(idx, 'questions', +e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider">Acertos</Label>
                        <Input type="number" min={0} value={d.correct} onChange={(e) => updateDiscField(idx, 'correct', +e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider">Em branco</Label>
                        <Input type="number" min={0} value={d.blank} onChange={(e) => updateDiscField(idx, 'blank', +e.target.value)} className="rounded-xl" />
                      </div>
                    </div>
                  </Card>
                ))}

                <Button className="w-full rounded-xl bg-primary text-primary-foreground font-bold" onClick={handleSave}>Salvar Simulado</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {!hasData ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed glass border-border/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl gradient-orange flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-sporty-orange-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Nenhum simulado realizado</h3>
              <p className="text-sm text-muted-foreground">Crie seu primeiro simulado para acompanhar sua evolução.</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} ref={chartsRef}>
          <Tabs defaultValue="evolucao" className="space-y-4">
            <TabsList className="glass border-border/30">
              <TabsTrigger value="evolucao"><TrendingUp className="h-4 w-4 mr-1" /> Evolução</TabsTrigger>
              <TabsTrigger value="disciplinas"><BarChart3 className="h-4 w-4 mr-1" /> Por Disciplina</TabsTrigger>
              <TabsTrigger value="lista"><FileText className="h-4 w-4 mr-1" /> Histórico</TabsTrigger>
            </TabsList>

            {/* Evolution chart */}
            <TabsContent value="evolucao" className="space-y-4">
              <Card className="glass border-border/30" data-pdf-chart>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <TrendingUp className="h-4 w-4 text-neon-green" />
                    Aproveitamento Geral (%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionData}>
                      <defs>
                        <linearGradient id="glowLine" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--neon-green))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--neon-green))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="aproveitamento" stroke="hsl(var(--neon-green))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--neon-green))' }} name="% Acerto" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass border-border/30" data-pdf-chart>
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                    <Target className="h-4 w-4 text-sporty-orange" />
                    Volume de Questões e Acertos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={evolutionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="questoes" fill="hsl(var(--muted-foreground))" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="acertos" fill="hsl(var(--neon-green))" name="Acertos" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {radarData.length > 2 && (
                <Card className="glass border-border/30" data-pdf-chart>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Radar – Último Simulado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} />
                        <Radar dataKey="pct" stroke="hsl(var(--neon-green))" fill="hsl(var(--neon-green))" fillOpacity={0.2} name="% Acerto" />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Per discipline evolution */}
            <TabsContent value="disciplinas">
              <Card className="glass border-border/30" data-pdf-chart>
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Evolução por Disciplina (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={perDiscEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      {allDiscIds.map((did, i) => (
                        <Line
                          key={did}
                          type="monotone"
                          dataKey={did}
                          name={discName(did).substring(0, 20)}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History list */}
            <TabsContent value="lista" className="space-y-3">
              {sorted.map((s) => {
                const totalQ = s.disciplines.reduce((a, d) => a + d.questions, 0);
                const totalC = s.disciplines.reduce((a, d) => a + d.correct, 0);
                const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
                return (
                  <Collapsible key={s.id}>
                    <motion.div
                      whileHover={{ scale: 1.01, y: -1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                    <Card className="glass border-border/30 hover:border-primary/40 hover:shadow-neon transition-all duration-300 group">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger className="flex items-center gap-2 text-left group flex-1">
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                            <div>
                              <p className="font-semibold">
                                {format(parseISO(s.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                {s.banca && <Badge variant="outline" className="ml-2 text-[10px] rounded-full border-border/40">{s.banca}</Badge>}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {totalQ} questões · {totalC} acertos · <span className="font-bold text-neon-green">{pct}%</span>
                              </p>
                            </div>
                          </CollapsibleTrigger>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { removeSimulado(s.id); toast.info('Simulado removido'); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <CollapsibleContent className="mt-3 space-y-2 border-t border-border/30 pt-3">
                          {s.disciplines.map((d) => {
                            const dpct = d.questions > 0 ? Math.round((d.correct / d.questions) * 100) : 0;
                            return (
                              <motion.div key={d.disciplineId} className="space-y-1" whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">{discName(d.disciplineId)}</span>
                                  <span className="text-muted-foreground font-mono text-xs">
                                    {d.correct}/{d.questions} (<span className="text-neon-green font-bold">{dpct}%</span>)
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <div className="h-full rounded-full gradient-neon" style={{ width: `${dpct}%` }} />
                                </div>
                              </motion.div>
                            );
                          })}
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                    </motion.div>
                  </Collapsible>
                );
              })}
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </motion.div>
  );
}
