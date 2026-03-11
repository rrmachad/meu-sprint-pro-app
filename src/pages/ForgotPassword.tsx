import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Zap } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Informe seu e-mail.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success('E-mail de recuperação enviado!');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh p-5">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 md:p-10 shadow-elevated space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-neon shadow-neon">
            <Zap className="h-7 w-7 text-neon-green-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Recuperar senha
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Informe seu e-mail para receber o link de redefinição.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Verifique sua caixa de entrada e clique no link para redefinir sua senha.
            </p>
            <Link to="/login" className="text-primary underline underline-offset-4 text-sm font-semibold">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@gmail.com" />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline underline-offset-4">Voltar ao login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;