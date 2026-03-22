
-- 1. ofertas
CREATE TABLE public.ofertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  nicho TEXT DEFAULT '',
  subnicho TEXT DEFAULT '',
  persona TEXT DEFAULT '',
  desejo TEXT DEFAULT '',
  dor TEXT DEFAULT '',
  pensamento_interno TEXT DEFAULT '',
  nivel_consciencia TEXT DEFAULT '',
  mecanismo_unico TEXT DEFAULT '',
  nome_oferta TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'rascunho',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ofertas" ON public.ofertas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. blocos_pagina
CREATE TABLE public.blocos_pagina (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  tipo_bloco TEXT NOT NULL DEFAULT '',
  conteudo JSONB DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blocos_pagina ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocos_pagina" ON public.blocos_pagina FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. agentes_gpt
CREATE TABLE public.agentes_gpt (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  descricao TEXT DEFAULT '',
  prompt_base TEXT DEFAULT '',
  categoria TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agentes_gpt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agentes_gpt" ON public.agentes_gpt FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. outputs_gpt
CREATE TABLE public.outputs_gpt (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agente_id UUID NOT NULL REFERENCES public.agentes_gpt(id) ON DELETE CASCADE,
  oferta_id UUID REFERENCES public.ofertas(id) ON DELETE SET NULL,
  conteudo TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outputs_gpt ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own outputs_gpt" ON public.outputs_gpt FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. metricas_trafego
CREATE TABLE public.metricas_trafego (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  dia INTEGER NOT NULL DEFAULT 0,
  investimento NUMERIC NOT NULL DEFAULT 0,
  receita NUMERIC NOT NULL DEFAULT 0,
  vendas INTEGER NOT NULL DEFAULT 0,
  cpc NUMERIC NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.metricas_trafego ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own metricas_trafego" ON public.metricas_trafego FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. criativos
CREATE TABLE public.criativos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  formato TEXT NOT NULL DEFAULT 'estatico',
  status TEXT NOT NULL DEFAULT 'em_teste',
  url_arquivo TEXT DEFAULT '',
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.criativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own criativos" ON public.criativos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. faturamento
CREATE TABLE public.faturamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  receita_bruta NUMERIC NOT NULL DEFAULT 0,
  num_vendas INTEGER NOT NULL DEFAULT 0,
  ticket_medio NUMERIC NOT NULL DEFAULT 0,
  taxa_conversao NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.faturamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own faturamento" ON public.faturamento FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. entregaveis
CREATE TABLE public.entregaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  tipo TEXT DEFAULT 'checklist',
  concluido BOOLEAN NOT NULL DEFAULT false,
  url_arquivo TEXT DEFAULT '',
  link_pagina_vendas TEXT DEFAULT '',
  link_checkout TEXT DEFAULT '',
  link_drive_criativos TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entregaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own entregaveis" ON public.entregaveis FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. trafego_config (configurações de tráfego por oferta)
CREATE TABLE public.trafego_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oferta_id UUID NOT NULL REFERENCES public.ofertas(id) ON DELETE CASCADE,
  tipo_pagina TEXT DEFAULT 'pagina_venda',
  link_pagina_vendas TEXT DEFAULT '',
  link_checkout TEXT DEFAULT '',
  link_biblioteca_anuncios TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trafego_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own trafego_config" ON public.trafego_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_ofertas_updated_at BEFORE UPDATE ON public.ofertas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blocos_pagina_updated_at BEFORE UPDATE ON public.blocos_pagina FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agentes_gpt_updated_at BEFORE UPDATE ON public.agentes_gpt FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_metricas_trafego_updated_at BEFORE UPDATE ON public.metricas_trafego FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_criativos_updated_at BEFORE UPDATE ON public.criativos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_faturamento_updated_at BEFORE UPDATE ON public.faturamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_entregaveis_updated_at BEFORE UPDATE ON public.entregaveis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trafego_config_updated_at BEFORE UPDATE ON public.trafego_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
