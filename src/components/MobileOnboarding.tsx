import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

const slides = [
  {
    icon: Zap,
    title: 'O fim do estudo amador.',
    description:
      'Esqueça as horas perdidas na cadeira. O Meu Sprint Pro transforma sua preparação em ciclos de alto rendimento, focados em métricas reais e execução impecável.',
  },
  {
    icon: Target,
    title: 'Gestão implacável.',
    description:
      'Abandone as planilhas desorganizadas. Controle suas horas líquidas, taxa de acertos e revisões em um painel milimetrado. Você no comando absoluto da sua rota.',
  },
  {
    icon: TrendingUp,
    title: 'Assuma o seu placar.',
    description:
      'Seja para dominar um idioma, buscar uma certificação ou enfrentar a concorrência de uma prova de alto nível, o resultado exige estratégia.',
  },
];

export function MobileOnboarding() {
  const [current, setCurrent] = useState(0);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const isLast = current === slides.length - 1;

  const next = () => {
    if (isLast) {
      completeOnboarding();
    } else {
      setCurrent((p) => p + 1);
    }
  };

  const skip = () => completeOnboarding();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-background overflow-hidden">
      {/* Skip */}
      <div className="w-full flex justify-end p-6">
        <button
          onClick={skip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Pular
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center w-full max-w-md px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex flex-col items-center text-center gap-8"
          >
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-150" />
              <div className="relative w-24 h-24 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                {(() => {
                  const Icon = slides[current].icon;
                  return <Icon className="w-12 h-12 text-primary" />;
                })()}
              </div>
            </div>

            {/* Text */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {slides[current].title}
              </h1>
              <p className="text-muted-foreground leading-relaxed text-base">
                {slides[current].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: dots + action */}
      <div className="w-full max-w-md px-8 pb-10 space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        {isLast ? (
          <Button
            onClick={next}
            className="w-full h-14 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-[0_0_30px_-5px_hsl(var(--primary)/0.6)] transition-shadow hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.8)]"
          >
            Iniciar Meu Primeiro Sprint
          </Button>
        ) : (
          <Button
            onClick={next}
            variant="outline"
            className="w-full h-12 rounded-xl border-border/60 text-foreground hover:bg-primary/10 hover:border-primary/40"
          >
            Próximo
          </Button>
        )}
      </div>
    </div>
  );
}
