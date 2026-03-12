import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Square, Clock, BookOpen, ChevronDown,
  ChevronUp, Minimize2, Maximize2, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export function StudyTimer() {
  const disciplines = useAppStore((s) => s.disciplines);
  const cycles = useAppStore((s) => s.cycles);
  const { addStudyRecord, updateStreak } = useAppStore();

  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('estudo');
  const [minimized, setMinimized] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
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

  const startTimer = useCallback(() => {
    if (!selectedDiscipline) {
      toast.error('Selecione uma disciplina primeiro.');
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

  const autoSaveRecord = useCallback((finalElapsed: number) => {
    const today = new Date().toISOString().split('T')[0];
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
      topicsCompleted: [],
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
    toast.success(`${mins} min de ${discName} registrados automaticamente!`, {
      description: 'Clique em "Editar" para adicionar detalhes.',
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
  }, [selectedDiscipline, activityType, addStudyRecord, updateStreak, disciplines]);

  const stopTimer = useCallback(() => {
    if (elapsed < 10) {
      setIsRunning(false);
      setElapsed(0);
      elapsedBeforePause.current = 0;
      return;
    }
    setIsRunning(false);
    autoSaveRecord(elapsed);
    setElapsed(0);
    elapsedBeforePause.current = 0;
  }, [elapsed, autoSaveRecord]);

  const handleSave = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const record: StudyRecord = {
      id: crypto.randomUUID(),
      disciplineId: selectedDiscipline,
      date: today,
      activityType,
      turno: getTurno(),
      durationSeconds: elapsed,
      correctAnswers: saveData.correctAnswers,
      wrongAnswers: saveData.wrongAnswers,
      blankAnswers: saveData.blankAnswers,
      pagesRead: saveData.pagesRead,
      topicsCompleted: [],
      notes: saveData.notes,
    };

    addStudyRecord(record);
    updateStreak(today);

    // Auto-generate revisions (24h, 7d, 30d, 60d)
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
    const mins = Math.round(elapsed / 60);
    toast.success(`${mins} min de ${discName} registrados! Revisões agendadas.`);

    // Reset
    setElapsed(0);
    elapsedBeforePause.current = 0;
    setShowSaveDialog(false);
    setSaveData({ correctAnswers: 0, wrongAnswers: 0, blankAnswers: 0, pagesRead: 0, notes: '' });
  }, [elapsed, selectedDiscipline, activityType, saveData, addStudyRecord, updateStreak, disciplines]);

  const handleDiscard = useCallback(() => {
    setElapsed(0);
    elapsedBeforePause.current = 0;
    setShowSaveDialog(false);
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

  return (
    <>
      {/* Floating Timer */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="rounded-2xl border border-border/50 glass-strong shadow-elevated overflow-hidden">
          {/* Header - always visible */}
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setMinimized(!minimized)}
          >
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span className={`font-mono text-sm font-bold ${isRunning ? 'text-primary' : 'text-foreground'}`}>
              {formatTimer(elapsed)}
            </span>
            {isRunning && (
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            )}
            {minimized && currentDiscName && (
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">{currentDiscName}</span>
            )}
            <button className="ml-auto text-muted-foreground hover:text-foreground p-0.5">
              {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
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
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  {/* Discipline select */}
                  <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline} disabled={isRunning}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Disciplina..." />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplines.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Activity type */}
                  <div className="flex gap-1">
                    {([
                      { value: 'estudo', label: 'Estudo' },
                      { value: 'revisao', label: 'Revisão' },
                      { value: 'exercicios', label: 'Exercícios' },
                      { value: 'leitura', label: 'Leitura' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => !isRunning && setActivityType(opt.value)}
                        disabled={isRunning}
                        className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                          activityType === opt.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 justify-center">
                    {!isRunning ? (
                      <Button size="sm" className="gap-1.5 flex-1" onClick={startTimer}>
                        <Play className="h-3.5 w-3.5" />
                        {elapsed > 0 ? 'Continuar' : 'Iniciar'}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={pauseTimer}>
                        <Pause className="h-3.5 w-3.5" />
                        Pausar
                      </Button>
                    )}
                    {elapsed > 0 && (
                      <Button size="sm" variant="destructive" className="gap-1.5" onClick={stopTimer}>
                        <Square className="h-3.5 w-3.5" />
                        Parar
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={(v) => { if (!v) handleDiscard(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Salvar Sessão de Estudo
            </DialogTitle>
            <DialogDescription>
              {currentDiscName} — {formatTimer(elapsed)} ({Math.round(elapsed / 60)} min)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(activityType === 'exercicios' || activityType === 'estudo') && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Acertos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={saveData.correctAnswers}
                    onChange={(e) => setSaveData((p) => ({ ...p, correctAnswers: parseInt(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Erros</Label>
                  <Input
                    type="number"
                    min={0}
                    value={saveData.wrongAnswers}
                    onChange={(e) => setSaveData((p) => ({ ...p, wrongAnswers: parseInt(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Em branco</Label>
                  <Input
                    type="number"
                    min={0}
                    value={saveData.blankAnswers}
                    onChange={(e) => setSaveData((p) => ({ ...p, blankAnswers: parseInt(e.target.value) || 0 }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {(activityType === 'leitura' || activityType === 'estudo') && (
              <div className="space-y-1">
                <Label className="text-xs">Páginas lidas</Label>
                <Input
                  type="number"
                  min={0}
                  value={saveData.pagesRead}
                  onChange={(e) => setSaveData((p) => ({ ...p, pagesRead: parseInt(e.target.value) || 0 }))}
                  className="h-8 text-sm"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Anotações (opcional)</Label>
              <Textarea
                value={saveData.notes}
                onChange={(e) => setSaveData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="O que você estudou..."
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDiscard}>Descartar</Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Salvar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
