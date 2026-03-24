import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarDays, Sparkles, Clock, BookOpen, AlertTriangle,
  RotateCcw, Check, ChevronDown, ChevronRight, Trash2, Settings2,
  Edit2, Plus, GripVertical, Download, Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { CycleBlock, CycleDiscipline, StudyCycle, Importance, UserSituation, Difficulty } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// ========== SCORE ALGORITHM ==========
// Weights: Peso no Edital (35%), Importância (25%), Situação (25%), Dificuldade (15%)
// cannotZero disciplines get a 20% boost

interface DisciplineScore {
  disciplineId: string;
  name: string;
  score: number;
  progressPercent: number;
  pendingTopics: number;
  totalTopics: number;
  weight: number;
  allocatedMinutes: number;
  cannotZero: boolean;
  category: string;
  breakdown: {
    weightScore: number;
    importanceScore: number;
    situationScore: number;
    difficultyScore: number;
  };
}

function computeScores(
  disciplines: { id: string; name: string; weight: number; cannotZero?: boolean }[],
  topics: { disciplineId: string; completed: boolean }[],
  cycleDisciplines: CycleDiscipline[],
  studyRecords: { disciplineId: string; durationSeconds: number }[],
): DisciplineScore[] {
  const importanceMap: Record<string, number> = { alta: 1.0, media: 0.6, baixa: 0.3 };
  const situationMap: Record<string, number> = { nunca_estudei: 1.0, razoavelmente: 0.5, ja_estudei: 0.2 };
  const difficultyMap: Record<string, number> = {
    muita_dificuldade: 1.0, leve_dificuldade: 0.75, normal: 0.5,
    leve_facilidade: 0.25, muita_facilidade: 0.1,
  };

  const maxWeight = Math.max(...disciplines.map((d) => d.weight), 1);

  const studyTimeByDisc: Record<string, number> = {};
  studyRecords.forEach((r) => {
    studyTimeByDisc[r.disciplineId] = (studyTimeByDisc[r.disciplineId] || 0) + r.durationSeconds;
  });

  return disciplines.map((d) => {
    const dTopics = topics.filter((t) => t.disciplineId === d.id);
    const total = dTopics.length;
    const completed = dTopics.filter((t) => t.completed).length;
    const pending = total - completed;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const cd = cycleDisciplines.find((c) => c.disciplineId === d.id);

    // Situação: configured or inferred from study records
    let situationFactor: number;
    if (cd) {
      situationFactor = situationMap[cd.situation] ?? 0.5;
    } else {
      const totalHours = (studyTimeByDisc[d.id] || 0) / 3600;
      if (totalHours === 0) situationFactor = 1.0;
      else if (totalHours < 5) situationFactor = 0.5;
      else situationFactor = 0.2;
    }

    const importanceFactor = cd ? (importanceMap[cd.importance] ?? 0.6) : 0.6;
    const difficultyFactor = cd ? (difficultyMap[cd.difficulty] ?? 0.5) : 0.5;
    const weightFactor = maxWeight > 0 ? d.weight / maxWeight : 0.5;

    // 4 variables: Peso 35%, Importância 25%, Situação 25%, Dificuldade 15%
    const weightScore = weightFactor * 0.35;
    const importanceScore = importanceFactor * 0.25;
    const situationScore = situationFactor * 0.25;
    const difficultyScore = difficultyFactor * 0.15;

    let score = weightScore + importanceScore + situationScore + difficultyScore;

    if (d.cannotZero) {
      score *= 1.2;
    }

    return {
      disciplineId: d.id,
      name: d.name,
      score,
      progressPercent,
      pendingTopics: pending,
      totalTopics: total,
      weight: d.weight,
      allocatedMinutes: 0,
      cannotZero: !!d.cannotZero,
      breakdown: { weightScore, importanceScore, situationScore, difficultyScore },
    };
  }).filter((d) => d.totalTopics > 0 || d.weight > 0);
}

