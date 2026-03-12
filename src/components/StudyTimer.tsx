import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Square, Clock, BookOpen, Minimize2, Maximize2, Save,
  Timer, PenLine, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { StudyRecord, ActivityType, Turno } from '@/types';

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
  const { addStudyRecord, updateStreak } = useAppStore();

  const [entryMode, setEntryMode] = useState<EntryMode>('cronometro');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('estudo');
  const [minimized, setMinimized] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
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

  // Filter topics by selected discipline
  const filteredTopics = useMemo(() => {
    if (!selectedDiscipline) return [];
    return topics.filter((t) => t.disciplineId === selectedDiscipline && !t.completed);
  }, [topics, selectedDiscipline]);

  // Auto-select discipline from active cycle's next block
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

  // Reset topic when discipline changes
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
    setMinimized(false);
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

    // Auto-generate revisions
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

  // Timer tick
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
      {/* Floating Timer */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50 w-[min(340px,calc(100vw-2rem))]"
      >
        <div className="rounded-2xl border border-border/50 glass-strong shadow-elevated overflow-hidden">
          {/* Header - always visible */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setMinimized(!minimized)}
          >
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span className={`font-mono text-sm font-bold ${isRunning ? 'text-primary' : 'text-foreground'}`}>
              {formatTimer(elapsed)}
            </span>
            {isRunning && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
            {minimized && currentDiscName && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{currentDiscName}</span>
            )}
            <button className="ml-auto text-muted-foreground hover:text-foreground p-1 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2">
              {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Expanded */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Mode toggle - Manual / Cronômetro */}
                  {!isBusy && (
                    <div className="flex rounded-xl border border-border overflow-hidden">
                      <button
                        onClick={() => setEntryMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                          entryMode === 'manual'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        <PenLine className="h-4 w-4" />
                        Manual
                      </button>
                      <button
                        onClick={() => setEntryMode('cronometro')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                          entryMode === 'cronometro'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        <Timer className="h-4 w-4" />
                        Cronômetro
                      </button>
                    </div>
                  )}

                  {/* Matéria (Discipline) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      Matéria
                    </Label>
                    <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline} disabled={isBusy}>
                      <SelectTrigger className="h-11 text-sm">
                        <SelectValue placeholder="Escolha uma matéria" />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplines.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="py-2.5">
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conteúdo (Topic) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <ChevronRight className="h-3.5 w-3.5" />
                      Conteúdo
                    </Label>
                    <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={isBusy}>
                      <SelectTrigger className="h-11 text-sm">
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
                            Cadastre tópicos no Edital
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Activity type */}
                  <div className="grid grid-cols-4 gap-1.5">
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

                  {/* Manual duration entry */}
                  {entryMode === 'manual' && !isBusy && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground font-medium">Duração do estudo</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={manualHours}
                            onChange={(e) => setManualHours(Math.max(0, parseInt(e.target.value) || 0))}
                            className="h-11 text-center text-sm"
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
                            className="h-11 text-center text-sm"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">min</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {entryMode === 'cronometro' ? (
                      <>
                        {!isRunning ? (
                          <Button size="lg" className="gap-2 flex-1 h-12 text-sm" onClick={startTimer}>
                            <Play className="h-4 w-4" />
                            {elapsed > 0 ? 'Continuar' : 'Iniciar'}
                          </Button>
                        ) : (
                          <Button size="lg" variant="outline" className="gap-2 flex-1 h-12 text-sm" onClick={pauseTimer}>
                            <Pause className="h-4 w-4" />
                            Pausar
                          </Button>
                        )}
                        {elapsed > 0 && (
                          <Button size="lg" variant="destructive" className="gap-2 h-12 text-sm" onClick={stopTimer}>
                            <Square className="h-4 w-4" />
                            Parar
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button size="lg" className="gap-2 flex-1 h-12 text-sm" onClick={handleManualSave}>
                        <Save className="h-4 w-4" />
                        Registrar Atividade
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(v) => { if (!v) handleDiscard(); }}>
        <DialogContent className="sm:max-w-md">
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
                  <Input
                    type="number"
                    min={0}
                    value={saveData.correctAnswers}
                    onChange={(e) => setSaveData((p) => ({ ...p, correctAnswers: parseInt(e.target.value) || 0 }))}
                    className="h-11 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Erros</Label>
                  <Input
                    type="number"
                    min={0}
                    value={saveData.wrongAnswers}
                    onChange={(e) => setSaveData((p) => ({ ...p, wrongAnswers: parseInt(e.target.value) || 0 }))}
                    className="h-11 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Em branco</Label>
                  <Input
                    type="number"
                    min={0}
                    value={saveData.blankAnswers}
                    onChange={(e) => setSaveData((p) => ({ ...p, blankAnswers: parseInt(e.target.value) || 0 }))}
                    className="h-11 text-sm"
                  />
                </div>
              </div>
            )}

            {(activityType === 'leitura' || activityType === 'estudo') && (
              <div className="space-y-1.5">
                <Label className="text-xs">Páginas lidas</Label>
                <Input
                  type="number"
                  min={0}
                  value={saveData.pagesRead}
                  onChange={(e) => setSaveData((p) => ({ ...p, pagesRead: parseInt(e.target.value) || 0 }))}
                  className="h-11 text-sm"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Anotações (opcional)</Label>
              <Textarea
                value={saveData.notes}
                onChange={(e) => setSaveData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="O que você estudou..."
                className="min-h-[70px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDiscard}>Fechar</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Atualizar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
