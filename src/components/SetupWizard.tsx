import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, User, Building2, CalendarDays, BookOpen,
  Clock, CheckCircle2, ChevronRight, ChevronLeft, Plus, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/store/useAppStore';
import type { Discipline, DisciplineCategory, ProvaType } from '@/types';

const STEPS = [
  { title: 'Seu Nome', icon: User, description: 'Como devemos te chamar?' },
  { title: 'Concurso', icon: Building2, description: 'Qual concurso você está estudando?' },
  { title: 'Data da Prova', icon: CalendarDays, description: 'Quando será a prova?' },
  { title: 'Disciplinas', icon: BookOpen, description: 'Cadastre as disciplinas do edital' },
  { title: 'Provas', icon: CheckCircle2, description: 'Configure P1/P2 e mínimos' },
  { title: 'Carga Horária', icon: Clock, description: 'Quantas horas semanais você pode estudar?' },
  { title: 'Dias de Estudo', icon: CalendarDays, description: 'Quais dias você vai estudar?' },
];

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
];

const CATEGORIES: { label: string; value: DisciplineCategory }[] = [
  { label: 'Exatas', value: 'exatas' },
  { label: 'Humanas', value: 'humanas' },
  { label: 'Jurídicas', value: 'juridicas' },
  { label: 'Mista', value: 'mista' },
];

interface DisciplineForm {
  name: string;
  category: DisciplineCategory;
  questions: number;
  weightPerQuestion: number;
  prova: ProvaType;
}

