import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  Discipline, Topic, StudyRecord, RevisionEntry,
  StudyCycle, ScheduleSlot, Simulado, DailyNote, AppSettings,
  CycleDiscipline, CycleBlock, SimuladoDiscipline,
} from '@/types';

// Map DB rows to app types
function mapDiscipline(row: any): Discipline {
  return {
    id: row.id, name: row.name, category: row.category, weight: Number(row.weight),
    prova: row.prova, defaultQuestions: row.default_questions, order: row.sort_order,
    cannotZero: row.cannot_zero,
  };
}

function mapTopic(row: any): Topic {
  return { id: row.id, disciplineId: row.discipline_id, text: row.text, completed: row.completed, order: row.sort_order };
}

function mapStudyRecord(row: any): StudyRecord {
  return {
    id: row.id, disciplineId: row.discipline_id, date: row.date, activityType: row.activity_type,
    turno: row.turno, durationSeconds: row.duration_seconds, correctAnswers: row.correct_answers,
    wrongAnswers: row.wrong_answers, blankAnswers: row.blank_answers, pagesRead: row.pages_read,
    topicsCompleted: row.topics_completed || [], notes: row.notes || '',
  };
}

function mapRevision(row: any): RevisionEntry {
  return {
    id: row.id, disciplineId: row.discipline_id, studyDate: row.study_date,
    mark: row.mark, dueDate: row.due_date, completed: row.completed,
  };
}

function mapScheduleSlot(row: any): ScheduleSlot {
  return { id: row.id, cycleBlockId: row.cycle_block_id, dayOfWeek: row.day_of_week, startTime: row.start_time, endTime: row.end_time };
}

function mapDailyNote(row: any): DailyNote {
  return { date: row.date, content: row.content || '' };
}

// Helper to apply a realtime event to a list in the store
function applyRealtimeEvent<T extends { id: string }>(
  stateKey: string,
  eventType: string,
  newRow: any,
  oldRow: any,
  mapper: (row: any) => T,
) {
  const state = useAppStore.getState() as any;
  const list: T[] = state[stateKey] || [];

  if (eventType === 'INSERT') {
    if (!list.find((item) => item.id === newRow.id)) {
      useAppStore.setState({ [stateKey]: [...list, mapper(newRow)] } as any);
    }
  } else if (eventType === 'UPDATE') {
    useAppStore.setState({
      [stateKey]: list.map((item) => (item.id === newRow.id ? mapper(newRow) : item)),
    } as any);
  } else if (eventType === 'DELETE') {
    useAppStore.setState({
      [stateKey]: list.filter((item) => item.id !== oldRow.id),
    } as any);
  }
}

