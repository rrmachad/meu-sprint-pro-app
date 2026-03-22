import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  BookOpen, Brain, Target, Clock, BarChart3, Calendar,
  CheckCircle2, Star, Users, Zap, ArrowRight, Shield,
  TrendingUp, Award, Smartphone, ChevronRight, X, Check, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const features = [
  { icon: Clock, title: 'Cronômetro Inteligente', desc: 'Registre suas horas líquidas de estudo com precisão e acompanhe sua evolução diária.' },
  { icon: Target, title: 'Ciclo de Estudos', desc: 'Monte seu ciclo personalizado por disciplina, com pesos de dificuldade e importância.' },
  { icon: Brain, title: 'Revisão Espaçada', desc: 'Sistema de revisão 24h, 7d, 30d e 60d baseado em neurociência para fixação máxima.' },
  { icon: BarChart3, title: 'Indicadores de Performance', desc: 'Dashboards com métricas reais: aproveitamento, horas estudadas, questões e muito mais.' },
  { icon: BookOpen, title: 'Controle de Edital', desc: 'Gerencie tópicos por disciplina e saiba exatamente o que já estudou e o que falta.' },
  { icon: Calendar, title: 'Simulados Estratégicos', desc: 'Registre simulados completos e acompanhe sua evolução por banca e disciplina.' },
];

const stats = [
  { value: '10.000+', label: 'Horas de estudo registradas' },
  { value: '98%', label: 'Taxa de satisfação' },
  { value: '4.9', label: 'Avaliação dos usuários', icon: Star },
  { value: '500+', label: 'Concurseiros ativos' },
];

