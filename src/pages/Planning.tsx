import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays, Sparkles, Clock, BookOpen, AlertTriangle,
  RotateCcw, Check, ChevronDown, ChevronRight, Trash2, Settings2,
  Edit2, Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
// Weights: Peso no Edital (35%), Importância (25%), Situação/Conhecimento (15%),
// Progresso no Edital Verticalizado (15%), Dificuldade (10%)
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
  breakdown: {
    weightScore: number;
    importanceScore: number;
    situationScore: number;
    progressScore: number;
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

  // Calculate total study time per discipline for auto-situation inference
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

    // Invert progress: less progress = higher priority
    const progressFactor = total > 0 ? 1 - (completed / total) : 0.5;

    const cd = cycleDisciplines.find((c) => c.disciplineId === d.id);

    // If user hasn't configured, try to infer situation from study records
    let situationFactor: number;
    if (cd) {
      situationFactor = situationMap[cd.situation] ?? 0.5;
    } else {
      const totalHours = (studyTimeByDisc[d.id] || 0) / 3600;
      if (totalHours === 0) situationFactor = 1.0;       // nunca_estudei
      else if (totalHours < 5) situationFactor = 0.5;    // razoavelmente
      else situationFactor = 0.2;                          // ja_estudei
    }

    const importanceFactor = cd ? (importanceMap[cd.importance] ?? 0.6) : 0.6;
    const difficultyFactor = cd ? (difficultyMap[cd.difficulty] ?? 0.5) : 0.5;
    const weightFactor = maxWeight > 0 ? d.weight / maxWeight : 0.5;

    // Combined score with documented weights
    const weightScore = weightFactor * 0.35;
    const importanceScore = importanceFactor * 0.25;
    const situationScore = situationFactor * 0.15;
    const progressScore = progressFactor * 0.15;
    const difficultyScore = difficultyFactor * 0.10;

    let score = weightScore + importanceScore + situationScore + progressScore + difficultyScore;

    // Boost for cannotZero disciplines
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
      breakdown: { weightScore, importanceScore, situationScore, progressScore, difficultyScore },
    };
  }).filter((d) => d.totalTopics > 0 || d.weight > 0);
}

