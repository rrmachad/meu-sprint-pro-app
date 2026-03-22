import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const TIERS = {
  basic: {
    price_id: "price_1TDmShDaZO2bVcEoQMGDlfAw",
    product_id: "prod_UCAoMu0A0dTttd",
    name: "Básico",
    price: "R$ 19,90",
    priceValue: 19.90,
  },
  premium: {
    price_id: "price_1TDmT3DaZO2bVcEo27RorBfU",
    product_id: "prod_UCAoBOozEsM8nQ",
    name: "Premium",
    price: "R$ 49,90",
    priceValue: 49.90,
  },
} as const;

export type TierKey = keyof typeof TIERS;

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  tier: TierKey | null;
  loading: boolean;
}

export function useSubscription() {
  const { session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    tier: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      let tier: TierKey | null = null;
      if (data?.product_id) {
        const found = Object.entries(TIERS).find(([, t]) => t.product_id === data.product_id);
        if (found) tier = found[0] as TierKey;
      }

      setState({
        subscribed: data?.subscribed ?? false,
        productId: data?.product_id ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        tier,
        loading: false,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const createCheckout = async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  const openPortal = async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  return { ...state, checkSubscription, createCheckout, openPortal };
}
