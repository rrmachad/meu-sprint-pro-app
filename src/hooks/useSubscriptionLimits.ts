import { useSubscription } from '@/hooks/useSubscription';

export const FREE_LIMITS = {
  maxDisciplines: 3,
  allowedRevisionMarks: ['24h'] as string[],
} as const;

export function useSubscriptionLimits() {
  const { subscribed, tier, loading } = useSubscription();

  const isFree = !subscribed;
  const isPremium = subscribed && tier === 'premium';

  const maxDisciplines = isFree ? FREE_LIMITS.maxDisciplines : (isPremium ? Infinity : 10);
  const allowedRevisionMarks = isFree ? FREE_LIMITS.allowedRevisionMarks : ['24h', '7d', '30d', '60d'];

  return {
    isFree,
    isPremium,
    loading,
    maxDisciplines,
    allowedRevisionMarks,
    canAddDiscipline: (currentCount: number) => currentCount < maxDisciplines,
    isRevisionMarkAllowed: (mark: string) => allowedRevisionMarks.includes(mark),
  };
}
