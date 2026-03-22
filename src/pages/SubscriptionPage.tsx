import { useState, useEffect } from 'react';
import { Check, Crown, Zap, RefreshCw, Settings, BookOpen, Target, Brain, TrendingUp, Key, Gift, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useSubscription, TIERS, TierKey } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const tierFeatures: Record<TierKey, string[]> = {
  basic: [
    'Dashboard de desempenho',
    'Ciclo de estudos personalizado',
    'Controle de revisões espaçadas',
    'Até 10 disciplinas',
    'Registro de sessões de estudo',
  ],
  premium: [
    'Disciplinas ilimitadas',
    'Dashboard avançado com indicadores',
    'Ciclos de estudo inteligentes',
    'Revisões espaçadas completas',
    'Simulados com análise detalhada',
    'Raio-X do edital com progresso',
    'Relatórios e exportação em PDF',
    'Suporte prioritário',
  ],
};

export default function SubscriptionPage() {
  const { subscribed, tier, subscriptionEnd, loading, checkSubscription, createCheckout, openPortal } = useSubscription();
  const { session } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [licenseCode, setLicenseCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const successParam = searchParams.get('success');
  const canceledParam = searchParams.get('canceled');

  useEffect(() => {
    if (successParam === 'true') {
      toast.success('Assinatura realizada com sucesso! Atualizando status...');
      checkSubscription();
    }
    if (canceledParam === 'true') {
      toast.info('Checkout cancelado.');
    }
  }, [successParam, canceledParam, checkSubscription]);

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

  const handleRedeem = async () => {
    if (!licenseCode.trim()) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.functions.invoke('redeem-license', {
        body: { code: licenseCode.trim() },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(data?.message || 'Código resgatado com sucesso!');
      setLicenseCode('');
      checkSubscription();
    } catch {
      toast.error('Erro ao resgatar código. Verifique e tente novamente.');
    } finally {
      setRedeeming(false);
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
          Escolha o plano ideal para acelerar sua aprovação no concurso.
        </p>
      </div>

      {/* Banner informativo */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-center">
            Por que assinar o Meu Sprint Pro?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Ciclos de Estudo</p>
              <p className="text-xs text-muted-foreground">Organize suas matérias com ciclos inteligentes e otimize seu tempo</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Revisões Espaçadas</p>
              <p className="text-xs text-muted-foreground">Nunca mais esqueça o que estudou com revisões no momento certo</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Simulados</p>
              <p className="text-xs text-muted-foreground">Teste seu conhecimento e veja sua evolução com análises detalhadas</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Dashboard</p>
              <p className="text-xs text-muted-foreground">Acompanhe indicadores de desempenho e mantenha o foco na aprovação</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* License Redemption */}
      <Card className="glass border-border/30 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Gift className="h-4 w-4 text-white" />
            </div>
            Tem um código de acesso?
          </CardTitle>
          <CardDescription>
            Insira seu código de licença para desbloquear funcionalidades premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={licenseCode}
                onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
                placeholder="Ex: MSP-A3B5C7D9"
                className="pl-10 glass border-border/30 font-mono tracking-wider"
                maxLength={20}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && licenseCode.trim()) {
                    handleRedeem();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleRedeem}
              disabled={redeeming || !licenseCode.trim()}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 shrink-0"
            >
              {redeeming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Resgatando...
                </>
              ) : (
                'Resgatar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
