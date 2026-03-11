import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Building2, BookOpen, RotateCcw, Target,
  Download, Upload, Plus, Trash2, Edit2,
  HelpCircle, AlertTriangle, Bell, Shield, Zap, Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { Discipline, DisciplineCategory, ProvaPhase, RevisionMark } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.08 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const CATEGORIES: { label: string; value: DisciplineCategory }[] = [
  { label: 'Exatas', value: 'exatas' },
  { label: 'Humanas', value: 'humanas' },
  { label: 'Jurídicas', value: 'juridicas' },
  { label: 'Mista', value: 'mista' },
];

const CATEGORY_COLORS: Record<DisciplineCategory, string> = {
  exatas: 'bg-primary/20 text-primary border-primary/30',
  humanas: 'bg-electric-blue/20 text-electric-blue border-electric-blue/30',
  juridicas: 'bg-warning/20 text-warning border-warning/30',
  mista: 'bg-sporty-orange/20 text-sporty-orange border-sporty-orange/30',
};

const REVISION_MARKS: { label: string; value: RevisionMark; description: string }[] = [
  { label: '24 horas', value: '24h', description: 'Revisão no dia seguinte ao estudo' },
  { label: '7 dias', value: '7d', description: 'Revisão uma semana após o estudo' },
  { label: '30 dias', value: '30d', description: 'Revisão um mês após o estudo' },
  { label: '60 dias', value: '60d', description: 'Revisão dois meses após o estudo' },
];

