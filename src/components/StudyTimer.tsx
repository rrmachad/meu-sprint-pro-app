import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Square, Clock, BookOpen, Save,
  Timer, PenLine, ChevronUp, ChevronDown, ChevronRight, X, Plus, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { StudyRecord, ActivityType, Turno } from '@/types';
import { playSuccessChime } from '@/lib/sounds';

function getTurno(): Turno {
  const h = new Date().getHours();
  if (h < 6) return 'madrugada';
  if (h < 12) return 'manha';
  if (h < 18) return 'tarde';
  return 'noite';
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type EntryMode = 'cronometro' | 'manual';

export function StudyTimer() {
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const cycles = useAppStore((s) => s.cycles);
  const { addStudyRecord, updateStreak, addDiscipline, addTopic } = useAppStore();

  const [entryMode, setEntryMode] = useState<EntryMode>('cronometro');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('estudo');
  const [expanded, setExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showNewDiscipline, setShowNewDiscipline] = useState(false);
  const [newDisciplineName, setNewDisciplineName] = useState('');
  const [newTopics, setNewTopics] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);
  const [manualHours, setManualHours] = useState(0);
  const [saveData, setSaveData] = useState({
    correctAnswers: 0,
    wrongAnswers: 0,
    blankAnswers: 0,
    pagesRead: 0,
    notes: '',
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedBeforePause = useRef<number>(0);

  const filteredTopics = useMemo(() => {
    if (!selectedDiscipline) return [];
    return topics.filter((t) => t.disciplineId === selectedDiscipline && !t.completed);
  }, [topics, selectedDiscipline]);

  useEffect(() => {
    if (!selectedDiscipline && disciplines.length > 0) {
      const activeCycle = cycles.find((c) => c.active);
      if (activeCycle && activeCycle.blocks.length > 0) {
        setSelectedDiscipline(activeCycle.blocks[0].disciplineId);
      } else {
        setSelectedDiscipline(disciplines[0].id);
      }
    }
  }, [disciplines, cycles, selectedDiscipline]);

  useEffect(() => {
    setSelectedTopic('');
  }, [selectedDiscipline]);

  const startTimer = useCallback(() => {
    if (!selectedDiscipline) {
      toast.error('Selecione uma matéria primeiro.');
      return;
    }
    startTimeRef.current = Date.now();
    setIsRunning(true);
    setExpanded(true);
  }, [selectedDiscipline]);

  const pauseTimer = useCallback(() => {
    elapsedBeforePause.current = elapsed;
    setIsRunning(false);
  }, [elapsed]);

  const createAndSaveRecord = useCallback((finalElapsed: number) => {
    const today = new Date().toISOString().split('T')[0];
    const topicsCompleted = selectedTopic ? [selectedTopic] : [];
    const record: StudyRecord = {
      id: crypto.randomUUID(),
      disciplineId: selectedDiscipline,
      date: today,
      activityType,
      turno: getTurno(),
      durationSeconds: finalElapsed,
      correctAnswers: 0,
      wrongAnswers: 0,
      blankAnswers: 0,
      pagesRead: 0,
      topicsCompleted,
      notes: '',
    };

    addStudyRecord(record);
    updateStreak(today);

    const revisionSettings = useAppStore.getState().settings.revision;
    if (revisionSettings.enabled) {
      const markDays: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '60d': 60 };
      const addRevision = useAppStore.getState().addRevision;
      for (const mark of revisionSettings.marks) {
        const due = new Date(today);
        due.setDate(due.getDate() + (markDays[mark] || 1));
        addRevision({
          id: crypto.randomUUID(),
          disciplineId: selectedDiscipline,
          studyDate: today,
          mark,
          dueDate: due.toISOString().split('T')[0],
          completed: false,
        });
      }
    }

    const discName = disciplines.find((d) => d.id === selectedDiscipline)?.name || '';
    const mins = Math.round(finalElapsed / 60);
    setShowSuccess(true);
    playSuccessChime();
    setTimeout(() => setShowSuccess(false), 1800);

    toast.success(`${mins} min de ${discName} registrados!`, {
      description: 'Toque em "Editar" para adicionar detalhes.',
      action: {
        label: 'Editar',
        onClick: () => {
          setLastSavedRecordId(record.id);
          setSaveData({ correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0, pagesRead: 0, notes: '' });
          setEditElapsed(finalElapsed);
          setShowSaveDialog(true);
        },
      },
      duration: 8000,
    });

    return record.id;
  }, [selectedDiscipline, selectedTopic, activityType, addStudyRecord, updateStreak, disciplines]);

  const stopTimer = useCallback(() => {
    if (elapsed < 10) {
      setIsRunning(false);
      setElapsed(0);
      elapsedBeforePause.current = 0;
      return;
    }
    setIsRunning(false);
    createAndSaveRecord(elapsed);
    setElapsed(0);
    elapsedBeforePause.current = 0;
  }, [elapsed, createAndSaveRecord]);

  const handleManualSave = useCallback(() => {
    const totalSeconds = manualHours * 3600 + manualMinutes * 60;
    if (totalSeconds < 60) {
      toast.error('Informe pelo menos 1 minuto de estudo.');
      return;
    }
    if (!selectedDiscipline) {
      toast.error('Selecione uma matéria primeiro.');
      return;
    }
    createAndSaveRecord(totalSeconds);
    setManualHours(0);
    setManualMinutes(0);
  }, [manualHours, manualMinutes, selectedDiscipline, createAndSaveRecord]);

  const handleSave = useCallback(() => {
    if (!lastSavedRecordId) return;
    const { updateStudyRecord } = useAppStore.getState();
    updateStudyRecord(lastSavedRecordId, {
      correctAnswers: saveData.correctAnswers,
      wrongAnswers: saveData.wrongAnswers,
      blankAnswers: saveData.blankAnswers,
      pagesRead: saveData.pagesRead,
      notes: saveData.notes,
    });
    toast.success('Detalhes da sessão atualizados!');
    setShowSaveDialog(false);
    setLastSavedRecordId(null);
    setSaveData({ correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0, pagesRead: 0, notes: '' });
  }, [lastSavedRecordId, saveData]);

  const handleDiscard = useCallback(() => {
    setShowSaveDialog(false);
    setLastSavedRecordId(null);
    setSaveData({ correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0, pagesRead: 0, notes: '' });
  }, []);

  const handleAddTopicToList = useCallback(() => {
    const text = newTopicInput.trim();
    if (!text) return;
    if (newTopics.includes(text)) { toast.error('Tópico já adicionado.'); return; }
    setNewTopics((prev) => [...prev, text]);
    setNewTopicInput('');
  }, [newTopicInput, newTopics]);

  const handleRemoveTopicFromList = useCallback((index: number) => {
    setNewTopics((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddDiscipline = useCallback(() => {
    const name = newDisciplineName.trim();
    if (!name) { toast.error('Informe o nome da matéria.'); return; }
    if (disciplines.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Essa matéria já existe.'); return;
    }
    const newDiscId = crypto.randomUUID();
    const newDisc = {
      id: newDiscId,
      name,
      category: 'mista' as const,
      weight: 0,
      prova: 'P1',
      defaultQuestions: 0,
      order: disciplines.length,
    };
    addDiscipline(newDisc);

    // Add topics
    newTopics.forEach((text, i) => {
      addTopic({
        id: crypto.randomUUID(),
        disciplineId: newDiscId,
        text,
        completed: false,
        order: i,
      });
    });

    setSelectedDiscipline(newDiscId);
    setNewDisciplineName('');
    setNewTopics([]);
    setNewTopicInput('');
    setShowNewDiscipline(false);
    const topicCount = newTopics.length;
    toast.success(`Matéria "${name}" adicionada${topicCount > 0 ? ` com ${topicCount} tópico${topicCount > 1 ? 's' : ''}` : ''}!`);
  }, [newDisciplineName, newTopics, disciplines, addDiscipline, addTopic]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(elapsedBeforePause.current + Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  if (disciplines.length === 0) return null;

  const currentDiscName = disciplines.find((d) => d.id === selectedDiscipline)?.name || '';
  const isBusy = isRunning || elapsed > 0;

  return (
    <>
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <motion.div
                className="rounded-full bg-primary/20 p-5 backdrop-blur-md ring-2 ring-primary/30"
                initial={{ rotate: -90 }}
                animate={{ rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <CheckCircle2 className="h-12 w-12 text-primary" strokeWidth={2.5} />
              </motion.div>
              <motion.p
                className="text-sm font-semibold text-foreground bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                Atividade registrada!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Fixed Bottom Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Expanded Panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-border/50 glass-strong backdrop-blur-xl"
            >
              <div className="max-w-4xl mx-auto px-4 py-4 space-y-4 relative">
                {/* Close button */}
                {!isBusy && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.button
                        onClick={() => setExpanded(false)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        aria-label="Fechar painel"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15, duration: 0.25, ease: 'easeOut' }}
                        whileHover={{ scale: 1.15, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      Fechar painel
                    </TooltipContent>
                  </Tooltip>
                )}
                {/* Mode toggle */}
                {!isBusy && (
                  <div className="flex rounded-xl border border-border overflow-hidden max-w-xs">
                    <button
                      onClick={() => setEntryMode('manual')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                        entryMode === 'manual'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Manual
                    </button>
                    <button
                      onClick={() => setEntryMode('cronometro')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                        entryMode === 'cronometro'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Timer className="h-3.5 w-3.5" />
                      Cronômetro
                    </button>
                  </div>
                )}

                {/* Timer display when running */}
                {isBusy && (
                  <div className="flex items-center justify-center gap-3">
                    <span className={`font-mono text-3xl font-extrabold tracking-tight ${isRunning ? 'text-primary' : 'text-foreground'}`}>
                      {formatTimer(elapsed)}
                    </span>
                    {isRunning && <span className="h-3 w-3 rounded-full bg-primary animate-pulse" />}
                  </div>
                )}

                {/* Activity type */}
                <div className="grid grid-cols-4 gap-1.5 max-w-md">
                  {([
                    { value: 'estudo', label: 'Estudo' },
                    { value: 'revisao', label: 'Revisão' },
                    { value: 'exercicios', label: 'Exercícios' },
                    { value: 'leitura', label: 'Leitura' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => !isBusy && setActivityType(opt.value)}
                      disabled={isBusy}
                      className={`py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] ${
                        activityType === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      } ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Conteúdo (Topic) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5" />
                    Conteúdo
                  </Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={isBusy}>
                    <SelectTrigger className="h-11 text-sm rounded-xl border-border/50">
                      <SelectValue placeholder={filteredTopics.length > 0 ? 'Escolha um conteúdo' : 'Nenhum conteúdo pendente'} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTopics.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="py-2.5">
                          <span className="line-clamp-1">{t.text}</span>
                        </SelectItem>
                      ))}
                      {filteredTopics.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Cadastre tópicos no Raio-X
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manual duration entry */}
                {entryMode === 'manual' && !isBusy && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Duração</Label>
                    <div className="flex items-center gap-2 max-w-xs">
                      <div className="flex-1 flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={manualHours}
                          onChange={(e) => setManualHours(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-11 text-center text-sm rounded-xl"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">h</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          value={manualMinutes}
                          onChange={(e) => setManualMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="h-11 text-center text-sm rounded-xl"
                        />
                        <span className="text-xs text-muted-foreground shrink-0">min</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-2 max-w-md">
                  {entryMode === 'cronometro' ? (
                    <>
                      {!isRunning ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="lg" className="gap-2 flex-1 h-12 text-sm rounded-xl" onClick={startTimer}>
                              <Play className="h-4 w-4" />
                              {elapsed > 0 ? 'Continuar' : 'Iniciar Atividade'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">{elapsed > 0 ? 'Continuar cronômetro' : 'Iniciar cronômetro'}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="lg" variant="outline" className="gap-2 flex-1 h-12 text-sm rounded-xl" onClick={pauseTimer}>
                              <Pause className="h-4 w-4" />
                              Pausar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Pausar cronômetro</TooltipContent>
                        </Tooltip>
                      )}
                      {elapsed > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="lg" variant="destructive" className="gap-2 h-12 text-sm rounded-xl" onClick={stopTimer}>
                              <Square className="h-4 w-4" />
                              Parar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Parar e salvar</TooltipContent>
                        </Tooltip>
                      )}
                    </>
                  ) : (
                    <Button size="lg" className="gap-2 flex-1 h-12 text-sm rounded-xl" onClick={handleManualSave}>
                      <Save className="h-4 w-4" />
                      Registrar Atividade
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Bottom Bar (always visible) ─── */}
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center gap-2 px-3 py-2">
            {/* Discipline Select */}
            <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline} disabled={isBusy}>
              <SelectTrigger className="h-10 text-xs rounded-xl border-border/50 flex-1 min-w-0">
                <SelectValue placeholder="Escolha uma matéria" />
              </SelectTrigger>
              <SelectContent>
                {disciplines.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="py-2">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Content Select (hidden on very small screens when timer running) */}
            <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={isBusy}>
              <SelectTrigger className="h-10 text-xs rounded-xl border-border/50 flex-1 min-w-0 hidden sm:flex">
                <SelectValue placeholder="Escolha um conteúdo" />
              </SelectTrigger>
              <SelectContent>
                {filteredTopics.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="py-2">
                    <span className="line-clamp-1">{t.text}</span>
                  </SelectItem>
                ))}
                {filteredTopics.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Sem conteúdo</div>
                )}
              </SelectContent>
            </Select>

            {/* Timer display in bar when running */}
            {isBusy && (
              <span className={`font-mono text-sm font-bold shrink-0 ${isRunning ? 'text-primary' : 'text-foreground'}`}>
                {formatTimer(elapsed)}
              </span>
            )}

            {/* Quick action button */}
            {!isBusy ? (
              <Button
                size="sm"
                className="h-10 gap-1.5 rounded-xl px-4 shrink-0 text-xs font-semibold"
                onClick={() => {
                  if (entryMode === 'cronometro') {
                    startTimer();
                  } else {
                    setExpanded(true);
                  }
                }}
              >
                <Play className="h-3.5 w-3.5" />
                Iniciar
              </Button>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                {isRunning ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" className="h-10 rounded-xl px-3 text-xs" onClick={pauseTimer}>
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Pausar</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" className="h-10 rounded-xl px-3 text-xs" onClick={startTimer}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Continuar</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="destructive" className="h-10 rounded-xl px-3 text-xs" onClick={stopTimer}>
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Parar e salvar</TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Nova matéria */}
            <Button
              size="sm"
              variant="outline"
              className="h-10 gap-1 rounded-xl px-2.5 shrink-0 text-xs border-border/50 hidden sm:flex"
              onClick={() => setShowNewDiscipline(true)}
              disabled={isBusy}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova matéria
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-xl shrink-0 sm:hidden border-border/50"
              onClick={() => setShowNewDiscipline(true)}
              disabled={isBusy}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Expand/collapse */}
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-xl shrink-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(v) => { if (!v) handleDiscard(); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Editar Sessão de Estudo
            </DialogTitle>
            <DialogDescription>
              {currentDiscName} — {formatTimer(editElapsed)} ({Math.round(editElapsed / 60)} min)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(activityType === 'exercicios' || activityType === 'estudo') && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Acertos</Label>
                  <Input type="number" min={0} value={saveData.correctAnswers} onChange={(e) => setSaveData((p) => ({ ...p, correctAnswers: parseInt(e.target.value) || 0 }))} className="h-11 text-sm rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Erros</Label>
                  <Input type="number" min={0} value={saveData.wrongAnswers} onChange={(e) => setSaveData((p) => ({ ...p, wrongAnswers: parseInt(e.target.value) || 0 }))} className="h-11 text-sm rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Em branco</Label>
                  <Input type="number" min={0} value={saveData.blankAnswers} onChange={(e) => setSaveData((p) => ({ ...p, blankAnswers: parseInt(e.target.value) || 0 }))} className="h-11 text-sm rounded-xl" />
                </div>
              </div>
            )}

            {(activityType === 'leitura' || activityType === 'estudo') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Páginas lidas</Label>
                <Input type="number" min={0} value={saveData.pagesRead} onChange={(e) => setSaveData((p) => ({ ...p, pagesRead: parseInt(e.target.value) || 0 }))} className="h-11 text-sm rounded-xl" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Anotações (opcional)</Label>
              <Textarea value={saveData.notes} onChange={(e) => setSaveData((p) => ({ ...p, notes: e.target.value }))} placeholder="O que você estudou..." className="min-h-[70px] text-sm rounded-xl" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={handleDiscard}>Fechar</Button>
            <Button onClick={handleSave} className="gap-2 rounded-xl">
              <Save className="h-4 w-4" />
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova Matéria Dialog */}
      <Dialog open={showNewDiscipline} onOpenChange={(v) => { if (!v) { setShowNewDiscipline(false); setNewDisciplineName(''); setNewTopics([]); setNewTopicInput(''); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova Matéria
            </DialogTitle>
            <DialogDescription>
              Adicione uma matéria e seus conteúdos/assuntos do edital.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome da matéria</Label>
              <Input
                value={newDisciplineName}
                onChange={(e) => setNewDisciplineName(e.target.value)}
                placeholder="Ex: Direito Constitucional"
                className="h-11 text-sm rounded-xl"
                autoFocus
              />
            </div>

            {/* Topics section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Conteúdos / Assuntos
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  placeholder="Ex: Princípios Fundamentais"
                  className="h-10 text-sm rounded-xl flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTopicToList(); } }}
                />
                <Button size="sm" variant="outline" className="h-10 rounded-xl px-3 shrink-0" onClick={handleAddTopicToList} disabled={!newTopicInput.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {newTopics.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl border border-border/50 p-2">
                  {newTopics.map((topic, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-muted/30 group">
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0">{idx + 1}.</span>
                      <span className="flex-1 line-clamp-1">{topic}</span>
                      <button
                        onClick={() => handleRemoveTopicFromList(idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {newTopics.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum conteúdo adicionado ainda. Você pode adicionar depois também.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => { setShowNewDiscipline(false); setNewDisciplineName(''); setNewTopics([]); setNewTopicInput(''); }}>Cancelar</Button>
            <Button onClick={handleAddDiscipline} className="gap-2 rounded-xl" disabled={!newDisciplineName.trim()}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
