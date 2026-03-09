import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState, AppSettings, Discipline, Topic, StudyRecord,
  RevisionEntry, StudyCycle, ScheduleSlot, Simulado, DailyNote,
} from '@/types';

const defaultSettings: AppSettings = {
  contest: { name: '', organ: '', examDate: '', vacancies: 0, candidateName: '', phases: [{ name: 'P1', minPercent: 60 }], totalMinPercent: 70 },
  revision: { enabled: true, marks: ['24h', '7d', '30d', '60d'] },
  goals: { weeklyHours: 40, dailyQuestions: 50, dailyPages: 30 },
  weeklyHours: 40,
  studyDays: [1, 2, 3, 4, 5],
  onboardingCompleted: false,
  setupCompleted: false,
  moduleHints: {},
  notificationsEnabled: false,
  reminderMinutesBefore: 5,
};

interface AppActions {
  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  completeSetup: () => void;
  completeOnboarding: () => void;
  markModuleHint: (module: string) => void;

  // Disciplines
  addDiscipline: (d: Discipline) => void;
  updateDiscipline: (id: string, d: Partial<Discipline>) => void;
  removeDiscipline: (id: string) => void;
  reorderDisciplines: (disciplines: Discipline[]) => void;

  // Topics
  addTopic: (t: Topic) => void;
  updateTopic: (id: string, t: Partial<Topic>) => void;
  removeTopic: (id: string) => void;
  setTopics: (topics: Topic[]) => void;
  clearTopicsByDiscipline: (disciplineId: string) => void;
  clearAllTopics: () => void;

  // Study Records
  addStudyRecord: (r: StudyRecord) => void;
  updateStudyRecord: (id: string, r: Partial<StudyRecord>) => void;
  removeStudyRecord: (id: string) => void;

  // Revisions
  addRevision: (r: RevisionEntry) => void;
  completeRevision: (id: string) => void;

  // Cycles
  addCycle: (c: StudyCycle) => void;
  updateCycle: (id: string, c: Partial<StudyCycle>) => void;
  removeCycle: (id: string) => void;
  setActiveCycle: (id: string) => void;

  // Schedule
  setScheduleSlots: (slots: ScheduleSlot[]) => void;

  // Simulados
  addSimulado: (s: Simulado) => void;
  updateSimulado: (id: string, s: Partial<Simulado>) => void;
  removeSimulado: (id: string) => void;

  // Daily Notes
  saveDailyNote: (note: DailyNote) => void;

  // Streak
  updateStreak: (date: string) => void;

  // Backup
  exportData: () => string;
  importData: (json: string) => void;
  resetAll: () => void;
}

const initialState: AppState = {
  settings: defaultSettings,
  disciplines: [],
  topics: [],
  studyRecords: [],
  revisions: [],
  cycles: [],
  scheduleSlots: [],
  simulados: [],
  dailyNotes: [],
  streak: 0,
  lastStudyDate: null,
};

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateSettings: (s) => set((state) => ({
        settings: { ...state.settings, ...s },
      })),
      completeSetup: () => set((state) => ({
        settings: { ...state.settings, setupCompleted: true },
      })),
      completeOnboarding: () => set((state) => ({
        settings: { ...state.settings, onboardingCompleted: true },
      })),
      markModuleHint: (module) => set((state) => ({
        settings: {
          ...state.settings,
          moduleHints: { ...state.settings.moduleHints, [module]: true },
        },
      })),

      addDiscipline: (d) => set((s) => ({ disciplines: [...s.disciplines, d] })),
      updateDiscipline: (id, d) => set((s) => ({
        disciplines: s.disciplines.map((x) => (x.id === id ? { ...x, ...d } : x)),
      })),
      removeDiscipline: (id) => set((s) => ({
        disciplines: s.disciplines.filter((x) => x.id !== id),
        topics: s.topics.filter((t) => t.disciplineId !== id),
      })),
      reorderDisciplines: (disciplines) => set({ disciplines }),

      addTopic: (t) => set((s) => ({ topics: [...s.topics, t] })),
      updateTopic: (id, t) => set((s) => ({
        topics: s.topics.map((x) => (x.id === id ? { ...x, ...t } : x)),
      })),
      removeTopic: (id) => set((s) => ({
        topics: s.topics.filter((x) => x.id !== id),
      })),
      setTopics: (topics) => set({ topics }),
      clearTopicsByDiscipline: (did) => set((s) => ({
        topics: s.topics.filter((t) => t.disciplineId !== did),
      })),
      clearAllTopics: () => set({ topics: [] }),

      addStudyRecord: (r) => set((s) => ({ studyRecords: [...s.studyRecords, r] })),
      updateStudyRecord: (id, r) => set((s) => ({
        studyRecords: s.studyRecords.map((x) => (x.id === id ? { ...x, ...r } : x)),
      })),
      removeStudyRecord: (id) => set((s) => ({
        studyRecords: s.studyRecords.filter((x) => x.id !== id),
      })),

      addRevision: (r) => set((s) => ({ revisions: [...s.revisions, r] })),
      completeRevision: (id) => set((s) => ({
        revisions: s.revisions.map((x) => (x.id === id ? { ...x, completed: true } : x)),
      })),

      addCycle: (c) => set((s) => ({ cycles: [...s.cycles, c] })),
      updateCycle: (id, c) => set((s) => ({
        cycles: s.cycles.map((x) => (x.id === id ? { ...x, ...c } : x)),
      })),
      removeCycle: (id) => set((s) => ({
        cycles: s.cycles.filter((x) => x.id !== id),
      })),
      setActiveCycle: (id) => set((s) => ({
        cycles: s.cycles.map((x) => ({ ...x, active: x.id === id })),
      })),

      setScheduleSlots: (slots) => set({ scheduleSlots: slots }),

      addSimulado: (s2) => set((s) => ({ simulados: [...s.simulados, s2] })),
      updateSimulado: (id, s2) => set((s) => ({
        simulados: s.simulados.map((x) => (x.id === id ? { ...x, ...s2 } : x)),
      })),
      removeSimulado: (id) => set((s) => ({
        simulados: s.simulados.filter((x) => x.id !== id),
      })),

      saveDailyNote: (note) => set((s) => ({
        dailyNotes: [
          ...s.dailyNotes.filter((n) => n.date !== note.date),
          note,
        ],
      })),

      updateStreak: (date) => set((s) => {
        if (s.lastStudyDate === date) return {};
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        const newStreak = s.lastStudyDate === yStr ? s.streak + 1 : 1;
        return { streak: newStreak, lastStudyDate: date };
      }),

      exportData: () => {
        const { ...state } = get();
        // Remove functions
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(state)) {
          if (typeof v !== 'function') data[k] = v;
        }
        return JSON.stringify(data, null, 2);
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          set(data);
        } catch {
          console.error('Failed to import data');
        }
      },
      resetAll: () => set(initialState),
    }),
    {
      name: 'concurseiro-elite-storage',
    }
  )
);
