import { useState } from 'react';
import { Check, Crown, Zap, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription, TIERS, TierKey } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

const tierFeatures: Record<TierKey, string[]> = {
  basic: [
    'Até 3 ofertas ativas',
    'Construtor de página de vendas',
    'Painel de tráfego D0-D10',
    'Controle de faturamento',
    'Hub de Agentes GPT (2 agentes)',
  ],
  premium: [
    'Ofertas ilimitadas',
    'Construtor de página de vendas',
    'Painel de tráfego D0-D10',
    'Controle de faturamento completo',
    'Hub completo de Agentes GPT',
    'Biblioteca de criativos avançada',
    'Relatórios e exportação',
    'Suporte prioritário',
  ],
};

export default function SubscriptionPage() {
  const { subscribed, tier, subscriptionEnd, loading, checkSubscription, createCheckout, openPortal } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Assinatura realizada com sucesso! Atualizando status...');
      checkSubscription();
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancelado.');
    }
  }, [searchParams, checkSubscription]);

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      await createCheckout(priceId);
    } catch (err) {
      toast.error('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      await openPortal();
    } catch {
      toast.error('Erro ao abrir portal de gerenciamento.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Planos & Assinatura</h1>
        <p className="text-muted-foreground">
          Escolha o plano ideal para escalar suas ofertas de marketing digital.
        </p>
      </div>

      {subscribed && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">
                  Plano {tier ? TIERS[tier].name : 'Ativo'}
                </p>
                {subscriptionEnd && (
                  <p className="text-sm text-muted-foreground">
                    Renova em {new Date(subscriptionEnd).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => checkSubscription()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handlePortal}>
                <Settings className="h-4 w-4 mr-1" /> Gerenciar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {(Object.entries(TIERS) as [TierKey, typeof TIERS[TierKey]][]).map(([key, t]) => {
          const isCurrentTier = subscribed && tier === key;
          const isPremium = key === 'premium';

          return (
            <Card
              key={key}
              className={`relative overflow-hidden transition-all ${
                isPremium ? 'border-primary shadow-lg shadow-primary/10' : ''
              } ${isCurrentTier ? 'ring-2 ring-primary' : ''}`}
            >
              {isPremium && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                    Mais Popular
                  </Badge>
                </div>
              )}
              {isCurrentTier && (
                <div className="absolute top-0 left-0">
                  <Badge variant="secondary" className="rounded-none rounded-br-lg">
                    Seu Plano
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8">
                <div className="flex items-center gap-2 mb-2">
                  {isPremium ? (
                    <Crown className="h-5 w-5 text-primary" />
                  ) : (
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  )}
                  <CardTitle className="text-xl">{t.name}</CardTitle>
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{t.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2.5">
                  {tierFeatures[key].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isPremium ? 'default' : 'outline'}
                  disabled={isCurrentTier || !!checkoutLoading}
                  onClick={() => handleCheckout(t.price_id)}
                >
                  {checkoutLoading === t.price_id
                    ? 'Redirecionando...'
                    : isCurrentTier
                    ? 'Plano Atual'
                    : `Assinar ${t.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