const testimonials = [
  {
    name: 'Ana Carolina S.',
    role: 'Aprovada — Analista TRT',
    text: 'O Meu Sprint Pro mudou minha rotina de estudos. Consigo ver exatamente onde estou fraca e onde preciso melhorar. Fui aprovada no meu segundo concurso!',
  },
  {
    name: 'Rafael M.',
    role: 'Estudante — Concurso Fiscal',
    text: 'A revisão espaçada é um divisor de águas. Nunca mais esqueci conteúdo que já tinha estudado. A diferença nos simulados foi absurda.',
  },
  {
    name: 'Juliana P.',
    role: 'Aprovada — Técnico INSS',
    text: 'Organizei meu ciclo de estudos em 10 minutos e nunca mais precisei me preocupar com o que estudar. O app pensa por mim!',
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Meu Sprint Pro</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button size="sm" className="gradient-primary glow-primary" asChild>
              <Link to="/cadastro">Criar conta grátis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Zap className="h-3 w-3" /> A plataforma #1 para concurseiros estratégicos
            </span>
          </motion.div>
          <motion.h1
            className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Estude com <span className="text-primary">estratégia</span>.{' '}
            <br className="hidden md:block" />
            Seja <span className="text-primary">aprovado</span> mais rápido.
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Gestão completa dos seus estudos para concursos: ciclo de estudos, revisão espaçada, simulados, indicadores de performance e muito mais — tudo em um só lugar.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Button size="lg" className="gradient-primary glow-primary text-base px-8 h-12" asChild>
              <Link to="/cadastro">
                Comece grátis agora <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              <Shield className="mr-1 inline h-3.5 w-3.5" />
              Sem cartão de crédito • Plano gratuito pra sempre
            </p>
          </motion.div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-border/40 bg-card/50 py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={i}
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-3xl font-extrabold text-primary">{stat.value}</span>
                {stat.icon && <Star className="h-5 w-5 fill-primary text-primary" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            className="text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Tudo que você precisa para ser <span className="text-primary">aprovado</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Ferramentas profissionais de gestão de estudos usadas por concurseiros de alta performance em todo o Brasil.
            </p>
          </motion.div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                className="group rounded-2xl border border-border/40 bg-card p-6 card-hover"
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feat.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/40 bg-card/30 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div
            className="text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Comece em <span className="text-primary">3 passos</span>
            </h2>
          </motion.div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { step: '01', title: 'Crie sua conta grátis', desc: 'Cadastre-se em segundos. Sem burocracia, sem cartão.' },
              { step: '02', title: 'Configure seu concurso', desc: 'Adicione disciplinas, pesos e monte seu ciclo de estudos ideal.' },
              { step: '03', title: 'Estude e acompanhe', desc: 'Registre sessões, faça revisões e veja seus indicadores evoluírem.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                className="relative text-center"
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
              >
                <span className="text-5xl font-extrabold text-primary/15">{item.step}</span>
                <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            className="text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl font-extrabold md:text-4xl">
              O que dizem os <span className="text-primary">aprovados</span>
            </h2>
          </motion.div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="rounded-2xl border border-border/40 bg-card p-6"
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i}
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">"{t.text}"</p>
                <div className="mt-4 border-t border-border/40 pt-4">
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing comparison */}
      <section className="border-y border-border/40 bg-card/30 py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl font-extrabold md:text-4xl">Escolha o plano ideal para sua <span className="text-primary">aprovação</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Comece grátis e faça upgrade quando quiser. Sem surpresas, cancele a qualquer momento.</p>
          </motion.div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {/* Gratuito */}
            <motion.div className="rounded-2xl border border-border/40 bg-card p-6 flex flex-col" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <h3 className="text-lg font-bold">Gratuito</h3>
              <div className="mt-2"><span className="text-3xl font-extrabold">R$ 0</span><span className="text-sm text-muted-foreground">/mês</span></div>
              <p className="mt-2 text-sm text-muted-foreground">Perfeito para começar a organizar seus estudos.</p>
              <ul className="mt-6 space-y-3 flex-1">
                {[
                  { ok: true, text: 'Até 3 disciplinas' },
                  { ok: true, text: 'Cronômetro de estudos' },
                  { ok: true, text: 'Revisão espaçada (24h)' },
                  { ok: true, text: 'Dashboard simplificado' },
                  { ok: false, text: 'Ciclo de estudos' },
                  { ok: false, text: 'Controle de edital' },
                  { ok: false, text: 'Simulados' },
                  { ok: false, text: 'Indicadores avançados' },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2 text-sm">
                    {item.ok ? <Check className="h-4 w-4 text-primary shrink-0" /> : <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                    <span className={item.ok ? '' : 'text-muted-foreground/50'}>{item.text}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-6 w-full" asChild><Link to="/cadastro">Começar grátis</Link></Button>
            </motion.div>

            {/* Básico */}
            <motion.div className="relative rounded-2xl border-2 border-primary bg-card p-6 flex flex-col glow-primary" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-4 py-1 text-xs font-bold text-primary-foreground">MAIS POPULAR</div>
              <h3 className="text-lg font-bold">Básico</h3>
              <div className="mt-2"><span className="text-3xl font-extrabold text-primary">R$ 19,90</span><span className="text-sm text-muted-foreground">/mês</span></div>
              <p className="mt-2 text-sm text-muted-foreground">Para quem leva o concurso a sério.</p>
              <ul className="mt-6 space-y-3 flex-1">
                {[
                  'Até 10 disciplinas',
                  'Cronômetro de estudos',
                  'Revisão espaçada completa',
                  'Dashboard completo',
                  'Ciclo de estudos',
                  'Controle de edital',
                  'Simulados ilimitados',
                  'Indicadores de performance',
                ].map((text) => (
                  <li key={text} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6 w-full gradient-primary glow-primary" asChild><Link to="/cadastro">Assinar Básico</Link></Button>
            </motion.div>

            {/* Premium */}
            <motion.div className="rounded-2xl border border-border/40 bg-card p-6 flex flex-col" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Premium</h3>
                <Crown className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2"><span className="text-3xl font-extrabold">R$ 49,90</span><span className="text-sm text-muted-foreground">/mês</span></div>
              <p className="mt-2 text-sm text-muted-foreground">Máxima performance para quem quer ser aprovado rápido.</p>
              <ul className="mt-6 space-y-3 flex-1">
                {[
                  'Disciplinas ilimitadas',
                  'Tudo do plano Básico',
                  'Relatórios semanais por e-mail',
                  'Lembretes de revisão',
                  'Exportação de dados (PDF)',
                  'Suporte prioritário',
                  'Novas funcionalidades primeiro',
                  'Sem anúncios',
                ].map((text) => (
                  <li key={text} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="mt-6 w-full border-primary text-primary hover:bg-primary/10" asChild><Link to="/cadastro">Assinar Premium</Link></Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits bar */}
      <section className="border-y border-border/40 bg-card/30 py-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 sm:grid-cols-3">
          {[
            { icon: Smartphone, title: 'Estude de qualquer lugar', desc: 'Acesse pelo celular, tablet ou computador. Seus dados sincronizam em tempo real.' },
            { icon: TrendingUp, title: 'Planos a partir de R$ 19,90', desc: 'Acesso ao melhor sistema de gestão de estudos. A partir de R$ 0,66 por dia.' },
            { icon: Award, title: 'Sem custo pra começar', desc: 'Crie sua conta grátis e comece a estudar agora mesmo sem pagar nada.' },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              className="flex gap-4"
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={i}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{item.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4">
          <motion.div className="text-center" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl font-extrabold md:text-4xl">Perguntas <span className="text-primary">frequentes</span></h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Tire suas dúvidas sobre o Meu Sprint Pro.</p>
          </motion.div>
          <motion.div className="mt-10" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: 'O plano gratuito é realmente de graça?', a: 'Sim! Você pode usar o plano gratuito por tempo ilimitado, sem precisar de cartão de crédito. Ele inclui até 3 disciplinas, cronômetro de estudos e revisão espaçada de 24h.' },
                { q: 'Posso mudar de plano a qualquer momento?', a: 'Com certeza. Você pode fazer upgrade ou downgrade a qualquer momento. Se cancelar um plano pago, você mantém acesso até o fim do período já pago.' },
                { q: 'Como funciona a revisão espaçada?', a: 'Nossa revisão espaçada é baseada em neurociência. Após estudar um conteúdo, o sistema agenda revisões em intervalos estratégicos (24h, 7 dias, 30 dias e 60 dias) para maximizar a retenção na memória de longo prazo.' },
                { q: 'O app funciona para qualquer concurso?', a: 'Sim! O Meu Sprint Pro é totalmente personalizável. Você cadastra suas disciplinas, pesos e metas de acordo com o edital do seu concurso específico.' },
                { q: 'Meus dados ficam salvos se eu trocar de celular?', a: 'Sim. Todos os seus dados ficam armazenados na nuvem e sincronizam automaticamente. Basta fazer login em qualquer dispositivo para acessar tudo.' },
                { q: 'Qual a diferença entre o plano Básico e o Premium?', a: 'O Básico inclui até 10 disciplinas e todas as ferramentas essenciais (ciclo de estudos, simulados, indicadores). O Premium oferece disciplinas ilimitadas, relatórios semanais por e-mail, lembretes de revisão, exportação de dados e suporte prioritário.' },
                { q: 'Preciso instalar algum aplicativo?', a: 'Não. O Meu Sprint Pro funciona diretamente no navegador do seu celular, tablet ou computador. Nenhuma instalação necessária.' },
              ].map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border/40 bg-card px-5">
                  <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Não perca mais tempo.{' '}
              <span className="text-primary">Seus concorrentes já estão usando.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Junte-se a centenas de concurseiros que transformaram sua rotina de estudos e conquistaram a aprovação com o Meu Sprint Pro.
            </p>
            <Button size="lg" className="mt-8 gradient-primary glow-primary text-base px-10 h-13" asChild>
              <Link to="/cadastro">
                Criar minha conta grátis <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card/30 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
              <Zap className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold">Meu Sprint Pro</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Meu Sprint Pro. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Entrar</Link>
            <Link to="/cadastro" className="hover:text-foreground transition-colors">Cadastrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