function generateBlocks(
  scores: DisciplineScore[],
  totalMinutesPerDay: number,
  daysCount: number,
): CycleBlock[] {
  if (scores.length === 0) return [];

  const totalMinutes = totalMinutesPerDay * daysCount;
  const totalScore = scores.reduce((a, s) => a + s.score, 0);

  // Allocate minutes proportionally to score, minimum 30min
  const allocated = scores.map((s) => ({
    ...s,
    allocatedMinutes: Math.max(30, Math.round((s.score / totalScore) * totalMinutes)),
  }));

  // Generate blocks (30-120min each)
  const blocks: CycleBlock[] = [];
  let blockNum = 1;

  for (const disc of allocated.sort((a, b) => b.score - a.score)) {
    let remaining = disc.allocatedMinutes;
    while (remaining >= 30) {
      // Prefer blocks of 60-90min for optimal study sessions
      let duration: number;
      if (remaining >= 120) {
        duration = 90; // Optimal block size
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

  // Smart reorder: alternate disciplines, distribute across days evenly
  const reordered: CycleBlock[] = [];
  const pool = [...blocks];
  let lastDiscipline = '';
  let secondLastDiscipline = '';

  while (pool.length > 0) {
    // Try to find a block that's different from last 2 disciplines
    let nextIdx = pool.findIndex((b) =>
      b.disciplineId !== lastDiscipline && b.disciplineId !== secondLastDiscipline
    );
    // Fallback: different from last
    if (nextIdx < 0) {
      nextIdx = pool.findIndex((b) => b.disciplineId !== lastDiscipline);
    }
    // Final fallback: take first available
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
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disciplines: { id: string; name: string; weight: number; category: string; cannotZero?: boolean }[];
  topics: { disciplineId: string; completed: boolean }[];
  studyRecords: { disciplineId: string; durationSeconds: number }[];
  existingCycleDisciplines: CycleDiscipline[];
  settings: { weeklyHours: number; studyDays: number[] };
  onGenerate: (cycle: StudyCycle) => void;
}) {
  const [weeklyHours, setWeeklyHours] = useState(settings.weeklyHours || 20);
  const [studyDays, setStudyDays] = useState<number[]>(settings.studyDays.length > 0 ? settings.studyDays : [1, 2, 3, 4, 5]);
  const [cycleName, setCycleName] = useState('Ciclo Automático');
  const [showConfig, setShowConfig] = useState(false);

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
    if (scores.length === 0) {
      toast.error('Nenhuma disciplina com tópicos para gerar o cronograma.');
      return;
    }

    const blocks = generateBlocks(scores, dailyMinutes, studyDays.length);

    const cycle: StudyCycle = {
      id: crypto.randomUUID(),
      name: cycleName,
      disciplines: discConfigs,
      blocks,
      weeklyHours,
      studyDays,
      createdAt: new Date().toISOString(),
      active: true,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Cronograma Automático
          </DialogTitle>
          <DialogDescription>
            O algoritmo distribui o tempo com base em: Peso (35%), Importância (25%), Progresso (15%), Situação (15%) e Dificuldade (10%).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Weekly hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Horas semanais de estudo</Label>
              <Badge variant="secondary" className="text-xs">{weeklyHours}h/semana</Badge>
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
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    studyDays.includes(i)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
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
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3 max-h-[250px] overflow-y-auto">
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
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                {scores.map((s, i) => (
                  <div key={s.disciplineId} className="space-y-1">
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
                      <div className="bg-primary" style={{ width: `${s.breakdown.weightScore * 100 / 0.35 * 35}%` }} title="Peso" />
                      <div className="bg-blue-500" style={{ width: `${s.breakdown.importanceScore * 100 / 0.25 * 25}%` }} title="Importância" />
                      <div className="bg-amber-500" style={{ width: `${s.breakdown.situationScore * 100 / 0.15 * 15}%` }} title="Situação" />
                      <div className="bg-green-500" style={{ width: `${s.breakdown.progressScore * 100 / 0.15 * 15}%` }} title="Progresso" />
                      <div className="bg-red-500" style={{ width: `${s.breakdown.difficultyScore * 100 / 0.10 * 10}%` }} title="Dificuldade" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Peso 35%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Importância 25%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Situação 15%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Progresso 15%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Dificuldade 10%</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleGenerate} className="gap-2" disabled={scores.length === 0}>
            <Sparkles className="h-4 w-4" />
            Gerar Cronograma
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
}: {
  cycle: StudyCycle;
  disciplines: { id: string; name: string }[];
  topics: { disciplineId: string; completed: boolean }[];
  onDelete: () => void;
  onActivate: () => void;
  onUpdateBlocks: (blocks: CycleBlock[]) => void;
}) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
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
    <Card className={cycle.active ? 'border-primary/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{cycle.name}</CardTitle>
            {cycle.active && <Badge className="text-[10px]">Ativo</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {!cycle.active && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onActivate}>
                <Check className="h-3 w-3" /> Ativar
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          {cycle.weeklyHours}h/semana • {cycle.studyDays.map((d) => DAY_NAMES[d]).join(', ')} • {cycle.blocks.length} blocos • {Math.floor(totalMinutes / 60)}h{String(totalMinutes % 60).padStart(2, '0')}min total
        </CardDescription>
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
            const dayName = cycle.studyDays[dayIdx] !== undefined
              ? DAY_FULL[cycle.studyDays[dayIdx]]
              : `Dia ${dayIdx + 1}`;
            const dayMinutes = dayBlocks.reduce((a, b) => a + b.durationMinutes, 0);

            return (
              <AccordionItem key={dayIdx} value={`day-${dayIdx}`} className="border rounded-lg px-3">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{dayName}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {dayBlocks.length} blocos • {Math.floor(dayMinutes / 60)}h{String(dayMinutes % 60).padStart(2, '0')}min
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="space-y-1.5">
                    {dayBlocks.map((block, bi) => {
                      const isEditing = editingBlockId === block.id;

                      return (
                        <div key={block.id} className="rounded-md bg-muted/40 px-3 py-2">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-8 shrink-0">B{bi + 1}</span>
                                <Select
                                  value={block.disciplineId}
                                  onValueChange={(v) => updateBlock(block.id, { disciplineId: v })}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {disciplines.map((d) => (
                                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => removeBlock(block.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => setEditingBlockId(null)}
                                >
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 ml-8">
                                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                                <Slider
                                  value={[block.durationMinutes]}
                                  onValueChange={([v]) => updateBlock(block.id, { durationMinutes: v })}
                                  min={15}
                                  max={180}
                                  step={15}
                                  className="flex-1"
                                />
                                <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
                                  {block.durationMinutes}min
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setEditingBlockId(block.id)}
                              title="Clique para editar"
                            >
                              <span className="text-xs text-muted-foreground w-8 shrink-0">B{bi + 1}</span>
                              <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-sm flex-1 truncate">{getDisciplineName(block.disciplineId)}</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                <Clock className="h-3 w-3" />
                                {block.durationMinutes}min
                              </div>
                              <Edit2 className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={addBlock}>
          <Plus className="h-3.5 w-3.5" />
          Adicionar Bloco
        </Button>
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

  const hasDisciplinesWithTopics = disciplines.some((d) =>
    topics.some((t) => t.disciplineId === d.id)
  );

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Planejamento & Ciclos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere cronogramas de estudo otimizados baseados no seu progresso.
          </p>
        </div>
        <Button
          onClick={() => setGenerateOpen(true)}
          className="gap-2"
          disabled={!hasDisciplinesWithTopics && disciplines.length === 0}
        >
          <Sparkles className="h-4 w-4" />
          Gerar Cronograma
        </Button>
      </div>

      {/* Active cycle summary */}
      {activeCycle && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Ciclo ativo: {activeCycle.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeCycle.weeklyHours}h/semana • {activeCycle.blocks.length} blocos •{' '}
                  {activeCycle.studyDays.map((d) => DAY_NAMES[d]).join(', ')}
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setGenerateOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" /> Regenerar
              </Button>
            </div>
          </CardContent>
        </Card>
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
              />
            ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhum cronograma criado</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              {hasDisciplinesWithTopics
                ? 'Gere um cronograma automático baseado no progresso do seu edital verticalizado.'
                : 'Importe seu edital verticalizado primeiro para gerar um cronograma otimizado.'
              }
            </p>
            {hasDisciplinesWithTopics ? (
              <Button onClick={() => setGenerateOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" /> Gerar Cronograma
              </Button>
            ) : (
              <Button variant="outline" asChild>
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
        onGenerate={handleGenerate}
      />
    </motion.div>
  );
}
