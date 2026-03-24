// ============ ENUMS ============

export type DisciplineCategory = 'exatas' | 'humanas' | 'juridicas' | 'mista';
export type ProvaType = string; // 'P1' | 'P2' | 'P3' etc.
export type Importance = 'alta' | 'media' | 'baixa';
export type UserSituation = 'nunca_estudei' | 'razoavelmente' | 'ja_estudei';
export type Difficulty = 'muita_facilidade' | 'leve_facilidade' | 'normal' | 'leve_dificuldade' | 'muita_dificuldade';
export type ActivityType = 'estudo' | 'revisao' | 'exercicios' | 'leitura';
export type Turno = 'madrugada' | 'manha' | 'tarde' | 'noite';
export type RevisionMark = '24h' | '7d' | '30d' | '60d';
export type StudyPhase = 'basica' | 'intermediaria' | 'avancada';

// ============ CORE MODELS ============

export interface Discipline {
  id: string;
  name: string;
  category: DisciplineCategory;
  weight: number; // % peso no edital
  prova: ProvaType;
  defaultQuestions: number;
  order: number;
  cannotZero?: boolean; // não pode zerar conforme edital
}

export interface Topic {
  id: string;
  disciplineId: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface StudyRecord {
  id: string;
  disciplineId: string;
  date: string; // ISO date
  activityType: ActivityType;
  turno: Turno;
  durationSeconds: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  pagesRead: number;
  topicsCompleted: string[]; // topic IDs
  notes: string;
}

export interface RevisionEntry {
  id: string;
  disciplineId: string;
  studyDate: string;
  mark: RevisionMark;
  dueDate: string;
  completed: boolean;
}

// ============ CYCLE ============

export interface CycleDiscipline {
  disciplineId: string;
  importance: Importance;
  situation: UserSituation;
  difficulty: Difficulty;
}

export interface CycleBlock {
  id: string;
  number: number;
  disciplineId: string;
  durationMinutes: number;
}

export interface StudyCycle {
  id: string;
  name: string;
  disciplines: CycleDiscipline[];
  blocks: CycleBlock[];
  weeklyHours: number;
  studyDays: number[]; // 0=Sunday ... 6=Saturday
  createdAt: string;
  active: boolean;
  selectedDisciplineIds?: string[]; // disciplines included in this cycle
  weekStart?: number; // starting week number (1-based)
  weekEnd?: number; // ending week number (1-based)
  phase?: StudyPhase; // study phase for block duration
  currentBlockIndex?: number; // tracks user progress through the linear sequence (0-based)
}

// ============ SCHEDULE ============

export interface ScheduleSlot {
  id: string;
  cycleBlockId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

// ============ SIMULADO ============

export interface SimuladoDiscipline {
  disciplineId: string;
  questions: number;
  weight: number;
  correct: number;
  blank: number;
  wrong: number;
}

export interface Simulado {
  id: string;
  date: string;
  banca: string;
  metaPercent: number;
  hasP2: boolean;
  p1MinPercent: number;
  p2MinPercent: number;
  totalMinPercent: number;
  p1Disciplines: string[]; // discipline IDs
  p2Disciplines: string[]; // discipline IDs
  disciplines: SimuladoDiscipline[];
  createdAt: string;
}

// ============ SETTINGS ============

export interface ProvaPhase {
  name: string; // P1, P2, P3...
  minPercent: number;
  weight: number; // peso da prova (1, 2, 3...)
}

export interface ContestInfo {
  name: string;
  organ: string;
  examDate: string;
  vacancies: number;
  candidateName: string;
  phases: ProvaPhase[];
  totalMinPercent: number;
}

export interface RevisionSettings {
  enabled: boolean;
  marks: RevisionMark[];
}

export interface Goals {
  weeklyHours: number;
  dailyQuestions: number;
  dailyPages: number;
}

export interface AppSettings {
  contest: ContestInfo;
  revision: RevisionSettings;
  goals: Goals;
  weeklyHours: number;
  studyDays: number[];
  onboardingCompleted: boolean;
  setupCompleted: boolean;
  moduleHints: Record<string, boolean>;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  reminderMinutesBefore: number;
  revisionReminderHour: number;
}

// ============ DAILY NOTE ============

export interface DailyNote {
  date: string;
  content: string;
}

// ============ STORE STATE ============

export interface AppState {
  settings: AppSettings;
  disciplines: Discipline[];
  topics: Topic[];
  studyRecords: StudyRecord[];
  revisions: RevisionEntry[];
  cycles: StudyCycle[];
  scheduleSlots: ScheduleSlot[];
  simulados: Simulado[];
  dailyNotes: DailyNote[];
  streak: number;
  lastStudyDate: string | null;
}
