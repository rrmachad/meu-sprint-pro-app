import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  AppState, AppSettings, Discipline, Topic, StudyRecord,
  RevisionEntry, StudyCycle, ScheduleSlot, Simulado, DailyNote,
} from '@/types';

function showDbError(context: string, error: any) {
  console.error(context, error);
  toast.error('Erro ao salvar dados', { description: error?.message || context });
}

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
  // Auth
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  completeSetup: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
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

// ===== Supabase persistence helpers (fire-and-forget) =====
function getUid(): string | null {
  return useAppStore.getState().userId;
}

function persistDiscipline(d: Discipline) {
  const uid = getUid();
  if (!uid) return;
  supabase.from('disciplines').upsert({
    id: d.id, user_id: uid, name: d.name, category: d.category, weight: d.weight,
    prova: d.prova, default_questions: d.defaultQuestions, sort_order: d.order,
    cannot_zero: d.cannotZero || false,
  }).then(({ error }) => error && showDbError('Disciplina', error));
}

function persistTopic(t: Topic) {
  const uid = getUid();
  if (!uid) return;
  supabase.from('topics').upsert({
    id: t.id, user_id: uid, discipline_id: t.disciplineId, text: t.text,
    completed: t.completed, sort_order: t.order,
  }).then(({ error }) => error && showDbError('Tópico', error));
}

function persistStudyRecord(r: StudyRecord) {
  const uid = getUid();
  if (!uid) return;
  supabase.from('study_records').upsert({
    id: r.id, user_id: uid, discipline_id: r.disciplineId, date: r.date,
    activity_type: r.activityType, turno: r.turno, duration_seconds: r.durationSeconds,
    correct_answers: r.correctAnswers, wrong_answers: r.wrongAnswers,
    blank_answers: r.blankAnswers, pages_read: r.pagesRead,
    topics_completed: r.topicsCompleted, notes: r.notes,
  }).then(({ error }) => error && showDbError('Registro de estudo', error));
}

function persistRevision(r: RevisionEntry) {
  const uid = getUid();
  if (!uid) return;
  supabase.from('revisions').upsert({
    id: r.id, user_id: uid, discipline_id: r.disciplineId, study_date: r.studyDate,
    mark: r.mark, due_date: r.dueDate, completed: r.completed,
  }).then(({ error }) => error && showDbError('Revisão', error));
}

async function persistSettings() {
  const uid = getUid();
  if (!uid) return;

  const { settings, streak, lastStudyDate } = useAppStore.getState();
  const payload = {
    contest_name: settings.contest.name,
    contest_organ: settings.contest.organ,
    exam_date: settings.contest.examDate || null,
    vacancies: settings.contest.vacancies,
    candidate_name: settings.contest.candidateName,
    phases: settings.contest.phases as any,
    total_min_percent: settings.contest.totalMinPercent,
    revision_enabled: settings.revision.enabled,
    revision_marks: settings.revision.marks,
    weekly_hours: settings.goals.weeklyHours,
    daily_questions: settings.goals.dailyQuestions,
    daily_pages: settings.goals.dailyPages,
    study_days: settings.studyDays,
    onboarding_completed: settings.onboardingCompleted,
    setup_completed: settings.setupCompleted,
    module_hints: settings.moduleHints as any,
    notifications_enabled: settings.notificationsEnabled,
    reminder_minutes_before: settings.reminderMinutesBefore,
    streak,
    last_study_date: lastStudyDate,
  };

  const { data, error } = await supabase
    .from('user_settings')
    .update(payload)
    .eq('user_id', uid)
    .select('id')
    .limit(1);

  if (error) {
    showDbError('Configurações', error);
    return;
  }

  if (data && data.length > 0) return;

  const { error: insertError } = await supabase
    .from('user_settings')
    .insert({ user_id: uid, ...payload });

  if (insertError) showDbError('Configurações', insertError);
}

function persistCycle(c: StudyCycle) {
  const uid = getUid();
  if (!uid) return;
  supabase.from('study_cycles').upsert({
    id: c.id, user_id: uid, name: c.name, weekly_hours: c.weeklyHours,
    study_days: c.studyDays, active: c.active,
  }).then(async ({ error }) => {
    if (error) { showDbError('Ciclo', error); return; }
    // Sync blocks
    await supabase.from('cycle_blocks').delete().eq('cycle_id', c.id);
    if (c.blocks.length > 0) {
      await supabase.from('cycle_blocks').insert(
        c.blocks.map(b => ({
          id: b.id, cycle_id: c.id, discipline_id: b.disciplineId,
          block_number: b.number, duration_minutes: b.durationMinutes,
        }))
      );
    }
    // Sync cycle disciplines
    await supabase.from('cycle_disciplines').delete().eq('cycle_id', c.id);
    if (c.disciplines.length > 0) {
      await supabase.from('cycle_disciplines').insert(
        c.disciplines.map(d => ({
          cycle_id: c.id, discipline_id: d.disciplineId,
          importance: d.importance, situation: d.situation, difficulty: d.difficulty,
        }))
      );
    }
  });
}

