import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AdminRole = 'admin' | 'moderator' | null;

export function useAdmin() {
  const { session } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['admin', 'moderator'])
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setRole((data?.role as AdminRole) || null);
        setLoading(false);
      });
  }, [session?.user?.id]);

  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const hasAccess = isAdmin || isModerator;

  const adminApi = useCallback(
    async (action: string, params: Record<string, unknown> = {}) => {
      if (!session?.access_token) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action, ...params },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data;
    },
    [session?.access_token]
  );

  return { isAdmin, isModerator, hasAccess, role, loading, adminApi };
}
