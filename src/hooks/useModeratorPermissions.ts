import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ModeratorPermission {
  id: string;
  permission_key: string;
  enabled: boolean;
  label: string;
}

export function useModeratorPermissions() {
  const [permissions, setPermissions] = useState<ModeratorPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('moderator_permissions')
      .select('id, permission_key, enabled, label')
      .order('permission_key');
    setPermissions((data as ModeratorPermission[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isAllowed = useCallback(
    (key: string) => permissions.find((p) => p.permission_key === key)?.enabled ?? false,
    [permissions]
  );

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    await supabase
      .from('moderator_permissions')
      .update({ enabled, updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    setPermissions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
  }, []);

  return { permissions, loading, isAllowed, toggle, reload: load };
}
