import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '',
    sobrenome: '',
    email: '',
    senha: '',
  });
  const [receberNovidades, setReceberNovidades] = useState(false);
  const [aceitarTermos, setAceitarTermos] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.senha) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!aceitarTermos) {
      toast.error('Você precisa aceitar os termos de uso.');
      return;
    }
    toast.success('Conta criada com sucesso!');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg">
        <h1 className="mb-6 text-center text-3xl font-extrabold text-foreground">
          Cadastre-se
        </h1>

        <p className="mb-6 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">É novo no Elite Concurseiro?</span>
          <br />
          Cadastre sua conta gratuita agora mesmo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            <Label htmlFor="nome" className="w-28 shrink-0 text-right text-sm text-muted-foreground">
              Nome
            </Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="João"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="sobrenome" className="w-28 shrink-0 text-right text-sm text-muted-foreground">
              Sobrenome
            </Label>
            <Input
              id="sobrenome"
              value={form.sobrenome}
              onChange={(e) => handleChange('sobrenome', e.target.value)}
              placeholder="Silva"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="email" className="w-28 shrink-0 text-right text-sm text-muted-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="joao@gmail.com"
            />
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="senha" className="w-28 shrink-0 text-right text-sm text-muted-foreground">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              value={form.senha}
              onChange={(e) => handleChange('senha', e.target.value)}
              placeholder="••••••"
            />
          </div>

          <div className="space-y-3 pl-32">
            <div className="flex items-start gap-2">
              <Checkbox
                id="novidades"
                checked={receberNovidades}
                onCheckedChange={(v) => setReceberNovidades(v === true)}
              />
              <Label htmlFor="novidades" className="text-sm leading-snug text-muted-foreground">
                Desejo receber novidades e dicas de estudo do Elite Concurseiro
              </Label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="termos"
                checked={aceitarTermos}
                onCheckedChange={(v) => setAceitarTermos(v === true)}
              />
              <Label htmlFor="termos" className="text-sm leading-snug text-muted-foreground">
                Aceito os{' '}
                <span className="cursor-pointer text-primary underline">termos de uso</span>, as{' '}
                <span className="cursor-pointer text-primary underline">políticas de privacidade</span> e as{' '}
                <span className="cursor-pointer text-primary underline">políticas de cookies</span>
              </Label>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>
              CANCELAR
            </Button>
            <Button type="submit">CRIAR CONTA</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
