import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Zap } from 'lucide-react';

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
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 md:p-10 shadow-elevated space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-neon shadow-neon">
            <Zap className="h-7 w-7 text-neon-green-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Entrar
            </h1>
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
    </div>
  );
};

export default Login;