function generateBlocks(
  scores: DisciplineScore[],
  totalWeeklyMinutes: number,
  daysCount: number,
): CycleBlock[] {
  if (scores.length === 0 || daysCount === 0) return [];

  const totalScore = scores.reduce((a, s) => a + s.score, 0);

  // Allocate minutes proportionally, ensuring total == totalWeeklyMinutes
  const rawAllocations = scores.map((s) => ({
    ...s,
    rawMinutes: (s.score / totalScore) * totalWeeklyMinutes,
  }));

  // Round to nearest 5min, minimum 30min per discipline
  let allocated = rawAllocations.map((s) => ({
    ...s,
    allocatedMinutes: Math.max(30, Math.round(s.rawMinutes / 5) * 5),
  }));

  // Adjust to exactly match totalWeeklyMinutes
  let currentTotal = allocated.reduce((a, s) => a + s.allocatedMinutes, 0);
  let diff = totalWeeklyMinutes - currentTotal;

  // Sort by score descending to adjust highest-priority disciplines first
  const sorted = [...allocated].sort((a, b) => b.score - a.score);
  let idx = 0;
  while (diff !== 0 && idx < sorted.length * 3) {
    const target = sorted[idx % sorted.length];
    const entry = allocated.find((a) => a.disciplineId === target.disciplineId)!;
    if (diff > 0) {
      const add = Math.min(diff, 5);
      entry.allocatedMinutes += add;
      diff -= add;
    } else {
      const sub = Math.min(-diff, 5);
      if (entry.allocatedMinutes - sub >= 30) {
        entry.allocatedMinutes -= sub;
        diff += sub;
      }
    }
    idx++;
  }

  // Generate blocks (30-120min each)
  const blocks: CycleBlock[] = [];
  let blockNum = 1;

  for (const disc of allocated.sort((a, b) => b.score - a.score)) {
    let remaining = disc.allocatedMinutes;
    while (remaining >= 30) {
      let duration: number;
      if (remaining >= 120) {
        duration = 90;
      } else if (remaining >= 60) {
        duration = Math.min(remaining, 90);
      } else {
        duration = remaining;
      }
      blocks.push({
        id: crypto.randomUUID(),
        number: blockNum++,
        disciplineId: disc.disciplineId,
        durationMinutes: duration,
      });
      remaining -= duration;
    }
  }

  // Smart reorder: alternate disciplines
  const reordered: CycleBlock[] = [];
  const pool = [...blocks];
  let lastDiscipline = '';
  let secondLastDiscipline = '';

  while (pool.length > 0) {
    let nextIdx = pool.findIndex((b) =>
      b.disciplineId !== lastDiscipline && b.disciplineId !== secondLastDiscipline
    );
    if (nextIdx < 0) {
      nextIdx = pool.findIndex((b) => b.disciplineId !== lastDiscipline);
    }
    if (nextIdx < 0) nextIdx = 0;

    const block = pool.splice(nextIdx, 1)[0];
    reordered.push({ ...block, number: reordered.length + 1 });
    secondLastDiscipline = lastDiscipline;
    lastDiscipline = block.disciplineId;
  }

  return reordered;
}

