import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { lovable } from '@/integrations/lovable/index';
import { Zap, CheckCircle2, Crown } from 'lucide-react';

const FREE_FEATURES = [
  'Dashboard básico de desempenho',
  'Até 3 disciplinas cadastradas',
  'Registro de sessões de estudo',
  'Controle de revisões (marca 24h)',
  'Anotações diárias',
];

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, senha);
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha inválidos.'
        : error.message);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh p-5">
      <div className="flex w-full max-w-4xl rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-elevated overflow-hidden">
        {/* Formulário */}
        <div className="w-full md:w-1/2 p-8 md:p-10 space-y-8">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-neon shadow-neon">
              <Zap className="h-7 w-7 text-neon-green-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Entrar</h1>
              <p className="text-sm text-muted-foreground mt-1">Acesse sua conta Meu Sprint Pro</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••" />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
              {loading ? 'Entrando...' : 'ENTRAR'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou continue com</span></div>
          </div>

          <Button
            variant="outline"
            className="w-full h-12 text-sm font-semibold gap-3"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth('google', {
                redirect_uri: window.location.origin,
              });
              if (error) toast.error('Erro ao entrar com Google.');
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Entrar com Google
          </Button>

          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              <Link to="/esqueci-senha" className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors">Esqueci minha senha</Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Não tem conta?{' '}
              <Link to="/cadastro" className="text-primary hover:text-primary/80 underline underline-offset-4 font-semibold transition-colors">Cadastre-se</Link>
            </p>
          </div>
        </div>

        {/* Painel lateral - benefícios gratuitos */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-center bg-primary/5 border-l border-border/30 p-8 md:p-10 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Comece a estudar <span className="text-primary">sem gastar nada</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Crie sua conta gratuita e tenha acesso a:
            </p>
          </div>
          <ul className="space-y-3">
            {FREE_FEATURES.map((feat) => (
              <li key={feat} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/90">{feat}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-border/30 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Quer avançar nos estudos? Conheça nossos planos
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/cadastro')}>
                Plano Básico
              </Button>
              <Button size="sm" className="flex-1" onClick={() => navigate('/cadastro')}>
                Plano Premium
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;