function persistSimulado(s: Simulado) {
  const uid = getUid();
  if (!uid) return;
  supabase.from('simulados').upsert({
    id: s.id, user_id: uid, date: s.date, banca: s.banca,
    meta_percent: s.metaPercent, has_p2: s.hasP2,
    p1_min_percent: s.p1MinPercent, p2_min_percent: s.p2MinPercent,
    total_min_percent: s.totalMinPercent,
    p1_disciplines: s.p1Disciplines, p2_disciplines: s.p2Disciplines,
  }).then(async ({ error }) => {
    if (error) { showDbError('Simulado', error); return; }
    await supabase.from('simulado_disciplines').delete().eq('simulado_id', s.id);
    if (s.disciplines.length > 0) {
      await supabase.from('simulado_disciplines').insert(
        s.disciplines.map(sd => ({
          simulado_id: s.id, discipline_id: sd.disciplineId,
          questions: sd.questions, weight: sd.weight,
          correct: sd.correct, blank: sd.blank, wrong: sd.wrong,
        }))
      );
    }
  });
}

// ===== Store =====
export const useAppStore = create<AppState & AppActions>()(
  (set, get) => ({
    ...initialState,
    userId: null,
    setUserId: (id) => set({ userId: id } as any),

    updateSettings: (s) => {
      set((state) => ({ settings: { ...state.settings, ...s } }));
      persistSettings();
    },
    completeSetup: () => {
      set((state) => ({ settings: { ...state.settings, setupCompleted: true } }));
      persistSettings();
    },
    completeOnboarding: () => {
      set((state) => ({ settings: { ...state.settings, onboardingCompleted: true } }));
      persistSettings();
    },
    markModuleHint: (module) => {
      set((state) => ({
        settings: { ...state.settings, moduleHints: { ...state.settings.moduleHints, [module]: true } },
      }));
      persistSettings();
    },

    addDiscipline: (d) => {
      set((s) => ({ disciplines: [...s.disciplines, d] }));
      persistDiscipline(d);
    },
    updateDiscipline: (id, d) => {
      set((s) => ({ disciplines: s.disciplines.map((x) => (x.id === id ? { ...x, ...d } : x)) }));
      const updated = get().disciplines.find(x => x.id === id);
      if (updated) persistDiscipline(updated);
    },
    removeDiscipline: (id) => {
      set((s) => ({
        disciplines: s.disciplines.filter((x) => x.id !== id),
        topics: s.topics.filter((t) => t.disciplineId !== id),
      }));
      const uid = getUid();
      if (uid) {
        supabase.from('topics').delete().eq('discipline_id', id).then(() => {});
        supabase.from('disciplines').delete().eq('id', id).then(() => {});
      }
    },
    reorderDisciplines: (disciplines) => {
      set({ disciplines });
      const uid = getUid();
      if (uid) {
        disciplines.forEach((d, i) => {
          supabase.from('disciplines').update({ sort_order: i }).eq('id', d.id).then(() => {});
        });
      }
    },

    addTopic: (t) => {
      set((s) => ({ topics: [...s.topics, t] }));
      persistTopic(t);
    },
    updateTopic: (id, t) => {
      set((s) => ({ topics: s.topics.map((x) => (x.id === id ? { ...x, ...t } : x)) }));
      const updated = get().topics.find(x => x.id === id);
      if (updated) persistTopic(updated);
    },
    removeTopic: (id) => {
      set((s) => ({ topics: s.topics.filter((x) => x.id !== id) }));
      const uid = getUid();
      if (uid) supabase.from('topics').delete().eq('id', id).then(() => {});
    },
    setTopics: (topics) => {
      set({ topics });
      // Persist all (used for reorder)
      topics.forEach(t => persistTopic(t));
    },
    clearTopicsByDiscipline: (did) => {
      set((s) => ({ topics: s.topics.filter((t) => t.disciplineId !== did) }));
      const uid = getUid();
      if (uid) supabase.from('topics').delete().eq('discipline_id', did).then(() => {});
    },
    clearAllTopics: () => {
      set({ topics: [] });
      const uid = getUid();
      if (uid) supabase.from('topics').delete().eq('user_id', uid).then(() => {});
    },

    addStudyRecord: (r) => {
      set((s) => ({ studyRecords: [...s.studyRecords, r] }));
      persistStudyRecord(r);
    },
    updateStudyRecord: (id, r) => {
      set((s) => ({ studyRecords: s.studyRecords.map((x) => (x.id === id ? { ...x, ...r } : x)) }));
      const updated = get().studyRecords.find(x => x.id === id);
      if (updated) persistStudyRecord(updated);
    },
    removeStudyRecord: (id) => {
      set((s) => ({ studyRecords: s.studyRecords.filter((x) => x.id !== id) }));
      const uid = getUid();
      if (uid) supabase.from('study_records').delete().eq('id', id).then(() => {});
    },

    addRevision: (r) => {
      set((s) => ({ revisions: [...s.revisions, r] }));
      persistRevision(r);
    },
    completeRevision: (id) => {
      set((s) => ({ revisions: s.revisions.map((x) => (x.id === id ? { ...x, completed: true } : x)) }));
      const uid = getUid();
      if (uid) supabase.from('revisions').update({ completed: true }).eq('id', id).then(() => {});
    },

    addCycle: (c) => {
      set((s) => ({ cycles: [...s.cycles, c] }));
      persistCycle(c);
    },
    updateCycle: (id, c) => {
      set((s) => ({ cycles: s.cycles.map((x) => (x.id === id ? { ...x, ...c } : x)) }));
      const updated = get().cycles.find(x => x.id === id);
      if (updated) persistCycle(updated);
    },
    removeCycle: (id) => {
      set((s) => ({ cycles: s.cycles.filter((x) => x.id !== id) }));
      const uid = getUid();
      if (uid) {
        supabase.from('cycle_blocks').delete().eq('cycle_id', id).then(() => {});
        supabase.from('cycle_disciplines').delete().eq('cycle_id', id).then(() => {});
        supabase.from('study_cycles').delete().eq('id', id).then(() => {});
      }
    },
    setActiveCycle: (id) => {
      set((s) => ({ cycles: s.cycles.map((x) => ({ ...x, active: x.id === id })) }));
      const uid = getUid();
      if (uid) {
        supabase.from('study_cycles').update({ active: false }).eq('user_id', uid).then(() => {
          supabase.from('study_cycles').update({ active: true }).eq('id', id).then(() => {});
        });
      }
    },

    setScheduleSlots: (slots) => {
      set({ scheduleSlots: slots });
      const uid = getUid();
      if (uid) {
        supabase.from('schedule_slots').delete().eq('user_id', uid).then(() => {
          if (slots.length > 0) {
            supabase.from('schedule_slots').insert(
              slots.map(s => ({
                id: s.id, user_id: uid, cycle_block_id: s.cycleBlockId,
                day_of_week: s.dayOfWeek, start_time: s.startTime, end_time: s.endTime,
              }))
            ).then(() => {});
          }
        });
      }
    },

    addSimulado: (s2) => {
      set((s) => ({ simulados: [...s.simulados, s2] }));
      persistSimulado(s2);
    },
    updateSimulado: (id, s2) => {
      set((s) => ({ simulados: s.simulados.map((x) => (x.id === id ? { ...x, ...s2 } : x)) }));
      const updated = get().simulados.find(x => x.id === id);
      if (updated) persistSimulado(updated);
    },
    removeSimulado: (id) => {
      set((s) => ({ simulados: s.simulados.filter((x) => x.id !== id) }));
      const uid = getUid();
      if (uid) {
        supabase.from('simulado_disciplines').delete().eq('simulado_id', id).then(() => {});
        supabase.from('simulados').delete().eq('id', id).then(() => {});
      }
    },

    saveDailyNote: (note) => {
      set((s) => ({ dailyNotes: [...s.dailyNotes.filter((n) => n.date !== note.date), note] }));
      const uid = getUid();
      if (uid) {
        (async () => {
          const { data, error } = await supabase
            .from('daily_notes')
            .update({ content: note.content })
            .eq('user_id', uid)
            .eq('date', note.date)
            .select('id')
            .limit(1);

          if (error) {
            showDbError('Nota diária', error);
            return;
          }

          if (data && data.length > 0) return;

          const { error: insertError } = await supabase
            .from('daily_notes')
            .insert({ user_id: uid, date: note.date, content: note.content });

          if (insertError) showDbError('Nota diária', insertError);
        })();
      }
    },

    updateStreak: (date) => {
      set((s) => {
        if (s.lastStudyDate === date) return {};
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        const newStreak = s.lastStudyDate === yStr ? s.streak + 1 : 1;
        return { streak: newStreak, lastStudyDate: date };
      });
      persistSettings();
    },

    exportData: () => {
      const { ...state } = get();
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
  })
);