// ========== CONFIG DIALOG ==========
function GenerateDialog({
  open,
  onOpenChange,
  disciplines,
  topics,
  studyRecords,
  existingCycleDisciplines,
  settings,
  existingCycles,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disciplines: { id: string; name: string; weight: number; category: string; cannotZero?: boolean; prova?: string }[];
  topics: { disciplineId: string; completed: boolean }[];
  studyRecords: { disciplineId: string; durationSeconds: number }[];
  existingCycleDisciplines: CycleDiscipline[];
  settings: { weeklyHours: number; studyDays: number[] };
  existingCycles: StudyCycle[];
  onGenerate: (cycle: StudyCycle) => void;
}) {
  const nextNum = existingCycles.length + 1;
  const maxWeekEnd = existingCycles.length > 0 ? Math.max(...existingCycles.map((c) => c.weekEnd || 0), 0) : 0;

  const [weeklyHours, setWeeklyHours] = useState(settings.weeklyHours || 20);
  const [studyDays, setStudyDays] = useState<number[]>(settings.studyDays.length > 0 ? settings.studyDays : [1, 2, 3, 4, 5]);
  const [cycleName, setCycleName] = useState(`Ciclo ${nextNum}`);
  const [showConfig, setShowConfig] = useState(false);
  const [weekStart, setWeekStart] = useState(maxWeekEnd + 1);
  const [weekEnd, setWeekEnd] = useState(maxWeekEnd + 4);

  // Selected disciplines for this cycle
  const [selectedDiscIds, setSelectedDiscIds] = useState<string[]>(() =>
    disciplines.map((d) => d.id)
  );

  const toggleDisc = (id: string) => {
    setSelectedDiscIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllDiscs = () => setSelectedDiscIds(disciplines.map((d) => d.id));
  const deselectAllDiscs = () => setSelectedDiscIds([]);

  // Per-discipline config state
  const [discConfigs, setDiscConfigs] = useState<CycleDiscipline[]>(() => {
    return disciplines.map((d) => {
      const existing = existingCycleDisciplines.find((c) => c.disciplineId === d.id);
      return existing || {
        disciplineId: d.id,
        importance: 'media' as Importance,
        situation: 'razoavelmente' as UserSituation,
        difficulty: 'normal' as Difficulty,
      };
    });
  });

  const updateDiscConfig = (disciplineId: string, field: string, value: string) => {
    setDiscConfigs((prev) =>
      prev.map((c) => c.disciplineId === disciplineId ? { ...c, [field]: value } : c)
    );
  };

  const discsWithTopics = disciplines.filter((d) => {
    const isSelected = selectedDiscIds.includes(d.id);
    if (!isSelected) return false;
    const dTopics = topics.filter((t) => t.disciplineId === d.id);
    return dTopics.length > 0 || d.weight > 0;
  });

  const scores = useMemo(() =>
    computeScores(discsWithTopics, topics, discConfigs, studyRecords)
      .sort((a, b) => b.score - a.score),
    [discsWithTopics, topics, discConfigs, studyRecords]
  );

  const dailyMinutes = studyDays.length > 0 ? Math.round((weeklyHours * 60) / studyDays.length) : 0;

  const handleGenerate = () => {
    if (studyDays.length === 0) {
      toast.error('Selecione pelo menos um dia de estudo.');
      return;
    }
    if (selectedDiscIds.length === 0) {
      toast.error('Selecione pelo menos uma disciplina para o ciclo.');
      return;
    }
    if (scores.length === 0) {
      toast.error('Nenhuma disciplina com tópicos para gerar o cronograma.');
      return;
    }
    if (weekStart > weekEnd) {
      toast.error('A semana inicial deve ser menor ou igual à semana final.');
      return;
    }

    const blocks = generateBlocks(scores, weeklyHours * 60, studyDays.length);

    const cycle: StudyCycle = {
      id: crypto.randomUUID(),
      name: cycleName,
      disciplines: discConfigs.filter((dc) => selectedDiscIds.includes(dc.disciplineId)),
      blocks,
      weeklyHours,
      studyDays,
      createdAt: new Date().toISOString(),
      active: true,
      selectedDisciplineIds: selectedDiscIds,
      weekStart,
      weekEnd,
    };

    onGenerate(cycle);
    onOpenChange(false);
  };

  const toggleDay = (day: number) => {
    setStudyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-neon flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-neon-green-foreground" />
            </div>
            Gerar Cronograma Automático
          </DialogTitle>
          <DialogDescription>
            O algoritmo distribui o tempo com base em: Peso no Edital (35%), Importância (25%), Situação (25%) e Dificuldade (15%). O total de horas gerado será exatamente igual à carga semanal configurada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Weekly hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Horas semanais de estudo</Label>
              <Badge variant="secondary" className="text-xs rounded-full">{weeklyHours}h/semana</Badge>
            </div>
            <Slider
              value={[weeklyHours]}
              onValueChange={([v]) => setWeeklyHours(v)}
              min={5}
              max={80}
              step={1}
              className="w-full"
            />
          </div>

          {/* Study days */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dias de estudo</Label>
            <div className="flex gap-2">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                    studyDays.includes(i)
                      ? 'bg-primary text-primary-foreground border-primary shadow-neon'
                      : 'bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted hover:border-border'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            {studyDays.length > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ {Math.floor(dailyMinutes / 60)}h{String(dailyMinutes % 60).padStart(2, '0')}min por dia
              </p>
            )}
          </div>

          {/* Cycle name & week range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Nome do ciclo</Label>
              <input
                type="text"
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Semana inicial</Label>
              <input
                type="number"
                min={1}
                max={52}
                value={weekStart}
                onChange={(e) => setWeekStart(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Semana final</Label>
              <input
                type="number"
                min={1}
                max={52}
                value={weekEnd}
                onChange={(e) => setWeekEnd(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Este ciclo será utilizado nas semanas {weekStart} a {weekEnd} ({weekEnd - weekStart + 1} semana{weekEnd - weekStart !== 0 ? 's' : ''}).
          </p>

          {/* Discipline selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Disciplinas do ciclo</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllDiscs}>Todas</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={deselectAllDiscs}>Nenhuma</Button>
              </div>
            </div>
            <div className="rounded-xl border border-border/30 glass p-3 max-h-[180px] overflow-y-auto space-y-1">
              {disciplines.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedDiscIds.includes(d.id)}
                    onCheckedChange={() => toggleDisc(d.id)}
                  />
                  <span className="text-sm flex-1 truncate">{d.name}</span>
                  <Badge variant="outline" className="text-[10px] border-border/40">{d.prova || '—'}</Badge>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedDiscIds.length} de {disciplines.length} disciplinas selecionadas
            </p>
          </div>

          {/* Per-discipline configuration */}
          {discsWithTopics.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Configuração por Disciplina</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowConfig(!showConfig)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {showConfig ? 'Ocultar' : 'Personalizar'}
                </Button>
              </div>

              {showConfig && (
                <div className="rounded-xl border border-border/30 glass p-3 space-y-3 max-h-[250px] overflow-y-auto">
                  {discsWithTopics.map((d) => {
                    const config = discConfigs.find((c) => c.disciplineId === d.id);
                    return (
                      <div key={d.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate flex-1">{d.name}</span>
                          {(d as any).cannotZero && (
                            <Badge variant="destructive" className="text-[9px] shrink-0">Não pode zerar</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Importância</Label>
                            <Select
                              value={config?.importance || 'media'}
                              onValueChange={(v) => updateDiscConfig(d.id, 'importance', v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="alta">Alta</SelectItem>
                                <SelectItem value="media">Média</SelectItem>
                                <SelectItem value="baixa">Baixa</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Situação</Label>
                            <Select
                              value={config?.situation || 'razoavelmente'}
                              onValueChange={(v) => updateDiscConfig(d.id, 'situation', v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nunca_estudei">Nunca estudei</SelectItem>
                                <SelectItem value="razoavelmente">Razoável</SelectItem>
                                <SelectItem value="ja_estudei">Já estudei</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Dificuldade</Label>
                            <Select
                              value={config?.difficulty || 'normal'}
                              onValueChange={(v) => updateDiscConfig(d.id, 'difficulty', v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="muita_dificuldade">Muita dificuldade</SelectItem>
                                <SelectItem value="leve_dificuldade">Leve dificuldade</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="leve_facilidade">Leve facilidade</SelectItem>
                                <SelectItem value="muita_facilidade">Muita facilidade</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Separator />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Priority preview */}
          {scores.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade calculada</Label>
              <div className="max-h-[200px] overflow-y-auto rounded-xl border border-border/30 glass p-3 space-y-2">
                <TooltipProvider delayDuration={200}>
                {scores.map((s, i) => (
                  <Tooltip key={s.disciplineId}>
                    <TooltipTrigger asChild>
                      <div className="space-y-1 cursor-pointer rounded-md px-1 py-0.5 hover:bg-accent/40 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm truncate flex items-center gap-1.5">
                                {s.name}
                                {s.cannotZero && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                {Math.round(s.score * 100)}pts • {s.progressPercent}% feito
                              </span>
                            </div>
                            <Progress value={Math.round(s.score * 100)} className="h-1.5 mt-1" />
                          </div>
                        </div>
                        {/* Score breakdown mini bar */}
                        <div className="flex gap-0.5 ml-7 h-1 rounded-full overflow-hidden">
                          <div className="bg-primary" style={{ width: `${s.breakdown.weightScore / 0.35 * 35}%` }} />
                          <div className="bg-chart-1" style={{ width: `${s.breakdown.importanceScore / 0.25 * 25}%` }} />
                          <div className="bg-chart-4" style={{ width: `${s.breakdown.situationScore / 0.25 * 25}%` }} />
                          <div className="bg-destructive" style={{ width: `${s.breakdown.difficultyScore / 0.15 * 15}%` }} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="w-64 p-3 space-y-2">
                      <p className="font-semibold text-sm">{s.name}</p>
                      <Separator />
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Peso no Edital (35%)</span>
                          <span className="font-medium">{(s.breakdown.weightScore * 100).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-chart-1" /> Importância (25%)</span>
                          <span className="font-medium">{(s.breakdown.importanceScore * 100).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-chart-4" /> Situação (25%)</span>
                          <span className="font-medium">{(s.breakdown.situationScore * 100).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> Dificuldade (15%)</span>
                          <span className="font-medium">{(s.breakdown.difficultyScore * 100).toFixed(1)}</span>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-xs">
                        <span>Score total</span>
                        <span className="font-bold">{(s.score * 100).toFixed(1)} pts{s.cannotZero ? ' (+20% bônus)' : ''}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso edital</span>
                        <span>{s.pendingTopics} pendentes de {s.totalTopics}</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
                </TooltipProvider>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Peso 35%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-1" /> Importância 25%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-chart-4" /> Situação 25%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Dificuldade 15%</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleGenerate} className="gap-2 rounded-xl bg-primary text-primary-foreground font-bold" disabled={scores.length === 0}>
            <Sparkles className="h-4 w-4" />
            Gerar Cronograma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== EDIT CYCLE DIALOG ==========
function EditCycleDialog({
  open,
  onOpenChange,
  cycle,
  allDisciplines,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cycle: StudyCycle;
  allDisciplines: { id: string; name: string; prova?: string }[];
  onSave: (updates: Partial<StudyCycle>) => void;
}) {
  const [cycleName, setCycleName] = useState(cycle.name);
  const [weekStart, setWeekStart] = useState(cycle.weekStart || 1);
  const [weekEnd, setWeekEnd] = useState(cycle.weekEnd || 4);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    cycle.selectedDisciplineIds || cycle.blocks.map((b) => b.disciplineId).filter((v, i, a) => a.indexOf(v) === i)
  );

  const toggleDisc = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (weekStart > weekEnd) {
      toast.error('A semana inicial deve ser menor ou igual à semana final.');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos uma disciplina.');
      return;
    }
    // Remove blocks of deselected disciplines
    const filteredBlocks = cycle.blocks
      .filter((b) => selectedIds.includes(b.disciplineId))
      .map((b, i) => ({ ...b, number: i + 1 }));
    const filteredDisciplines = cycle.disciplines.filter((d) => selectedIds.includes(d.disciplineId));

    onSave({
      name: cycleName,
      weekStart,
      weekEnd,
      selectedDisciplineIds: selectedIds,
      blocks: filteredBlocks,
      disciplines: filteredDisciplines,
    });
    onOpenChange(false);
    toast.success('Ciclo atualizado!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto glass border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" />
            Editar Ciclo
          </DialogTitle>
          <DialogDescription>Altere nome, semanas e disciplinas do ciclo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Nome do ciclo</Label>
            <input
              type="text"
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Week range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Semana inicial</Label>
              <input
                type="number"
                min={1}
                max={52}
                value={weekStart}
                onChange={(e) => setWeekStart(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm font-medium">Semana final</Label>
              <input
                type="number"
                min={1}
                max={52}
                value={weekEnd}
                onChange={(e) => setWeekEnd(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Semanas {weekStart} a {weekEnd} ({weekEnd - weekStart + 1} semana{weekEnd - weekStart !== 0 ? 's' : ''})
          </p>

          {/* Discipline selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Disciplinas</Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(allDisciplines.map((d) => d.id))}>Todas</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds([])}>Nenhuma</Button>
              </div>
            </div>
            <div className="rounded-xl border border-border/30 glass p-3 max-h-[200px] overflow-y-auto space-y-1">
              {allDisciplines.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.includes(d.id)}
                    onCheckedChange={() => toggleDisc(d.id)}
                  />
                  <span className="text-sm flex-1 truncate">{d.name}</span>
                  <Badge variant="outline" className="text-[10px] border-border/40">{d.prova || '—'}</Badge>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} de {allDisciplines.length} disciplinas selecionadas
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={handleSave} className="gap-2 rounded-xl bg-primary text-primary-foreground font-bold">
            <Check className="h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== CYCLE VIEW ==========
function CycleView({
  cycle,
  disciplines,
  topics,
  onDelete,
  onActivate,
  onUpdateBlocks,
  onUpdateCycle,
  onDuplicate,
}: {
  cycle: StudyCycle;
  disciplines: { id: string; name: string; prova?: string }[];
  topics: { disciplineId: string; completed: boolean }[];
  onDelete: () => void;
  onActivate: () => void;
  onUpdateBlocks: (blocks: CycleBlock[]) => void;
  onUpdateCycle: (updates: Partial<StudyCycle>) => void;
  onDuplicate: () => void;
}) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const getDisciplineName = (id: string) => disciplines.find((d) => d.id === id)?.name || 'Disciplina';

  const dailyBlocks = useMemo(() => {
    const days: CycleBlock[][] = [];
    if (cycle.studyDays.length === 0) return days;
    const dailyMinutes = Math.round((cycle.weeklyHours * 60) / cycle.studyDays.length);
    let currentDay: CycleBlock[] = [];
    let currentDayMinutes = 0;
    for (const block of cycle.blocks) {
      if (currentDayMinutes + block.durationMinutes > dailyMinutes + 30 && currentDay.length > 0) {
        days.push(currentDay);
        currentDay = [];
        currentDayMinutes = 0;
      }
      currentDay.push(block);
      currentDayMinutes += block.durationMinutes;
    }
    if (currentDay.length > 0) days.push(currentDay);
    return days;
  }, [cycle]);

  const totalMinutes = cycle.blocks.reduce((a, b) => a + b.durationMinutes, 0);

  const discSummary = useMemo(() => {
    const map: Record<string, number> = {};
    cycle.blocks.forEach((b) => {
      map[b.disciplineId] = (map[b.disciplineId] || 0) + b.durationMinutes;
    });
    return Object.entries(map)
      .map(([id, mins]) => ({ name: getDisciplineName(id), minutes: mins }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [cycle.blocks, disciplines]);

  const updateBlock = (blockId: string, updates: Partial<CycleBlock>) => {
    const newBlocks = cycle.blocks.map((b) =>
      b.id === blockId ? { ...b, ...updates } : b
    );
    onUpdateBlocks(newBlocks);
  };

  const removeBlock = (blockId: string) => {
    const newBlocks = cycle.blocks
      .filter((b) => b.id !== blockId)
      .map((b, i) => ({ ...b, number: i + 1 }));
    onUpdateBlocks(newBlocks);
    setEditingBlockId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const allBlocks = [...cycle.blocks];
    const oldIndex = allBlocks.findIndex((b) => b.id === active.id);
    const newIndex = allBlocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(allBlocks, oldIndex, newIndex).map((b, i) => ({ ...b, number: i + 1 }));
    onUpdateBlocks(reordered);
  };

  const exportToPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.text(cycle.name, pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(10);
    doc.text(
      `${cycle.weeklyHours}h/semana • ${cycle.studyDays.map((d) => DAY_NAMES[d]).join(', ')} • ${cycle.blocks.length} blocos`,
      pageWidth / 2, y, { align: 'center' }
    );
    y += 10;

    // Time distribution
    doc.setFontSize(12);
    doc.text('Distribuição de Tempo', 14, y);
    y += 6;
    doc.setFontSize(9);
    for (const d of discSummary) {
      const h = Math.floor(d.minutes / 60);
      const m = d.minutes % 60;
      const pct = Math.round((d.minutes / totalMinutes) * 100);
      doc.text(`• ${d.name}: ${h}h${String(m).padStart(2, '0')}min (${pct}%)`, 16, y);
      y += 5;
      if (y > 275) { doc.addPage(); y = 20; }
    }
    y += 4;

    // Daily schedule
    const sortedDays = [...cycle.studyDays].sort((a, b) => ((a === 0 ? 7 : a) - (b === 0 ? 7 : b)));
    for (let dayIdx = 0; dayIdx < dailyBlocks.length; dayIdx++) {
      const dayBlocksArr = dailyBlocks[dayIdx];
      const dayName = sortedDays[dayIdx] !== undefined
        ? DAY_FULL[sortedDays[dayIdx]]
        : `Dia ${dayIdx + 1}`;
      const dayMinutes = dayBlocksArr.reduce((a, b) => a + b.durationMinutes, 0);

      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFontSize(11);
      doc.text(`${dayName} — ${Math.floor(dayMinutes / 60)}h${String(dayMinutes % 60).padStart(2, '0')}min`, 14, y);
      y += 2;
      doc.setDrawColor(200);
      doc.line(14, y, pageWidth - 14, y);
      y += 5;

      doc.setFontSize(9);
      for (let bi = 0; bi < dayBlocksArr.length; bi++) {
        const block = dayBlocksArr[bi];
        doc.text(`B${bi + 1}  ${getDisciplineName(block.disciplineId)}`, 18, y);
        doc.text(`${block.durationMinutes}min`, pageWidth - 18, y, { align: 'right' });
        y += 5;
        if (y > 275) { doc.addPage(); y = 20; }
      }
      y += 4;
    }

    doc.save(`${cycle.name.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const addBlock = () => {
    const defaultDisc = disciplines[0]?.id || '';
    const newBlock: CycleBlock = {
      id: crypto.randomUUID(),
      number: cycle.blocks.length + 1,
      disciplineId: defaultDisc,
      durationMinutes: 60,
    };
    onUpdateBlocks([...cycle.blocks, newBlock]);
    setEditingBlockId(newBlock.id);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.005, y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
    <Card className={`glass border-border/30 hover:border-primary/30 hover:shadow-neon transition-all duration-300 ${cycle.active ? 'border-primary/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{cycle.name}</CardTitle>
            {cycle.active && <Badge className="text-[10px] rounded-full bg-primary/20 text-primary border-primary/30">Ativo</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {!cycle.active && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-xl border-border/40 hover:border-primary/40" onClick={onActivate}>
                <Check className="h-3 w-3" /> Ativar
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => setEditDialogOpen(true)} title="Editar ciclo">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={onDuplicate} title="Duplicar ciclo">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={exportToPdf} title="Exportar PDF">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs font-mono">
          {cycle.weeklyHours}h/semana • {cycle.studyDays.map((d) => DAY_NAMES[d]).join(', ')} • {cycle.blocks.length} blocos • {Math.floor(totalMinutes / 60)}h{String(totalMinutes % 60).padStart(2, '0')}min total
          {cycle.weekStart && cycle.weekEnd && (
            <span> • Semanas {cycle.weekStart}–{cycle.weekEnd}</span>
          )}
        </CardDescription>
        {cycle.selectedDisciplineIds && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {cycle.selectedDisciplineIds.length} disciplinas: {cycle.selectedDisciplineIds.map((id) => disciplines.find((d) => d.id === id)?.name).filter(Boolean).join(', ')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Distribuição de tempo</Label>
          {discSummary.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="truncate max-w-[60%]">{d.name}</span>
              <span className="text-muted-foreground text-xs">
                {Math.floor(d.minutes / 60)}h{String(d.minutes % 60).padStart(2, '0')}min
                ({Math.round((d.minutes / totalMinutes) * 100)}%)
              </span>
            </div>
          ))}
        </div>

        <Separator />

        <Accordion type="multiple" className="space-y-1">
          {dailyBlocks.map((dayBlocks, dayIdx) => {
            const sortedStudyDays = [...cycle.studyDays].sort((a, b) => ((a === 0 ? 7 : a) - (b === 0 ? 7 : b)));
            const dayName = sortedStudyDays[dayIdx] !== undefined
              ? DAY_FULL[sortedStudyDays[dayIdx]]
              : `Dia ${dayIdx + 1}`;
            const dayMinutes = dayBlocks.reduce((a, b) => a + b.durationMinutes, 0);

            return (
              <AccordionItem key={dayIdx} value={`day-${dayIdx}`} className="border border-border/30 rounded-xl px-3 glass">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{dayName}</span>
                    <Badge variant="outline" className="text-[10px] rounded-full border-border/40">
                      {dayBlocks.length} blocos • {Math.floor(dayMinutes / 60)}h{String(dayMinutes % 60).padStart(2, '0')}min
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={dayBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {dayBlocks.map((block, bi) => (
                          <SortableBlock
                            key={block.id}
                            block={block}
                            index={bi}
                            isEditing={editingBlockId === block.id}
                            disciplines={disciplines}
                            getDisciplineName={getDisciplineName}
                            onEdit={() => setEditingBlockId(block.id)}
                            onStopEdit={() => setEditingBlockId(null)}
                            onUpdate={(updates) => updateBlock(block.id, updates)}
                            onRemove={() => removeBlock(block.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs rounded-xl border-border/40 hover:border-primary/40" onClick={addBlock}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar Bloco
        </Button>
      </CardContent>
    </Card>
    <EditCycleDialog
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      cycle={cycle}
      allDisciplines={disciplines}
      onSave={onUpdateCycle}
    />
    </motion.div>
  );
}

// ========== SORTABLE BLOCK ==========
function SortableBlock({
  block,
  index,
  isEditing,
  disciplines,
  getDisciplineName,
  onEdit,
  onStopEdit,
  onUpdate,
  onRemove,
}: {
  block: CycleBlock;
  index: number;
  isEditing: boolean;
  disciplines: { id: string; name: string }[];
  getDisciplineName: (id: string) => string;
  onEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<CycleBlock>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl bg-muted/20 glass border border-border/20 px-3 py-2 hover:border-primary/20 transition-all">
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8 shrink-0">B{index + 1}</span>
            <Select value={block.disciplineId} onValueChange={(v) => onUpdate({ disciplineId: v })}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {disciplines.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={onRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={onStopEdit}>
              <Check className="h-3.5 w-3.5 text-primary" />
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-8">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <Slider
              value={[block.durationMinutes]}
              onValueChange={([v]) => onUpdate({ durationMinutes: v })}
              min={15} max={180} step={15}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right shrink-0">{block.durationMinutes}min</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground shrink-0 touch-none">
            <GripVertical className="h-4 w-4" />
          </button>
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onEdit}
            title="Clique para editar"
          >
            <span className="text-xs text-muted-foreground w-6 shrink-0">B{index + 1}</span>
            <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm flex-1 truncate">{getDisciplineName(block.disciplineId)}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              {block.durationMinutes}min
            </div>
            <Edit2 className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}

// ========== MAIN PAGE ==========
// ========== CYCLES TIMELINE ==========
const TIMELINE_COLORS = [
  'bg-primary', 'bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5',
];

function CyclesTimeline({ cycles, disciplines }: { cycles: StudyCycle[]; disciplines: { id: string; name: string }[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sortedCycles = [...cycles]
    .filter((c) => c.weekStart && c.weekEnd)
    .sort((a, b) => (a.weekStart || 0) - (b.weekStart || 0));

  if (sortedCycles.length === 0) return null;

  const minWeek = Math.min(...sortedCycles.map((c) => c.weekStart || 1));
  const maxWeek = Math.max(...sortedCycles.map((c) => c.weekEnd || 1));
  const totalWeeks = maxWeek - minWeek + 1;
  const weeks = Array.from({ length: totalWeeks }, (_, i) => minWeek + i);
  const getDisciplineName = (id: string) => disciplines.find((d) => d.id === id)?.name || 'Disciplina';

  return (
    <Card className="glass border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Timeline de Ciclos
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {/* Week labels */}
          <div className="flex">
            <div className="w-28 shrink-0" />
            <div className="flex-1 flex">
              {weeks.map((w) => (
                <div key={w} className="flex-1 text-center text-[10px] text-muted-foreground font-mono" style={{ minWidth: 0 }}>
                  S{w}
                </div>
              ))}
            </div>
          </div>

          {/* Cycle bars */}
          {sortedCycles.map((cycle, idx) => {
            const startOffset = ((cycle.weekStart || 1) - minWeek) / totalWeeks * 100;
            const width = ((cycle.weekEnd || 1) - (cycle.weekStart || 1) + 1) / totalWeeks * 100;
            const colorClass = TIMELINE_COLORS[idx % TIMELINE_COLORS.length];
            const isExpanded = expandedId === cycle.id;
            const totalMinutes = cycle.blocks.reduce((a, b) => a + b.durationMinutes, 0);

            // Discipline summary for expanded view
            const discMap: Record<string, number> = {};
            cycle.blocks.forEach((b) => { discMap[b.disciplineId] = (discMap[b.disciplineId] || 0) + b.durationMinutes; });
            const discSummary = Object.entries(discMap)
              .map(([id, mins]) => ({ name: getDisciplineName(id), minutes: mins }))
              .sort((a, b) => b.minutes - a.minutes);

            return (
              <div key={cycle.id} className="space-y-0">
                <div
                  className="flex items-center gap-0 cursor-pointer group"
                  onClick={() => setExpandedId(isExpanded ? null : cycle.id)}
                >
                  <div className="w-28 shrink-0 truncate text-xs font-medium pr-2 text-right flex items-center justify-end gap-1">
                    {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    {cycle.name}
                  </div>
                  <div className="flex-1 relative h-7 rounded-lg bg-muted/20 border border-border/20 group-hover:border-primary/30 transition-colors">
                    <div
                      className={`absolute top-0 h-full rounded-lg ${colorClass} opacity-80 flex items-center justify-center transition-all group-hover:opacity-100`}
                      style={{ left: `${startOffset}%`, width: `${width}%` }}
                    >
                      <span className="text-[10px] font-bold text-primary-foreground truncate px-1">
                        S{cycle.weekStart}–S{cycle.weekEnd}
                      </span>
                    </div>
                    {cycle.active && (
                      <Badge className="absolute -top-2 -right-1 text-[8px] h-4 rounded-full bg-primary/90 text-primary-foreground border-0">
                        Ativo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-28 mt-1 rounded-xl border border-border/20 glass p-3 space-y-2"
                  >
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{cycle.weeklyHours}h/semana</span>
                      <span>{cycle.blocks.length} blocos</span>
                      <span>{Math.floor(totalMinutes / 60)}h{String(totalMinutes % 60).padStart(2, '0')}min total</span>
                      <span>{cycle.studyDays.map((d) => DAY_NAMES[d]).join(', ')}</span>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Disciplinas</p>
                      {discSummary.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[65%]">{d.name}</span>
                          <span className="text-muted-foreground">
                            {Math.floor(d.minutes / 60)}h{String(d.minutes % 60).padStart(2, '0')}min
                            ({Math.round((d.minutes / totalMinutes) * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {sortedCycles.map((cycle, idx) => (
              <div key={cycle.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className={`w-2.5 h-2.5 rounded-sm ${TIMELINE_COLORS[idx % TIMELINE_COLORS.length]}`} />
                <span>{cycle.name}: {(cycle.weekEnd || 0) - (cycle.weekStart || 0) + 1} sem • {cycle.selectedDisciplineIds?.length || '?'} disc</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== MAIN PAGE ==========
export default function Planning() {
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const studyRecords = useAppStore((s) => s.studyRecords);
  const cycles = useAppStore((s) => s.cycles);
  const settings = useAppStore((s) => s.settings);
  const { addCycle, removeCycle, setActiveCycle, updateCycle } = useAppStore();
  const [generateOpen, setGenerateOpen] = useState(false);

  const activeCycle = cycles.find((c) => c.active);
  const activeCycleDisciplines = activeCycle?.disciplines || [];

  const handleGenerate = (cycle: StudyCycle) => {
    // Deactivate others
    cycles.forEach((c) => {
      if (c.active) setActiveCycle(cycle.id);
    });
    addCycle(cycle);
    setActiveCycle(cycle.id);
    toast.success(`Cronograma "${cycle.name}" gerado com ${cycle.blocks.length} blocos!`);
  };

  const handleDelete = (id: string) => {
    removeCycle(id);
    toast.success('Ciclo removido.');
  };

  const handleDuplicate = (cycle: StudyCycle) => {
    const maxWeekEnd = Math.max(...cycles.map((c) => c.weekEnd || 0), 0);
    const weekSpan = (cycle.weekEnd || 1) - (cycle.weekStart || 1) + 1;
    const newCycle: StudyCycle = {
      ...cycle,
      id: crypto.randomUUID(),
      name: `${cycle.name} (cópia)`,
      active: false,
      createdAt: new Date().toISOString(),
      weekStart: maxWeekEnd + 1,
      weekEnd: maxWeekEnd + weekSpan,
      blocks: cycle.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };
    addCycle(newCycle);
    toast.success(`Ciclo "${newCycle.name}" duplicado!`);
  };

  const hasDisciplinesWithTopics = disciplines.some((d) =>
    topics.some((t) => t.disciplineId === d.id)
  );

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <div className="h-8 w-8 rounded-xl gradient-neon flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-neon-green-foreground" />
            </div>
            Planejamento & Ciclos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere cronogramas de estudo otimizados baseados no seu progresso.
          </p>
        </div>
        <Button
          onClick={() => setGenerateOpen(true)}
          className="gap-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90"
          disabled={!hasDisciplinesWithTopics && disciplines.length === 0}
        >
          <Sparkles className="h-4 w-4" />
          Gerar Cronograma
        </Button>
      </div>

      {/* Active cycle summary */}
      {activeCycle && (
        <Card className="glass border-primary/20 bg-gradient-to-r from-neon-green/10 to-neon-green/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-neon flex items-center justify-center shadow-neon">
                <CalendarDays className="h-5 w-5 text-neon-green-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Ciclo ativo: {activeCycle.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {activeCycle.weeklyHours}h/semana • {activeCycle.blocks.length} blocos •{' '}
                  {activeCycle.studyDays.map((d) => DAY_NAMES[d]).join(', ')}
                  {activeCycle.weekStart && activeCycle.weekEnd && ` • Semanas ${activeCycle.weekStart}–${activeCycle.weekEnd}`}
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border/40 hover:border-primary/40" onClick={() => setGenerateOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" /> Regenerar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline visualization */}
      {cycles.length > 0 && cycles.some((c) => c.weekStart && c.weekEnd) && (
        <CyclesTimeline cycles={cycles} disciplines={disciplines} />
      )}

      {/* Cycles list */}
      {cycles.length > 0 ? (
        <div className="space-y-4">
          {cycles
            .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
            .map((cycle) => (
              <CycleView
                key={cycle.id}
                cycle={cycle}
                disciplines={disciplines}
                topics={topics}
                onDelete={() => handleDelete(cycle.id)}
                onActivate={() => setActiveCycle(cycle.id)}
                onUpdateBlocks={(blocks) => updateCycle(cycle.id, { blocks })}
                onUpdateCycle={(updates) => updateCycle(cycle.id, updates)}
                onDuplicate={() => handleDuplicate(cycle)}
              />
            ))}
        </div>
      ) : (
        <Card className="border-dashed glass border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-neon flex items-center justify-center mb-4 shadow-neon">
              <CalendarDays className="h-8 w-8 text-neon-green-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhum cronograma criado</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              {hasDisciplinesWithTopics
                ? 'Gere um cronograma automático baseado no progresso do seu edital verticalizado.'
                : 'Importe seu edital verticalizado primeiro para gerar um cronograma otimizado.'
              }
            </p>
            {hasDisciplinesWithTopics ? (
              <Button onClick={() => setGenerateOpen(true)} className="gap-2 rounded-xl bg-primary text-primary-foreground font-bold">
                <Sparkles className="h-4 w-4" /> Gerar Cronograma
              </Button>
            ) : (
              <Button variant="outline" asChild className="rounded-xl border-border/40 hover:border-primary/40">
                <a href="/edital">Ir para Edital Verticalizado</a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generate Dialog */}
      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        disciplines={disciplines}
        topics={topics}
        studyRecords={studyRecords}
        existingCycleDisciplines={activeCycleDisciplines}
        settings={settings}
        existingCycles={cycles}
        onGenerate={handleGenerate}
      />
    </motion.div>
  );
}
