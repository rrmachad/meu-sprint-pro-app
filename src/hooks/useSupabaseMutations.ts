import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type {
  Discipline, Topic, StudyRecord, RevisionEntry,
  StudyCycle, ScheduleSlot, Simulado, DailyNote, AppSettings,
} from '@/types';

export function useSupabaseMutations() {
  const { user } = useAuth();
  const uid = user?.id;

  // Helper for error handling
  const handle = async (promise: PromiseLike<{ error: any }>) => {
    const { error } = await promise;
    if (error) {
      console.error(error);
      toast.error('Erro ao salvar: ' + error.message);
      return false;
    }
    return true;
  };

  // === Disciplines ===
  const saveDiscipline = async (d: Discipline) => {
    if (!uid) return;
    const ok = await handle(supabase.from('disciplines').upsert({
      id: d.id, user_id: uid, name: d.name, category: d.category, weight: d.weight,
      prova: d.prova, default_questions: d.defaultQuestions, sort_order: d.order,
      cannot_zero: d.cannotZero || false,
    }));
    if (ok) useAppStore.getState().addDiscipline(d);
  };

  const updateDiscipline = async (id: string, d: Partial<Discipline>) => {
    if (!uid) return;
    const update: any = {};
    if (d.name !== undefined) update.name = d.name;
    if (d.category !== undefined) update.category = d.category;
    if (d.weight !== undefined) update.weight = d.weight;
    if (d.prova !== undefined) update.prova = d.prova;
    if (d.defaultQuestions !== undefined) update.default_questions = d.defaultQuestions;
    if (d.order !== undefined) update.sort_order = d.order;
    if (d.cannotZero !== undefined) update.cannot_zero = d.cannotZero;
    const ok = await handle(supabase.from('disciplines').update(update).eq('id', id));
    if (ok) useAppStore.getState().updateDiscipline(id, d);
  };

  const removeDiscipline = async (id: string) => {
    if (!uid) return;
    const ok = await handle(supabase.from('disciplines').delete().eq('id', id));
    if (ok) useAppStore.getState().removeDiscipline(id);
  };

  const reorderDisciplines = async (disciplines: Discipline[]) => {
    if (!uid) return;
    const updates = disciplines.map((d, i) =>
      supabase.from('disciplines').update({ sort_order: i }).eq('id', d.id)
    );
    await Promise.all(updates);
    useAppStore.getState().reorderDisciplines(disciplines);
  };

  // === Topics ===
  const saveTopic = async (t: Topic) => {
    if (!uid) return;
    const ok = await handle(supabase.from('topics').upsert({
      id: t.id, user_id: uid, discipline_id: t.disciplineId, text: t.text,
      completed: t.completed, sort_order: t.order,
    }));
    if (ok) useAppStore.getState().addTopic(t);
  };

  const updateTopic = async (id: string, t: Partial<Topic>) => {
    if (!uid) return;
    const update: any = {};
    if (t.text !== undefined) update.text = t.text;
    if (t.completed !== undefined) update.completed = t.completed;
    if (t.order !== undefined) update.sort_order = t.order;
    if (t.disciplineId !== undefined) update.discipline_id = t.disciplineId;
    const ok = await handle(supabase.from('topics').update(update).eq('id', id));
    if (ok) useAppStore.getState().updateTopic(id, t);
  };

  const removeTopic = async (id: string) => {
    if (!uid) return;
    const ok = await handle(supabase.from('topics').delete().eq('id', id));
    if (ok) useAppStore.getState().removeTopic(id);
  };

  // === Study Records ===
  const saveStudyRecord = async (r: StudyRecord) => {
    if (!uid) return;
    const ok = await handle(supabase.from('study_records').upsert({
      id: r.id, user_id: uid, discipline_id: r.disciplineId, date: r.date,
      activity_type: r.activityType, turno: r.turno, duration_seconds: r.durationSeconds,
      correct_answers: r.correctAnswers, wrong_answers: r.wrongAnswers,
      blank_answers: r.blankAnswers, pages_read: r.pagesRead,
      topics_completed: r.topicsCompleted, notes: r.notes,
    }));
    if (ok) useAppStore.getState().addStudyRecord(r);
  };

  const updateStudyRecord = async (id: string, r: Partial<StudyRecord>) => {
    if (!uid) return;
    const update: any = {};
    if (r.disciplineId !== undefined) update.discipline_id = r.disciplineId;
    if (r.date !== undefined) update.date = r.date;
    if (r.activityType !== undefined) update.activity_type = r.activityType;
    if (r.turno !== undefined) update.turno = r.turno;
    if (r.durationSeconds !== undefined) update.duration_seconds = r.durationSeconds;
    if (r.correctAnswers !== undefined) update.correct_answers = r.correctAnswers;
    if (r.wrongAnswers !== undefined) update.wrong_answers = r.wrongAnswers;
    if (r.blankAnswers !== undefined) update.blank_answers = r.blankAnswers;
    if (r.pagesRead !== undefined) update.pages_read = r.pagesRead;
    if (r.topicsCompleted !== undefined) update.topics_completed = r.topicsCompleted;
    if (r.notes !== undefined) update.notes = r.notes;
    const ok = await handle(supabase.from('study_records').update(update).eq('id', id));
    if (ok) useAppStore.getState().updateStudyRecord(id, r);
  };

  const removeStudyRecord = async (id: string) => {
    if (!uid) return;
    const ok = await handle(supabase.from('study_records').delete().eq('id', id));
    if (ok) useAppStore.getState().removeStudyRecord(id);
  };

  // === Revisions ===
  const saveRevision = async (r: RevisionEntry) => {
    if (!uid) return;
    const ok = await handle(supabase.from('revisions').upsert({
      id: r.id, user_id: uid, discipline_id: r.disciplineId, study_date: r.studyDate,
      mark: r.mark, due_date: r.dueDate, completed: r.completed,
    }));
    if (ok) useAppStore.getState().addRevision(r);
  };

  const completeRevision = async (id: string) => {
    if (!uid) return;
    const ok = await handle(supabase.from('revisions').update({ completed: true }).eq('id', id));
    if (ok) useAppStore.getState().completeRevision(id);
  };

  // === Cycles ===
  const saveCycle = async (c: StudyCycle) => {
    if (!uid) return;
    // Save cycle
    const ok = await handle(supabase.from('study_cycles').upsert({
      id: c.id, user_id: uid, name: c.name, weekly_hours: c.weeklyHours,
      study_days: c.studyDays, active: c.active,
    }));
    if (!ok) return;

    // Save blocks
    if (c.blocks.length > 0) {
      await supabase.from('cycle_blocks').delete().eq('cycle_id', c.id);
      await supabase.from('cycle_blocks').insert(
        c.blocks.map(b => ({
          id: b.id, cycle_id: c.id, discipline_id: b.disciplineId,
          block_number: b.number, duration_minutes: b.durationMinutes,
        }))
      );
    }

    // Save cycle disciplines
    if (c.disciplines.length > 0) {
      await supabase.from('cycle_disciplines').delete().eq('cycle_id', c.id);
      await supabase.from('cycle_disciplines').insert(
        c.disciplines.map(d => ({
          cycle_id: c.id, discipline_id: d.disciplineId,
          importance: d.importance, situation: d.situation, difficulty: d.difficulty,
        }))
      );
    }

    useAppStore.getState().addCycle(c);
  };

  const updateCycle = async (id: string, c: Partial<StudyCycle>) => {
    if (!uid) return;
    const update: any = {};
    if (c.name !== undefined) update.name = c.name;
    if (c.weeklyHours !== undefined) update.weekly_hours = c.weeklyHours;
    if (c.studyDays !== undefined) update.study_days = c.studyDays;
    if (c.active !== undefined) update.active = c.active;
    
    if (Object.keys(update).length > 0) {
      await handle(supabase.from('study_cycles').update(update).eq('id', id));
    }

    if (c.blocks) {
      await supabase.from('cycle_blocks').delete().eq('cycle_id', id);
      if (c.blocks.length > 0) {
        await supabase.from('cycle_blocks').insert(
          c.blocks.map(b => ({
            id: b.id, cycle_id: id, discipline_id: b.disciplineId,
            block_number: b.number, duration_minutes: b.durationMinutes,
          }))
        );
      }
    }

    if (c.disciplines) {
      await supabase.from('cycle_disciplines').delete().eq('cycle_id', id);
      if (c.disciplines.length > 0) {
        await supabase.from('cycle_disciplines').insert(
          c.disciplines.map(d => ({
            cycle_id: id, discipline_id: d.disciplineId,
            importance: d.importance, situation: d.situation, difficulty: d.difficulty,
          }))
        );
      }
    }

    useAppStore.getState().updateCycle(id, c);
  };

  const removeCycle = async (id: string) => {
    if (!uid) return;
    await supabase.from('cycle_blocks').delete().eq('cycle_id', id);
    await supabase.from('cycle_disciplines').delete().eq('cycle_id', id);
    const ok = await handle(supabase.from('study_cycles').delete().eq('id', id));
    if (ok) useAppStore.getState().removeCycle(id);
  };

  const setActiveCycle = async (id: string) => {
    if (!uid) return;
    // Deactivate all, then activate one
    await supabase.from('study_cycles').update({ active: false }).eq('user_id', uid);
    await supabase.from('study_cycles').update({ active: true }).eq('id', id);
    useAppStore.getState().setActiveCycle(id);
  };

  // === Schedule Slots ===
  const saveScheduleSlots = async (slots: ScheduleSlot[]) => {
    if (!uid) return;
    await supabase.from('schedule_slots').delete().eq('user_id', uid);
    if (slots.length > 0) {
      await handle(supabase.from('schedule_slots').insert(
        slots.map(s => ({
          id: s.id, user_id: uid, cycle_block_id: s.cycleBlockId,
          day_of_week: s.dayOfWeek, start_time: s.startTime, end_time: s.endTime,
        }))
      ));
    }
    useAppStore.getState().setScheduleSlots(slots);
  };

  // === Simulados ===
  const saveSimulado = async (s: Simulado) => {
    if (!uid) return;
    const ok = await handle(supabase.from('simulados').upsert({
      id: s.id, user_id: uid, date: s.date, banca: s.banca,
      meta_percent: s.metaPercent, has_p2: s.hasP2,
      p1_min_percent: s.p1MinPercent, p2_min_percent: s.p2MinPercent,
      total_min_percent: s.totalMinPercent,
      p1_disciplines: s.p1Disciplines, p2_disciplines: s.p2Disciplines,
    }));
    if (!ok) return;

    // Save simulado disciplines
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
    useAppStore.getState().addSimulado(s);
  };

  const updateSimulado = async (id: string, s: Partial<Simulado>) => {
    if (!uid) return;
    const update: any = {};
    if (s.date !== undefined) update.date = s.date;
    if (s.banca !== undefined) update.banca = s.banca;
    if (s.metaPercent !== undefined) update.meta_percent = s.metaPercent;
    if (s.hasP2 !== undefined) update.has_p2 = s.hasP2;
    if (s.p1MinPercent !== undefined) update.p1_min_percent = s.p1MinPercent;
    if (s.p2MinPercent !== undefined) update.p2_min_percent = s.p2MinPercent;
    if (s.totalMinPercent !== undefined) update.total_min_percent = s.totalMinPercent;
    if (s.p1Disciplines !== undefined) update.p1_disciplines = s.p1Disciplines;
    if (s.p2Disciplines !== undefined) update.p2_disciplines = s.p2Disciplines;

    if (Object.keys(update).length > 0) {
      await handle(supabase.from('simulados').update(update).eq('id', id));
    }

    if (s.disciplines) {
      await supabase.from('simulado_disciplines').delete().eq('simulado_id', id);
      if (s.disciplines.length > 0) {
        await supabase.from('simulado_disciplines').insert(
          s.disciplines.map(sd => ({
            simulado_id: id, discipline_id: sd.disciplineId,
            questions: sd.questions, weight: sd.weight,
            correct: sd.correct, blank: sd.blank, wrong: sd.wrong,
          }))
        );
      }
    }

    useAppStore.getState().updateSimulado(id, s);
  };

  const removeSimulado = async (id: string) => {
    if (!uid) return;
    await supabase.from('simulado_disciplines').delete().eq('simulado_id', id);
    const ok = await handle(supabase.from('simulados').delete().eq('id', id));
    if (ok) useAppStore.getState().removeSimulado(id);
  };

  // === Daily Notes ===
  const saveDailyNote = async (note: DailyNote) => {
    if (!uid) return;
    const ok = await handle(supabase.from('daily_notes').upsert(
      { user_id: uid, date: note.date, content: note.content },
      { onConflict: 'user_id,date' }
    ));
    if (ok) useAppStore.getState().saveDailyNote(note);
  };

  // === Settings ===
  const saveSettings = async (settings: AppSettings) => {
    if (!uid) return;
    const state = useAppStore.getState();
    await handle(supabase.from('user_settings').upsert({
      user_id: uid,
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
      streak: state.streak,
      last_study_date: state.lastStudyDate,
    }, { onConflict: 'user_id' }));
    useAppStore.getState().updateSettings(settings);
  };

  const saveStreak = async (date: string) => {
    if (!uid) return;
    useAppStore.getState().updateStreak(date);
    const state = useAppStore.getState();
    await supabase.from('user_settings').update({
      streak: state.streak,
      last_study_date: state.lastStudyDate,
    }).eq('user_id', uid);
  };

  return {
    saveDiscipline, updateDiscipline, removeDiscipline, reorderDisciplines,
    saveTopic, updateTopic, removeTopic,
    saveStudyRecord, updateStudyRecord, removeStudyRecord,
    saveRevision, completeRevision,
    saveCycle, updateCycle, removeCycle, setActiveCycle,
    saveScheduleSlots,
    saveSimulado, updateSimulado, removeSimulado,
    saveDailyNote,
    saveSettings, saveStreak,
  };
}
