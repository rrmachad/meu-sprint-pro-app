import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, BookOpen, BarChart3, CalendarDays, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

function Confetti() {
  const [pieces, setPieces] = useState<
    { id: number; x: number; y: number; size: number; color: string; delay: number; rotation: number }[]
  >([]);

  useEffect(() => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(142 72% 55%)',
      'hsl(48 96% 53%)',
      'hsl(262 83% 58%)',
      'hsl(340 82% 52%)',
      'hsl(199 89% 48%)',
    ];
    const generated = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -(Math.random() * 30 + 10),
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 1.5,
      rotation: Math.random() * 360,
    }));
    setPieces(generated);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
          }}
          initial={{ y: `${p.y}vh`, rotate: p.rotation, opacity: 1 }}
          animate={{
            y: '110vh',
            rotate: p.rotation + 720,
            opacity: [1, 1, 0.8, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
    </div>
  );
}

const steps = [
  {
    icon: BookOpen,
    title: 'Configure suas disciplinas',
    description: 'Adicione as matérias do seu edital e organize por peso e dificuldade.',
    link: '/edital',
  },
  {
    icon: CalendarDays,
    title: 'Monte seu ciclo de estudos',
    description: 'Crie blocos de estudo personalizados com horários e dias da semana.',
    link: '/planejamento',
  },
  {
    icon: BarChart3,
    title: 'Acompanhe seus indicadores',
    description: 'Registre sessões de estudo e veja sua evolução em tempo real.',
    link: '/indicadores',
  },
];

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {showConfetti && <Confetti />}

      <motion.div
        className="w-full max-w-lg space-y-8 text-center"
        initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Success icon */}
        <motion.div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Assinatura confirmada!
          </h1>
          <p className="text-muted-foreground text-balance">
            Parabéns! Agora você tem acesso completo ao Meu Sprint Pro.
            <br />
            Veja os próximos passos para começar com tudo.
          </p>
        </div>

        {/* Badge */}
        <motion.div
          className="mx-auto flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Sparkles className="h-4 w-4" />
          Todos os recursos desbloqueados
        </motion.div>

        {/* Next steps */}
        <div className="space-y-3 pt-2 text-left">
          {steps.map((step, i) => (
            <motion.button
              key={step.title}
              onClick={() => navigate(step.link)}
              className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md active:scale-[0.98]"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
            </motion.button>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <Button size="lg" className="w-full" onClick={() => navigate('/')}>
            Ir para o Dashboard
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
