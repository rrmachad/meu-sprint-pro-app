import { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Trash2, TrendingUp, BarChart3, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

export default function MockExams() {
  const { simulados, disciplines, addSimulado, removeSimulado } = useAppStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newBanca, setNewBanca] = useState('');
  const [newDisciplines, setNewDisciplines] = useState<SimuladoDiscipline[]>([]);
  const [selectedDiscId, setSelectedDiscId] = useState('');

  const sorted = useMemo(
    () => [...simulados].sort((a, b) => a.date.localeCompare(b.date)),
    [simulados]
  );

  const discName = (id: string) => disciplines.find((d) => d.id === id)?.name ?? id;

  // ---- Form helpers ----
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
    // auto-calculate wrong
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

      // Title
      doc.setFontSize(16);
      doc.text('Relatório de Simulados', margin, y + 6);
      y += 14;
      doc.setFontSize(10);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, margin, y);
      y += 10;

      // Capture each chart
      const charts = chartsRef.current.querySelectorAll<HTMLElement>('[data-pdf-chart]');
      for (const el of Array.from(charts)) {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0f1729', useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const imgW = pw - margin * 2;
        const imgH = (canvas.height * imgW) / canvas.width;

        if (y + imgH > ph - margin) {
          doc.addPage();
          y = margin;
        }
        doc.addImage(imgData, 'PNG', margin, y, imgW, Math.min(imgH, 130));
        y += Math.min(imgH, 130) + 8;
      }

      doc.save('simulados-comparativo.pdf');
      toast.success('PDF exportado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Simulados</h1>
        <div className="flex gap-2">
          {hasData && (
            <Button size="sm" variant="outline" onClick={exportPdf}>
              <Download className="h-4 w-4 mr-1" /> Exportar PDF
            </Button>
          )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Simulado</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Simulado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
                <div>
                  <Label>Banca</Label>
                  <Input placeholder="Ex: CESPE" value={newBanca} onChange={(e) => setNewBanca(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2">
                <Select value={selectedDiscId} onValueChange={setSelectedDiscId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={addDiscToSimulado}>Adicionar</Button>
              </div>

              {newDisciplines.map((d, idx) => (
                <Card key={idx} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{discName(d.disciplineId)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDiscFromForm(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Questões</Label>
                      <Input type="number" min={0} value={d.questions} onChange={(e) => updateDiscField(idx, 'questions', +e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Acertos</Label>
                      <Input type="number" min={0} value={d.correct} onChange={(e) => updateDiscField(idx, 'correct', +e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Em branco</Label>
                      <Input type="number" min={0} value={d.blank} onChange={(e) => updateDiscField(idx, 'blank', +e.target.value)} />
                    </div>
                  </div>
                </Card>
              ))}

              <Button className="w-full" onClick={handleSave}>Salvar Simulado</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhum simulado realizado</h3>
            <p className="text-sm text-muted-foreground">Crie seu primeiro simulado para acompanhar sua evolução.</p>
          </CardContent>
        </Card>
      ) : (
        <div ref={chartsRef}>
        <Tabs defaultValue="evolucao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="evolucao"><TrendingUp className="h-4 w-4 mr-1" /> Evolução</TabsTrigger>
            <TabsTrigger value="disciplinas"><BarChart3 className="h-4 w-4 mr-1" /> Por Disciplina</TabsTrigger>
            <TabsTrigger value="lista"><FileText className="h-4 w-4 mr-1" /> Histórico</TabsTrigger>
          </TabsList>

          {/* Evolution chart */}
          <TabsContent value="evolucao" className="space-y-4">
            <Card data-pdf-chart>
              <CardHeader><CardTitle className="text-base">Aproveitamento Geral (%)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Line type="monotone" dataKey="aproveitamento" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="% Acerto" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-pdf-chart>
              <CardHeader><CardTitle className="text-base">Volume de Questões e Acertos</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="questoes" fill="hsl(var(--muted-foreground))" name="Total" />
                    <Bar dataKey="acertos" fill="hsl(var(--primary))" name="Acertos" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {radarData.length > 2 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Radar – Último Simulado</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} />
                      <Radar dataKey="pct" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="% Acerto" />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Per discipline evolution */}
          <TabsContent value="disciplinas">
            <Card>
              <CardHeader><CardTitle className="text-base">Evolução por Disciplina (%)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={perDiscEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
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
                <Card key={s.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {format(parseISO(s.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        {s.banca && <span className="ml-2 text-xs text-muted-foreground">({s.banca})</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {totalQ} questões · {totalC} acertos · <span className="font-medium text-primary">{pct}%</span>
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { removeSimulado(s.id); toast.info('Simulado removido'); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}