export function useSupabaseSync() {
  const { user } = useAuth();
  const store = useAppStore;
  const [syncing, setSyncing] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) { setSyncing(false); return; }
    const uid = user.id;

    const [
      { data: disciplines },
      { data: topics },
      { data: records },
      { data: revisions },
      { data: cycles },
      { data: slots },
      { data: simulados },
      { data: simDisciplines },
      { data: notes },
      { data: settingsRows },
    ] = await Promise.all([
      supabase.from('disciplines').select('*').order('sort_order'),
      supabase.from('topics').select('*').order('sort_order'),
      supabase.from('study_records').select('*').order('date', { ascending: false }),
      supabase.from('revisions').select('*').order('due_date'),
      supabase.from('study_cycles').select('*').order('created_at'),
      supabase.from('schedule_slots').select('*'),
      supabase.from('simulados').select('*').order('date', { ascending: false }),
      supabase.from('simulado_disciplines').select('*'),
      supabase.from('daily_notes').select('*').order('date', { ascending: false }),
      supabase.from('user_settings').select('*').eq('user_id', uid).limit(1),
    ]);

    // Load cycle blocks and cycle disciplines for each cycle
    const cycleIds = (cycles || []).map(c => c.id);
    let cycleBlocks: any[] = [];
    let cycleDisciplines: any[] = [];
    if (cycleIds.length > 0) {
      const [{ data: blocks }, { data: cDiscs }] = await Promise.all([
        supabase.from('cycle_blocks').select('*').in('cycle_id', cycleIds),
        supabase.from('cycle_disciplines').select('*').in('cycle_id', cycleIds),
      ]);
      cycleBlocks = blocks || [];
      cycleDisciplines = cDiscs || [];
    }

    // Map cycles with their blocks and disciplines
    const mappedCycles: StudyCycle[] = (cycles || []).map(c => ({
      id: c.id,
      name: c.name,
      weeklyHours: Number(c.weekly_hours),
      studyDays: c.study_days || [1,2,3,4,5],
      createdAt: c.created_at,
      active: c.active,
      blocks: cycleBlocks
        .filter(b => b.cycle_id === c.id)
        .sort((a: any, b: any) => a.block_number - b.block_number)
        .map((b: any): CycleBlock => ({
          id: b.id, number: b.block_number, disciplineId: b.discipline_id, durationMinutes: b.duration_minutes,
        })),
      disciplines: cycleDisciplines
        .filter(d => d.cycle_id === c.id)
        .map((d: any): CycleDiscipline => ({
          disciplineId: d.discipline_id, importance: d.importance, situation: d.situation, difficulty: d.difficulty,
        })),
    }));

    // Map simulados with their disciplines
    const mappedSimulados: Simulado[] = (simulados || []).map(s => ({
      id: s.id, date: s.date, banca: s.banca, metaPercent: Number(s.meta_percent),
      hasP2: s.has_p2, p1MinPercent: Number(s.p1_min_percent), p2MinPercent: Number(s.p2_min_percent),
      totalMinPercent: Number(s.total_min_percent),
      p1Disciplines: s.p1_disciplines || [], p2Disciplines: s.p2_disciplines || [],
      createdAt: s.created_at,
      disciplines: (simDisciplines || [])
        .filter(sd => sd.simulado_id === s.id)
        .map((sd: any): SimuladoDiscipline => ({
          disciplineId: sd.discipline_id, questions: sd.questions, weight: Number(sd.weight),
          correct: sd.correct, blank: sd.blank, wrong: sd.wrong,
        })),
    }));

    // Map settings
    const s = settingsRows?.[0];
    if (s) {
      const phases = Array.isArray(s.phases) ? s.phases : [{ name: 'P1', minPercent: 60 }];
      const settings: AppSettings = {
        contest: {
          name: s.contest_name || '', organ: s.contest_organ || '', examDate: s.exam_date || '',
          vacancies: s.vacancies || 0, candidateName: s.candidate_name || '',
          phases: phases as any, totalMinPercent: Number(s.total_min_percent) || 70,
        },
        revision: { enabled: s.revision_enabled ?? true, marks: (s.revision_marks || ['24h','7d','30d','60d']) as any },
        goals: { weeklyHours: Number(s.weekly_hours) || 40, dailyQuestions: s.daily_questions || 50, dailyPages: s.daily_pages || 30 },
        weeklyHours: Number(s.weekly_hours) || 40,
        studyDays: s.study_days || [1,2,3,4,5],
        onboardingCompleted: s.onboarding_completed ?? false,
        setupCompleted: s.setup_completed ?? false,
        moduleHints: (s.module_hints as Record<string, boolean>) || {},
        notificationsEnabled: s.notifications_enabled ?? false,
        reminderMinutesBefore: s.reminder_minutes_before ?? 5,
      };
      store.setState({ settings, streak: s.streak || 0, lastStudyDate: s.last_study_date || null });
    }

    store.setState({
      disciplines: (disciplines || []).map(mapDiscipline),
      topics: (topics || []).map(mapTopic),
      studyRecords: (records || []).map(mapStudyRecord),
      revisions: (revisions || []).map(mapRevision),
      cycles: mappedCycles,
      scheduleSlots: (slots || []).map(mapScheduleSlot),
      simulados: mappedSimulados,
      dailyNotes: (notes || []).map(mapDailyNote),
    });
    setSyncing(false);
  }, [user]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplines' }, (payload) => {
        applyRealtimeEvent('disciplines', payload.eventType, payload.new, payload.old, mapDiscipline);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topics' }, (payload) => {
        applyRealtimeEvent('topics', payload.eventType, payload.new, payload.old, mapTopic);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_records' }, (payload) => {
        applyRealtimeEvent('studyRecords', payload.eventType, payload.new, payload.old, mapStudyRecord);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revisions' }, (payload) => {
        applyRealtimeEvent('revisions', payload.eventType, payload.new, payload.old, mapRevision);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_slots' }, (payload) => {
        applyRealtimeEvent('scheduleSlots', payload.eventType, payload.new, payload.old, mapScheduleSlot);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_notes' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const state = useAppStore.getState();
          useAppStore.setState({
            dailyNotes: state.dailyNotes.filter(n => n.date !== (payload.old as any).date),
          });
        } else {
          const mapped = mapDailyNote(payload.new);
          const state = useAppStore.getState();
          const exists = state.dailyNotes.find(n => n.date === mapped.date);
          useAppStore.setState({
            dailyNotes: exists
              ? state.dailyNotes.map(n => n.date === mapped.date ? mapped : n)
              : [...state.dailyNotes, mapped],
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_settings' }, () => {
        // Reload settings fully to avoid partial mapping
        loadAll();
      })
      // For cycles/simulados with sub-tables, do a full reload for consistency
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_cycles' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycle_blocks' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycle_disciplines' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'simulados' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'simulado_disciplines' }, () => loadAll())
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, loadAll]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { reload: loadAll, syncing };
}
