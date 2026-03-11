import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Zap } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ nome: '', sobrenome: '', email: '', senha: '' });
  const [receberNovidades, setReceberNovidades] = useState(false);
  const [aceitarTermos, setAceitarTermos] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.senha) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!aceitarTermos) {
      toast.error('Você precisa aceitar os termos de uso.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.senha, `${form.nome} ${form.sobrenome}`.trim());
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Conta criada! Verifique seu e-mail para confirmar.');
      navigate('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background gradient-mesh p-5">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl p-8 md:p-10 shadow-elevated space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-neon shadow-neon">
            <Zap className="h-7 w-7 text-neon-green-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Cadastre-se</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-semibold text-foreground">É novo no Meu Sprint Pro?</span><br />
              Cadastre sua conta gratuita agora mesmo.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</Label>
              <Input id="nome" value={form.nome} onChange={(e) => handleChange('nome', e.target.value)} placeholder="João" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sobrenome" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sobrenome</Label>
              <Input id="sobrenome" value={form.sobrenome} onChange={(e) => handleChange('sobrenome', e.target.value)} placeholder="Silva" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="joao@gmail.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</Label>
            <Input id="senha" type="password" value={form.senha} onChange={(e) => handleChange('senha', e.target.value)} placeholder="••••••" />
          </div>
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3">
              <Checkbox id="novidades" checked={receberNovidades} onCheckedChange={(v) => setReceberNovidades(v === true)} className="mt-0.5" />
              <Label htmlFor="novidades" className="text-sm leading-snug text-muted-foreground cursor-pointer">Desejo receber novidades e dicas de estudo</Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="termos" checked={aceitarTermos} onCheckedChange={(v) => setAceitarTermos(v === true)} className="mt-0.5" />
              <Label htmlFor="termos" className="text-sm leading-snug text-muted-foreground cursor-pointer">
                Aceito os <span className="cursor-pointer text-primary underline underline-offset-4">termos de uso</span> e as{' '}
                <span className="cursor-pointer text-primary underline underline-offset-4">políticas de privacidade</span>
              </Label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/login')}>CANCELAR</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Criando...' : 'CRIAR CONTA'}</Button>
          </div>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-primary underline underline-offset-4 font-semibold">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;