// ==================== CONTEST TAB ====================
function ContestTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const phases = settings.contest.phases || [{ name: 'P1', minPercent: 60 }];
  const totalMinPercent = settings.contest.totalMinPercent ?? 70;

  const update = (field: string, value: string | number) => {
    updateSettings({
      contest: { ...settings.contest, [field]: value },
    });
    toast.success('Salvo com sucesso!');
  };

  const updatePhases = (newPhases: ProvaPhase[]) => {
    updateSettings({
      contest: { ...settings.contest, phases: newPhases },
    });
  };

  const addPhase = () => {
    const newPhases = [...phases, { name: `P${phases.length + 1}`, minPercent: 60 }];
    updatePhases(newPhases);
    toast.success('Fase adicionada!');
  };

  const removePhase = (index: number) => {
    updatePhases(phases.filter((_, i) => i !== index));
    toast.success('Fase removida!');
  };

  const updatePhase = (index: number, field: keyof ProvaPhase, value: string | number) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], [field]: value };
    updatePhases(updated);
  };

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg gradient-neon">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            Dados do Concurso
          </CardTitle>
          <CardDescription>Informações gerais sobre o concurso que você está estudando.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="candidateName" className="text-xs uppercase tracking-wider text-muted-foreground">Seu Nome</Label>
              <Input
                id="candidateName"
                value={settings.contest.candidateName}
                onChange={(e) => update('candidateName', e.target.value)}
                placeholder="Ex: Maria Silva"
                className="glass border-border/30 focus:border-primary/50 focus:glow-neon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contestName" className="text-xs uppercase tracking-wider text-muted-foreground">Nome do Concurso</Label>
              <Input
                id="contestName"
                value={settings.contest.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ex: Auditor Fiscal da Receita Federal"
                className="glass border-border/30 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organ" className="text-xs uppercase tracking-wider text-muted-foreground">Órgão</Label>
              <Input
                id="organ"
                value={settings.contest.organ}
                onChange={(e) => update('organ', e.target.value)}
                placeholder="Ex: Receita Federal do Brasil"
                className="glass border-border/30 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate" className="text-xs uppercase tracking-wider text-muted-foreground">Data Prevista da Prova</Label>
              <Input
                id="examDate"
                type="date"
                value={settings.contest.examDate}
                onChange={(e) => update('examDate', e.target.value)}
                className="glass border-border/30 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vacancies" className="text-xs uppercase tracking-wider text-muted-foreground">Número de Vagas</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50 hover:glow-neon"
                  onClick={() => update('vacancies', Math.max(0, settings.contest.vacancies - 1))}
                >-</Button>
                <Input
                  id="vacancies"
                  type="number"
                  value={settings.contest.vacancies}
                  onChange={(e) => update('vacancies', Math.max(0, Number(e.target.value)))}
                  min={0}
                  className="w-20 text-center glass border-border/30"
                />
                <Button
                  variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50 hover:glow-neon"
                  onClick={() => update('vacancies', settings.contest.vacancies + 1)}
                >+</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fases da Prova */}
      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg gradient-blue">
                  <Target className="h-4 w-4 text-primary-foreground" />
                </div>
                Fases da Prova
              </CardTitle>
              <CardDescription>Configure as fases (P1, P2, P3…) e seus percentuais mínimos.</CardDescription>
            </div>
            <Button onClick={addPhase} size="sm" className="gap-1 gradient-neon text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Adicionar Fase
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {phases.map((phase, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.01, y: -1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="flex items-center gap-3 p-3 rounded-xl glass border-border/30 hover:border-primary/30 hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.2)] group"
            >
              <div className="space-y-1 flex-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nome da Fase</Label>
                <Input
                  value={phase.name}
                  onChange={(e) => updatePhase(i, 'name', e.target.value)}
                  className="h-8 text-sm glass border-border/30"
                  placeholder="Ex: P1"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Mínimo (%)</Label>
                <Input
                  type="number"
                  value={phase.minPercent}
                  onChange={(e) => updatePhase(i, 'minPercent', Number(e.target.value))}
                  min={0} max={100}
                  className="h-8 w-20 text-sm glass border-border/30"
                />
              </div>
              {phases.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8 mt-5"
                  onClick={() => removePhase(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </motion.div>
          ))}

          <Separator className="bg-border/30" />

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mínimo Geral (%)</Label>
            <Input
              type="number"
              value={totalMinPercent}
              onChange={(e) => update('totalMinPercent', Number(e.target.value))}
              min={0} max={100}
              className="w-24 glass border-border/30"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== DISCIPLINES TAB ====================
function DisciplinesTab() {
  const settings = useAppStore((s) => s.settings);
  const phases = settings.contest.phases || [{ name: 'P1', minPercent: 60 }];
  const disciplines = useAppStore((s) => s.disciplines);
  const addDiscipline = useAppStore((s) => s.addDiscipline);
  const updateDiscipline = useAppStore((s) => s.updateDiscipline);
  const removeDiscipline = useAppStore((s) => s.removeDiscipline);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'humanas' as DisciplineCategory,
    weight: 10,
    prova: 'P1' as string,
    defaultQuestions: 10,
  });

  const resetForm = () => {
    setForm({ name: '', category: 'humanas', weight: 10, prova: 'P1', defaultQuestions: 10 });
    setEditingId(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (d: Discipline) => {
    setForm({ name: d.name, category: d.category, weight: d.weight, prova: d.prova, defaultQuestions: d.defaultQuestions });
    setEditingId(d.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Informe o nome da disciplina.'); return; }
    if (editingId) {
      updateDiscipline(editingId, form);
      toast.success('Disciplina atualizada!');
    } else {
      const disc: Discipline = { id: crypto.randomUUID(), ...form, order: disciplines.length };
      addDiscipline(disc);
      toast.success('Disciplina adicionada!');
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => { removeDiscipline(id); toast.success('Disciplina removida!'); };

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg gradient-orange">
                  <BookOpen className="h-4 w-4 text-primary-foreground" />
                </div>
                Disciplinas
              </CardTitle>
              <CardDescription>{disciplines.length} disciplina{disciplines.length !== 1 ? 's' : ''} cadastrada{disciplines.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            <Button onClick={openNew} size="sm" className="gap-1 gradient-neon text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {disciplines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-2xl glass border-border/20 mb-4">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Você ainda não tem disciplinas cadastradas.
              </p>
              <Button onClick={openNew} variant="outline" className="gap-1 glass border-primary/30 hover:glow-neon">
                <Plus className="h-4 w-4" /> Cadastrar Primeira Disciplina
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {disciplines.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.01, y: -1 }}
                  className="flex items-center gap-3 rounded-xl glass border-border/30 p-3 hover:border-primary/30 hover:shadow-[0_0_15px_-5px_hsl(var(--primary)/0.2)] group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{d.name}</span>
                      <Badge variant="secondary" className={`text-[10px] border ${CATEGORY_COLORS[d.category]}`}>
                        {CATEGORIES.find((c) => c.value === d.category)?.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-border/40">
                        {d.prova}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Peso: {d.weight}%</span>
                      <span>Questões: {d.defaultQuestions}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(d)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-strong border-border/30 rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover disciplina?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover "{d.name}"? Todos os tópicos associados também serão removidos. Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="glass border-border/30">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md glass-strong border-border/30 rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg gradient-neon">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              {editingId ? 'Editar Disciplina' : 'Nova Disciplina'}
            </DialogTitle>
            <DialogDescription>
              {editingId ? 'Atualize as informações da disciplina.' : 'Preencha os dados da nova disciplina.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome da Disciplina</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Direito Administrativo"
                autoFocus
                className="glass border-border/30 focus:border-primary/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as DisciplineCategory })}>
                  <SelectTrigger className="glass border-border/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong border-border/30">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prova/Fase</Label>
                <Select value={form.prova} onValueChange={(v) => setForm({ ...form, prova: v })}>
                  <SelectTrigger className="glass border-border/30"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-strong border-border/30">
                    {phases.map((p) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                    {phases.length > 1 && <SelectItem value="todas">Todas</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Peso (%)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="glass-strong border-border/30">
                      <p className="text-xs max-w-48">Percentual de questões desta disciplina no edital.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30"
                    onClick={() => setForm({ ...form, weight: Math.max(0, form.weight - 1) })}>-</Button>
                  <Input type="number" value={form.weight} min={0} max={100}
                    onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                    className="w-16 text-center glass border-border/30" />
                  <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30"
                    onClick={() => setForm({ ...form, weight: Math.min(100, form.weight + 1) })}>+</Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Questões</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="glass-strong border-border/30">
                      <p className="text-xs max-w-48">Quantidade padrão de questões nos simulados.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30"
                    onClick={() => setForm({ ...form, defaultQuestions: Math.max(1, form.defaultQuestions - 1) })}>-</Button>
                  <Input type="number" value={form.defaultQuestions} min={1}
                    onChange={(e) => setForm({ ...form, defaultQuestions: Number(e.target.value) })}
                    className="w-16 text-center glass border-border/30" />
                  <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30"
                    onClick={() => setForm({ ...form, defaultQuestions: form.defaultQuestions + 1 })}>+</Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="glass border-border/30">Cancelar</Button>
            <Button onClick={handleSave} className="gradient-neon text-primary-foreground hover:opacity-90">{editingId ? 'Salvar Alterações' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ==================== REVISIONS TAB ====================
function RevisionsTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const toggleEnabled = (enabled: boolean) => {
    updateSettings({ revision: { ...settings.revision, enabled } });
    toast.success(enabled ? 'Revisões espaçadas ativadas!' : 'Revisões espaçadas desativadas!');
  };

  const toggleMark = (mark: RevisionMark) => {
    const current = settings.revision.marks;
    const next = current.includes(mark) ? current.filter((m) => m !== mark) : [...current, mark];
    updateSettings({ revision: { ...settings.revision, marks: next } });
    toast.success('Salvo com sucesso!');
  };

  const MARK_GRADIENTS = ['from-primary/15 to-primary/5', 'from-electric-blue/15 to-electric-blue/5', 'from-sporty-orange/15 to-sporty-orange/5', 'from-warning/15 to-warning/5'];

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg gradient-primary">
                  <RotateCcw className="h-4 w-4 text-primary-foreground" />
                </div>
                Revisões Espaçadas
              </CardTitle>
              <CardDescription>Configure os marcos de revisão para consolidar o aprendizado.</CardDescription>
            </div>
            <Switch checked={settings.revision.enabled} onCheckedChange={toggleEnabled} />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`space-y-3 ${!settings.revision.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {REVISION_MARKS.map((rm, i) => (
              <motion.div
                key={rm.value}
                whileHover={{ scale: 1.01 }}
                className={`flex items-center justify-between rounded-xl glass border-border/30 p-4 bg-gradient-to-r ${MARK_GRADIENTS[i]} hover:border-primary/30 group`}
              >
                <div>
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{rm.label}</p>
                  <p className="text-xs text-muted-foreground">{rm.description}</p>
                </div>
                <Checkbox
                  checked={settings.revision.marks.includes(rm.value)}
                  onCheckedChange={() => toggleMark(rm.value)}
                  className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </motion.div>
            ))}
          </div>
          {settings.revision.enabled && (
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              {settings.revision.marks.length} marco{settings.revision.marks.length !== 1 ? 's' : ''} ativo{settings.revision.marks.length !== 1 ? 's' : ''}.
              Disciplinas com revisão pendente aparecerão destacadas no painel inicial.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== GOALS TAB ====================
function GoalsTab() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const DAYS = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 },
  ];

  const updateGoal = (field: string, value: number) => {
    updateSettings({ goals: { ...settings.goals, [field]: value } });
    toast.success('Meta atualizada!');
  };

  const toggleDay = (day: number) => {
    const next = settings.studyDays.includes(day) ? settings.studyDays.filter((d) => d !== day) : [...settings.studyDays, day];
    updateSettings({ studyDays: next });
    toast.success('Salvo com sucesso!');
  };

  const updateWeeklyHours = (value: number) => {
    updateSettings({ weeklyHours: value, goals: { ...settings.goals, weeklyHours: value } });
    toast.success('Carga horária atualizada!');
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { toast.error('Permissão de notificações negada pelo navegador.'); return; }
    }
    updateSettings({ notificationsEnabled: enabled });
    toast.success(enabled ? 'Notificações ativadas!' : 'Notificações desativadas!');
  };

  const REMINDER_OPTIONS = [
    { label: '1 min', value: 1 },
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
  ];

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      {/* Notifications Card */}
      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 rounded-lg gradient-orange">
                  <Bell className="h-4 w-4 text-primary-foreground" />
                </div>
                Notificações e Lembretes
              </CardTitle>
              <CardDescription>Receba lembretes antes dos horários de estudo programados no ciclo.</CardDescription>
            </div>
            <Switch checked={settings.notificationsEnabled ?? false} onCheckedChange={handleToggleNotifications} />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`space-y-4 ${!settings.notificationsEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Avisar com antecedência de</Label>
              <div className="flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      updateSettings({ reminderMinutesBefore: opt.value });
                      toast.success(`Lembrete ajustado para ${opt.label} antes!`);
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                      (settings.reminderMinutesBefore ?? 5) === opt.value
                        ? 'border-primary bg-primary/15 text-primary glow-neon'
                        : 'border-border/40 text-muted-foreground hover:border-primary/50 glass'
                    }`}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Os lembretes serão enviados como notificações do navegador e toasts na aplicação, com base nos blocos de estudo do ciclo ativo.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg gradient-blue">
              <Target className="h-4 w-4 text-primary-foreground" />
            </div>
            Metas de Estudo
          </CardTitle>
          <CardDescription>Defina suas metas diárias e semanais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekly hours */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Carga Horária Semanal</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50"
                onClick={() => updateWeeklyHours(Math.max(1, settings.weeklyHours - 5))}>-</Button>
              <Input type="number" value={settings.weeklyHours} min={1} max={120}
                onChange={(e) => updateWeeklyHours(Number(e.target.value))}
                className="w-20 text-center font-bold glass border-border/30" />
              <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50"
                onClick={() => updateWeeklyHours(Math.min(120, settings.weeklyHours + 5))}>+</Button>
              <span className="text-sm text-muted-foreground">horas/semana</span>
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Daily questions */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta Diária de Questões</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50"
                onClick={() => updateGoal('dailyQuestions', Math.max(1, settings.goals.dailyQuestions - 5))}>-</Button>
              <Input type="number" value={settings.goals.dailyQuestions} min={1}
                onChange={(e) => updateGoal('dailyQuestions', Number(e.target.value))}
                className="w-20 text-center font-bold glass border-border/30" />
              <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50"
                onClick={() => updateGoal('dailyQuestions', settings.goals.dailyQuestions + 5)}>+</Button>
              <span className="text-sm text-muted-foreground">questões/dia</span>
            </div>
          </div>

          {/* Daily pages */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Meta Diária de Páginas Lidas</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50"
                onClick={() => updateGoal('dailyPages', Math.max(1, settings.goals.dailyPages - 5))}>-</Button>
              <Input type="number" value={settings.goals.dailyPages} min={1}
                onChange={(e) => updateGoal('dailyPages', Number(e.target.value))}
                className="w-20 text-center font-bold glass border-border/30" />
              <Button variant="outline" size="icon" className="h-9 w-9 glass border-border/30 hover:border-primary/50"
                onClick={() => updateGoal('dailyPages', settings.goals.dailyPages + 5)}>+</Button>
              <span className="text-sm text-muted-foreground">páginas/dia</span>
            </div>
          </div>

          <Separator className="bg-border/30" />

          {/* Study days */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dias de Estudo</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <motion.button
                  key={day.value}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleDay(day.value)}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-sm font-semibold transition-all ${
                    settings.studyDays.includes(day.value)
                      ? 'border-primary bg-primary/15 text-primary glow-neon'
                      : 'border-border/40 text-muted-foreground hover:border-primary/50 glass'
                  }`}
                >
                  {day.label}
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              {settings.studyDays.length} dias selecionados
              {settings.studyDays.length > 0 && settings.weeklyHours > 0 && (
                <> — média de {(settings.weeklyHours / settings.studyDays.length).toFixed(1)}h por dia</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== BACKUP TAB ====================
function BackupTab() {
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const resetAll = useAppStore((s) => s.resetAll);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meu-sprint-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup exportado com sucesso!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        JSON.parse(json);
        importData(json);
        toast.success('Dados importados com sucesso!');
      } catch {
        toast.error('Arquivo inválido. Verifique se é um backup válido do Meu Sprint Pro.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => { resetAll(); toast.success('Todos os dados foram apagados.'); };

  return (
    <motion.div variants={itemVariants} className="space-y-6">
      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg gradient-blue">
              <Download className="h-4 w-4 text-primary-foreground" />
            </div>
            Exportar e Importar Dados
          </CardTitle>
          <CardDescription>Faça backup dos seus dados ou restaure de um backup anterior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleExport} variant="outline" className="w-full h-24 flex-col gap-2 glass border-border/30 hover:border-primary/40 hover:glow-neon rounded-xl">
                <Download className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold">Exportar Backup</span>
                <span className="text-[10px] text-muted-foreground">Formato JSON</span>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" className="w-full h-24 flex-col gap-2 glass border-border/30 hover:border-electric-blue/40 hover:glow-blue rounded-xl"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-6 w-6 text-electric-blue" />
                <span className="text-sm font-semibold">Importar Backup</span>
                <span className="text-[10px] text-muted-foreground">Formato JSON</span>
              </Button>
            </motion.div>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-primary" />
            Os dados são salvos automaticamente. Use o backup para transferir entre dispositivos ou como segurança.
          </p>
        </CardContent>
      </Card>

      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg gradient-neon">
              <Play className="h-4 w-4 text-primary-foreground" />
            </div>
            Onboarding
          </CardTitle>
          <CardDescription>Reveja a apresentação inicial do Meu Sprint Pro.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2 glass border-border/30 hover:border-primary/40 hover:glow-neon rounded-xl"
            onClick={() => {
              useAppStore.getState().resetOnboarding();
              toast.success('Onboarding reiniciado! Você será redirecionado.');
            }}
          >
            <Play className="h-4 w-4 text-primary" />
            Re-exibir Onboarding
          </Button>
        </CardContent>
      </Card>

        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <div className="p-1.5 rounded-lg bg-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            Zona de Perigo
          </CardTitle>
          <CardDescription>Ações irreversíveis. Tenha cuidado!</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Apagar Todos os Dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-strong border-border/30 rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Apagar todos os dados?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza? Todos os seus dados serão permanentemente apagados, incluindo disciplinas, registros de estudo, ciclos, simulados e configurações. Essa ação não pode ser desfeita. Recomendamos fazer um backup antes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="glass border-border/30">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sim, Apagar Tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== MAIN SETTINGS PAGE ====================
export default function SettingsPage() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl gradient-neon glow-neon">
          <Settings className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seu concurso, disciplinas, metas e preferências.
          </p>
        </div>
      </div>

      <Tabs defaultValue="concurso" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-1 glass border-border/30 p-1 rounded-xl">
          <TabsTrigger value="concurso" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Building2 className="h-3.5 w-3.5" /> Concurso
          </TabsTrigger>
          <TabsTrigger value="disciplinas" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <BookOpen className="h-3.5 w-3.5" /> Disciplinas
          </TabsTrigger>
          <TabsTrigger value="revisoes" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <RotateCcw className="h-3.5 w-3.5" /> Revisões
          </TabsTrigger>
          <TabsTrigger value="metas" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Target className="h-3.5 w-3.5" /> Metas
          </TabsTrigger>
          <TabsTrigger value="backup" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Download className="h-3.5 w-3.5" /> Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="concurso"><ContestTab /></TabsContent>
        <TabsContent value="disciplinas"><DisciplinesTab /></TabsContent>
        <TabsContent value="revisoes"><RevisionsTab /></TabsContent>
        <TabsContent value="metas"><GoalsTab /></TabsContent>
        <TabsContent value="backup"><BackupTab /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
