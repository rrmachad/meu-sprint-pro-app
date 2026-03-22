import { useAppStore } from '@/store/useAppStore';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const DISMISS_KEY = 'setup-banner-dismissed-at';

function isDismissedRecently(): boolean {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const elapsed = Date.now() - Number(ts);
  return elapsed < 24 * 60 * 60 * 1000; // 24h
}

export function SetupBanner() {
  const { isAdmin } = useAdmin();
  const settings = useAppStore((s) => s.settings);
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(isDismissedRecently);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  // Admin never sees banners
  if (isAdmin) return null;
  if (dismissed) return null;

  const TOTAL_ITEMS = 5;
  const checks = [
    { label: 'Seu nome', done: !!settings.contest.candidateName },
    { label: 'Concurso', done: !!settings.contest.name },
    { label: 'Data da prova', done: !!settings.contest.examDate },
    { label: 'Disciplinas', done: useAppStore.getState().disciplines.length > 0 },
    { label: 'Carga horária', done: !!(settings.weeklyHours && settings.weeklyHours > 0) },
  ];
  const completed = checks.filter((c) => c.done).length;
  const missing = checks.filter((c) => !c.done);

  if (missing.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 shadow-md">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="font-semibold text-sm text-foreground">Complete sua configuração</p>
                <span className="text-xs font-bold tabular-nums text-amber-400">{completed}/{TOTAL_ITEMS}</span>
              </div>
              <div className="flex gap-1 mb-2">
                {checks.map((c, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${c.done ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]' : 'bg-muted-foreground/20'}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-500/25"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => navigate('/configuracoes')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1"
              >
                Configurar <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label="Dispensar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
