
CREATE TABLE public.moderator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  label text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage moderator permissions"
ON public.moderator_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read moderator permissions"
ON public.moderator_permissions
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.moderator_permissions (permission_key, enabled, label) VALUES
  ('tab_users', true, 'Aba Usuários'),
  ('tab_recent', true, 'Aba Cadastros Recentes'),
  ('tab_metrics', true, 'Aba Métricas'),
  ('tab_collaborators', false, 'Aba Equipe'),
  ('tab_licenses', false, 'Aba Licenças'),
  ('tab_audit', false, 'Aba Auditoria'),
  ('change_roles', false, 'Alterar papéis de usuários'),
  ('view_financial', false, 'Ver dados financeiros (MRR, receita)');
