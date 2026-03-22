import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, Lock } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradeModalContextType {
  showUpgradeModal: (feature?: string) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | undefined>(undefined);

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  return ctx;
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | undefined>();
  const navigate = useNavigate();

  const showUpgradeModal = useCallback((feat?: string) => {
    setFeature(feat);
    setOpen(true);
  }, []);

  return (
    <UpgradeModalContext.Provider value={{ showUpgradeModal }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-xl">Funcionalidade Premium</DialogTitle>
            <DialogDescription className="text-center">
              {feature
                ? `"${feature}" está disponível apenas nos planos pagos.`
                : 'Esta funcionalidade está disponível apenas nos planos pagos.'}
              {' '}Faça upgrade para desbloquear todos os recursos do Meu Sprint Pro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <Zap className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-semibold">Básico — R$ 19,90/mês</p>
                <p className="text-xs text-muted-foreground">Até 10 disciplinas, revisões espaçadas e ciclos personalizados</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
              <Crown className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">Premium — R$ 49,90/mês</p>
                <p className="text-xs text-muted-foreground">Tudo ilimitado + simulados avançados + relatórios em PDF</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Agora não
            </Button>
            <Button className="flex-1" onClick={() => { setOpen(false); navigate('/assinatura'); }}>
              Ver Planos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </UpgradeModalContext.Provider>
  );
}