export function SetupWizard() {
  const { updateSettings, addDiscipline, completeSetup } = useAppStore();
  const [step, setStep] = useState(0);

  // Form state
  const [candidateName, setCandidateName] = useState('');
  const [contestName, setContestName] = useState('');
  const [organ, setOrgan] = useState('');
  const [vacancies, setVacancies] = useState(1);
  const [examDate, setExamDate] = useState('');
  const [disciplines, setDisciplines] = useState<DisciplineForm[]>([
    { name: '', category: 'humanas', questions: 10, weightPerQuestion: 1, prova: 'P1' },
  ]);
  const [hasP2, setHasP2] = useState(false);
  const [p1Min, setP1Min] = useState(60);
  const [p2Min, setP2Min] = useState(60);
  const [totalMin, setTotalMin] = useState(70);
  const [weeklyHours, setWeeklyHours] = useState(40);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const addDisciplineRow = () => {
    setDisciplines([...disciplines, { name: '', category: 'humanas', questions: 10, weightPerQuestion: 1, prova: 'P1' }]);
  };

  const getTotalPoints = () => disciplines.reduce((sum, d) => sum + d.questions * d.weightPerQuestion, 0);
  const getDisciplinePoints = (d: DisciplineForm) => d.questions * d.weightPerQuestion;
  const getDisciplinePercent = (d: DisciplineForm) => {
    const total = getTotalPoints();
    return total === 0 ? 0 : (getDisciplinePoints(d) / total) * 100;
  };

  const updateDisciplineRow = (index: number, field: keyof DisciplineForm, value: string | number) => {
    const updated = [...disciplines];
    (updated[index] as any)[field] = value;
    setDisciplines(updated);
  };

  const removeDisciplineRow = (index: number) => {
    if (disciplines.length > 1) {
      setDisciplines(disciplines.filter((_, i) => i !== index));
    }
  };

  const toggleStudyDay = (day: number) => {
    setStudyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 0: return candidateName.trim().length > 0;
      case 1: return contestName.trim().length > 0;
      case 2: return true;
      case 3: return disciplines.some((d) => d.name.trim().length > 0);
      case 4: return true;
      case 5: return weeklyHours > 0;
      case 6: return studyDays.length > 0;
      default: return true;
    }
  };

  const handleFinish = () => {
    updateSettings({
      contest: {
        candidateName,
        name: contestName,
        organ,
        examDate,
        vacancies,
      },
      weeklyHours,
      studyDays,
    });

    disciplines
      .filter((d) => d.name.trim())
      .forEach((d, i) => {
        const disc: Discipline = {
          id: crypto.randomUUID(),
          name: d.name.trim(),
          category: d.category,
          weight: d.weight,
          prova: d.prova,
          defaultQuestions: d.defaultQuestions,
          order: i,
        };
        addDiscipline(disc);
      });

    completeSetup();
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  const [direction, setDirection] = useState(1);

  const goNext = () => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ConcurseiroElite</h1>
              <p className="text-xs text-muted-foreground">Configuração Inicial</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-1 my-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step info */}
          <div className="flex items-center gap-2 mb-6">
            <StepIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Passo {step + 1} de {STEPS.length} — {STEPS[step].title}
              </p>
              <p className="text-xs text-muted-foreground">{STEPS[step].description}</p>
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="min-h-[200px]"
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Seu nome</Label>
                    <Input
                      id="name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="mt-1"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Concurso</Label>
                    <Input
                      value={contestName}
                      onChange={(e) => setContestName(e.target.value)}
                      placeholder="Ex: Auditor Fiscal da Receita Federal"
                      className="mt-1"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label>Órgão</Label>
                    <Input
                      value={organ}
                      onChange={(e) => setOrgan(e.target.value)}
                      placeholder="Ex: Receita Federal do Brasil"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Número de vagas</Label>
                    <Input
                      type="number"
                      value={vacancies}
                      onChange={(e) => setVacancies(Number(e.target.value))}
                      min={1}
                      className="mt-1 w-32"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>Data prevista da prova</Label>
                    <Input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="mt-1 w-48"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Não sabe ainda? Pode deixar em branco e configurar depois.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                    {disciplines.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={d.name}
                            onChange={(e) => updateDisciplineRow(i, 'name', e.target.value)}
                            placeholder="Nome da disciplina"
                            className="text-sm"
                          />
                          <Select
                            value={d.category}
                            onValueChange={(v) => updateDisciplineRow(i, 'category', v)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">Peso %</Label>
                            <Input
                              type="number"
                              value={d.weight}
                              onChange={(e) => updateDisciplineRow(i, 'weight', Number(e.target.value))}
                              min={0} max={100}
                              className="text-sm w-20"
                            />
                          </div>
                          <Select
                            value={d.prova}
                            onValueChange={(v) => updateDisciplineRow(i, 'prova', v)}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="P1">P1</SelectItem>
                              <SelectItem value="P2">P2</SelectItem>
                              <SelectItem value="ambas">Ambas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDisciplineRow(i)}
                          disabled={disciplines.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={addDisciplineRow} className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar Disciplina
                  </Button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasP2"
                      checked={hasP2}
                      onCheckedChange={(c) => setHasP2(!!c)}
                    />
                    <Label htmlFor="hasP2">A prova tem P2 (segunda prova)?</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Mínimo P1 (%)</Label>
                      <Input
                        type="number"
                        value={p1Min}
                        onChange={(e) => setP1Min(Number(e.target.value))}
                        min={0} max={100}
                        className="mt-1 w-24"
                      />
                    </div>
                    {hasP2 && (
                      <div>
                        <Label>Mínimo P2 (%)</Label>
                        <Input
                          type="number"
                          value={p2Min}
                          onChange={(e) => setP2Min(Number(e.target.value))}
                          min={0} max={100}
                          className="mt-1 w-24"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Mínimo Geral (%)</Label>
                    <Input
                      type="number"
                      value={totalMin}
                      onChange={(e) => setTotalMin(Number(e.target.value))}
                      min={0} max={100}
                      className="mt-1 w-24"
                    />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div>
                    <Label>Horas líquidas de estudo por semana</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Button
                        variant="outline" size="icon"
                        onClick={() => setWeeklyHours(Math.max(1, weeklyHours - 5))}
                      >-</Button>
                      <Input
                        type="number"
                        value={weeklyHours}
                        onChange={(e) => setWeeklyHours(Number(e.target.value))}
                        min={1} max={120}
                        className="w-20 text-center text-lg font-bold"
                      />
                      <Button
                        variant="outline" size="icon"
                        onClick={() => setWeeklyHours(Math.min(120, weeklyHours + 5))}
                      >+</Button>
                      <span className="text-sm text-muted-foreground">horas/semana</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="space-y-4">
                  <Label>Selecione os dias de estudo</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => toggleStudyDay(day.value)}
                        className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl border-2 text-sm font-medium transition-all ${
                          studyDays.includes(day.value)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {studyDays.length} dias selecionados
                    {studyDays.length > 0 && weeklyHours > 0 && (
                      <> — média de {(weeklyHours / studyDays.length).toFixed(1)}h por dia</>
                    )}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              onClick={goNext}
              disabled={!canProceed()}
              className="gap-1"
            >
              {step === STEPS.length - 1 ? (
                <>Concluir <CheckCircle2 className="h-4 w-4" /></>
              ) : (
                <>Próximo <ChevronRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
