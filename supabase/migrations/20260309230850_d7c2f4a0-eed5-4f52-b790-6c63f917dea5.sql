
-- ============ ENUMS ============
CREATE TYPE public.discipline_category AS ENUM ('exatas', 'humanas', 'juridicas', 'mista');
CREATE TYPE public.importance_level AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE public.user_situation AS ENUM ('nunca_estudei', 'razoavelmente', 'ja_estudei');
CREATE TYPE public.difficulty_level AS ENUM ('muita_facilidade', 'leve_facilidade', 'normal', 'leve_dificuldade', 'muita_dificuldade');
CREATE TYPE public.activity_type AS ENUM ('estudo', 'revisao', 'exercicios', 'leitura');
CREATE TYPE public.turno_type AS ENUM ('madrugada', 'manha', 'tarde', 'noite');
CREATE TYPE public.revision_mark AS ENUM ('24h', '7d', '30d', '60d');

-- ============ UPDATED_AT TRIGGER FUNCTION ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ DISCIPLINES ============
CREATE TABLE public.disciplines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.discipline_category NOT NULL DEFAULT 'mista',
  weight NUMERIC NOT NULL DEFAULT 0,
  prova TEXT NOT NULL DEFAULT 'P1',
  default_questions INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cannot_zero BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own disciplines" ON public.disciplines FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_disciplines_updated_at BEFORE UPDATE ON public.disciplines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TOPICS ============
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own topics" ON public.topics FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STUDY RECORDS ============
CREATE TABLE public.study_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  activity_type public.activity_type NOT NULL DEFAULT 'estudo',
  turno public.turno_type NOT NULL DEFAULT 'manha',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  wrong_answers INTEGER NOT NULL DEFAULT 0,
  blank_answers INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  topics_completed TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own study_records" ON public.study_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_study_records_updated_at BEFORE UPDATE ON public.study_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REVISIONS ============
CREATE TABLE public.revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  study_date DATE NOT NULL,
  mark public.revision_mark NOT NULL,
  due_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own revisions" ON public.revisions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_revisions_updated_at BEFORE UPDATE ON public.revisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STUDY CYCLES ============
CREATE TABLE public.study_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekly_hours NUMERIC NOT NULL DEFAULT 40,
  study_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycles" ON public.study_cycles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_study_cycles_updated_at BEFORE UPDATE ON public.study_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CYCLE DISCIPLINES ============
CREATE TABLE public.cycle_disciplines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.study_cycles(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  importance public.importance_level NOT NULL DEFAULT 'media',
  situation public.user_situation NOT NULL DEFAULT 'nunca_estudei',
  difficulty public.difficulty_level NOT NULL DEFAULT 'normal'
);

ALTER TABLE public.cycle_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycle_disciplines" ON public.cycle_disciplines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = cycle_id AND sc.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = cycle_id AND sc.user_id = auth.uid()));

-- ============ CYCLE BLOCKS ============
CREATE TABLE public.cycle_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.study_cycles(id) ON DELETE CASCADE,
  block_number INTEGER NOT NULL DEFAULT 0,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL DEFAULT 60
);

ALTER TABLE public.cycle_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycle_blocks" ON public.cycle_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = cycle_id AND sc.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.study_cycles sc WHERE sc.id = cycle_id AND sc.user_id = auth.uid()));

-- ============ SCHEDULE SLOTS ============
CREATE TABLE public.schedule_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_block_id UUID NOT NULL REFERENCES public.cycle_blocks(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own schedule_slots" ON public.schedule_slots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SIMULADOS ============
CREATE TABLE public.simulados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  banca TEXT NOT NULL DEFAULT '',
  meta_percent NUMERIC NOT NULL DEFAULT 0,
  has_p2 BOOLEAN NOT NULL DEFAULT false,
  p1_min_percent NUMERIC NOT NULL DEFAULT 0,
  p2_min_percent NUMERIC NOT NULL DEFAULT 0,
  total_min_percent NUMERIC NOT NULL DEFAULT 0,
  p1_disciplines UUID[] DEFAULT '{}',
  p2_disciplines UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own simulados" ON public.simulados FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_simulados_updated_at BEFORE UPDATE ON public.simulados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SIMULADO DISCIPLINES ============
CREATE TABLE public.simulado_disciplines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulado_id UUID NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  discipline_id UUID NOT NULL REFERENCES public.disciplines(id) ON DELETE CASCADE,
  questions INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  blank INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.simulado_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own simulado_disciplines" ON public.simulado_disciplines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.simulados s WHERE s.id = simulado_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.simulados s WHERE s.id = simulado_id AND s.user_id = auth.uid()));

-- ============ DAILY NOTES ============
CREATE TABLE public.daily_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_notes" ON public.daily_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_daily_notes_updated_at BEFORE UPDATE ON public.daily_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER SETTINGS ============
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  contest_name TEXT DEFAULT '',
  contest_organ TEXT DEFAULT '',
  exam_date DATE,
  vacancies INTEGER DEFAULT 0,
  candidate_name TEXT DEFAULT '',
  phases JSONB DEFAULT '[{"name":"P1","minPercent":60}]',
  total_min_percent NUMERIC DEFAULT 70,
  revision_enabled BOOLEAN DEFAULT true,
  revision_marks TEXT[] DEFAULT '{24h,7d,30d,60d}',
  weekly_hours NUMERIC DEFAULT 40,
  daily_questions INTEGER DEFAULT 50,
  daily_pages INTEGER DEFAULT 30,
  study_days INTEGER[] DEFAULT '{1,2,3,4,5}',
  onboarding_completed BOOLEAN DEFAULT false,
  setup_completed BOOLEAN DEFAULT false,
  module_hints JSONB DEFAULT '{}',
  notifications_enabled BOOLEAN DEFAULT false,
  reminder_minutes_before INTEGER DEFAULT 5,
  streak INTEGER DEFAULT 0,
  last_study_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ INDEXES ============
CREATE INDEX idx_disciplines_user ON public.disciplines(user_id);
CREATE INDEX idx_topics_discipline ON public.topics(discipline_id);
CREATE INDEX idx_study_records_user_date ON public.study_records(user_id, date);
CREATE INDEX idx_revisions_user_due ON public.revisions(user_id, due_date);
CREATE INDEX idx_simulados_user ON public.simulados(user_id);
