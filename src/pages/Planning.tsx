import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays, Sparkles, Clock, BookOpen, AlertTriangle,
  RotateCcw, Check, ChevronDown, ChevronRight, Trash2, Settings2,
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
import type { CycleBlock, CycleDiscipline, StudyCycle } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// ========== SCORE ALGORITHM ==========
// Based on memory: Weight 35%, Importance 25%, Situation 25%, Difficulty 15%
interface DisciplineScore {
  disciplineId: string;
  name: string;
  score: number;
  progressPercent: number;
  pendingTopics: number;
  totalTopics: number;
  weight: number;
  allocatedMinutes: number;
}

function computeScores(
  disciplines: { id: string; name: string; weight: number }[],
  topics: { disciplineId: string; completed: boolean }[],
  cycleDisciplines: CycleDiscipline[],
): DisciplineScore[] {
  const importanceMap: Record<string, number> = { alta: 1.0, media: 0.6, baixa: 0.3 };
  const situationMap: Record<string, number> = { nunca_estudei: 1.0, razoavelmente: 0.5, ja_estudei: 0.2 };
  const difficultyMap: Record<string, number> = {
    muita_dificuldade: 1.0, leve_dificuldade: 0.75, normal: 0.5,
    leve_facilidade: 0.25, muita_facilidade: 0.1,
  };

  const maxWeight = Math.max(...disciplines.map((d) => d.weight), 1);

  return disciplines.map((d) => {
    const dTopics = topics.filter((t) => t.disciplineId === d.id);
    const total = dTopics.length;
    const completed = dTopics.filter((t) => t.completed).length;
    const pending = total - completed;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Invert progress: less progress = higher priority
    const progressFactor = total > 0 ? 1 - (completed / total) : 0.5;

    const cd = cycleDisciplines.find((c) => c.disciplineId === d.id);
    const importanceFactor = cd ? (importanceMap[cd.importance] ?? 0.6) : 0.6;
    const situationFactor = cd ? (situationMap[cd.situation] ?? 0.5) : 0.5;
    const difficultyFactor = cd ? (difficultyMap[cd.difficulty] ?? 0.5) : 0.5;
    const weightFactor = maxWeight > 0 ? d.weight / maxWeight : 0.5;

    // Combined score
    const score =
      weightFactor * 0.35 +
      importanceFactor * 0.25 +
      situationFactor * 0.15 +
      difficultyFactor * 0.10 +
      progressFactor * 0.15;

    return {
      disciplineId: d.id,
      name: d.name,
      score,
      progressPercent,
      pendingTopics: pending,
      totalTopics: total,
      weight: d.weight,
      allocatedMinutes: 0,
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

  // Allocate minutes proportionally to score
  const allocated = scores.map((s) => ({
    ...s,
    allocatedMinutes: Math.max(30, Math.round((s.score / totalScore) * totalMinutes)),
  }));

  // Generate blocks (30-150min each), alternating categories
  const blocks: CycleBlock[] = [];
  let blockNum = 1;

  for (const disc of allocated.sort((a, b) => b.score - a.score)) {
    let remaining = disc.allocatedMinutes;
    while (remaining >= 30) {
      const duration = Math.min(remaining, 120);
      blocks.push({
        id: crypto.randomUUID(),
        number: blockNum++,
        disciplineId: disc.disciplineId,
        durationMinutes: duration,
      });
      remaining -= duration;
    }
  }

  // Reorder to alternate disciplines (avoid consecutive same discipline)
  const reordered: CycleBlock[] = [];
  const pool = [...blocks];
  let lastDiscipline = '';

  while (pool.length > 0) {
    const nextIdx = pool.findIndex((b) => b.disciplineId !== lastDiscipline);
    const idx = nextIdx >= 0 ? nextIdx : 0;
    const block = pool.splice(idx, 1)[0];
    reordered.push({ ...block, number: reordered.length + 1 });
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
  existingCycleDisciplines,
  settings,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disciplines: { id: string; name: string; weight: number; category: string }[];
  topics: { disciplineId: string; completed: boolean }[];
  existingCycleDisciplines: CycleDiscipline[];
  settings: { weeklyHours: number; studyDays: number[] };
  onGenerate: (cycle: StudyCycle) => void;
}) {
  const [weeklyHours, setWeeklyHours] = useState(settings.weeklyHours || 20);
  const [studyDays, setStudyDays] = useState<number[]>(settings.studyDays.length > 0 ? settings.studyDays : [1, 2, 3, 4, 5]);
  const [cycleName, setCycleName] = useState('Ciclo Automático');

  const discsWithTopics = disciplines.filter((d) => {
    const dTopics = topics.filter((t) => t.disciplineId === d.id);
    return dTopics.length > 0 || d.weight > 0;
  });

  const scores = useMemo(() =>
    computeScores(discsWithTopics, topics, existingCycleDisciplines)
      .sort((a, b) => b.score - a.score),
    [discsWithTopics, topics, existingCycleDisciplines]
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
      disciplines: scores.map((s) => ({
        disciplineId: s.disciplineId,
        importance: existingCycleDisciplines.find((c) => c.disciplineId === s.disciplineId)?.importance || 'media',
        situation: existingCycleDisciplines.find((c) => c.disciplineId === s.disciplineId)?.situation || 'razoavelmente',
        difficulty: existingCycleDisciplines.find((c) => c.disciplineId === s.disciplineId)?.difficulty || 'normal',
      })),
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Cronograma Automático
          </DialogTitle>
          <DialogDescription>
            O cronograma será gerado com base no progresso do edital, peso das disciplinas e sua configuração.
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

          {/* Priority preview */}
          {scores.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade calculada</Label>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                {scores.map((s, i) => (
                  <div key={s.disciplineId} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate">{s.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {s.progressPercent}% feito
                        </span>
                      </div>
                      <Progress value={Math.round(s.score * 100)} className="h-1.5 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Disciplinas com menos progresso e maior peso recebem mais tempo.
              </p>
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
}: {
  cycle: StudyCycle;
  disciplines: { id: string; name: string }[];
  topics: { disciplineId: string; completed: boolean }[];
  onDelete: () => void;
  onActivate: () => void;
}) {
  const getDisciplineName = (id: string) => disciplines.find((d) => d.id === id)?.name || 'Disciplina';

  // Group blocks by "day slots" (distribute blocks across study days)
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

  // Discipline time summary
  const discSummary = useMemo(() => {
    const map: Record<string, number> = {};
    cycle.blocks.forEach((b) => {
      map[b.disciplineId] = (map[b.disciplineId] || 0) + b.durationMinutes;
    });
    return Object.entries(map)
      .map(([id, mins]) => ({ name: getDisciplineName(id), minutes: mins }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [cycle.blocks, disciplines]);

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
        {/* Time distribution */}
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

        {/* Daily schedule */}
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
                    {dayBlocks.map((block, bi) => (
                      <div
                        key={block.id}
                        className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground w-8 shrink-0">
                          B{bi + 1}
                        </span>
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm flex-1 truncate">{getDisciplineName(block.disciplineId)}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {block.durationMinutes}min
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ========== MAIN PAGE ==========
export default function Planning() {
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const cycles = useAppStore((s) => s.cycles);
  const settings = useAppStore((s) => s.settings);
  const { addCycle, removeCycle, setActiveCycle } = useAppStore();
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
        existingCycleDisciplines={activeCycleDisciplines}
        settings={settings}
        onGenerate={handleGenerate}
      />
    </motion.div>
  );
}
