import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4 }
  })
};

const TermsPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    {/* Nav */}
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link to="/landing" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Meu Sprint Pro</span>
        </Link>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/landing"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
        </Button>
      </div>
    </nav>

    <main className="mx-auto max-w-3xl px-4 pt-28 pb-20">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-3xl font-extrabold md:text-4xl">Termos de Uso & Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 22 de março de 2026</p>
      </motion.div>

      <motion.div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">1. Sobre o Meu Sprint Pro</h2>
          <p>O Meu Sprint Pro é uma plataforma de gestão estratégica de estudos voltada para concurseiros e estudantes que buscam alta performance. Nossa missão é fornecer ferramentas inteligentes para organização, acompanhamento e otimização da rotina de estudos.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">2. Aceitação dos Termos</h2>
          <p>Ao criar uma conta ou utilizar o Meu Sprint Pro, você concorda com estes Termos de Uso e com nossa Política de Privacidade. Caso não concorde, não utilize a plataforma.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">3. Cadastro e Conta</h2>
          <p>Para utilizar a plataforma, é necessário criar uma conta com informações verdadeiras. Você é responsável por manter a confidencialidade de suas credenciais de acesso. Cada conta é pessoal e intransferível.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">4. Planos e Pagamentos</h2>
          <p>O Meu Sprint Pro oferece um plano gratuito com funcionalidades limitadas e planos pagos (Básico — R$ 19,90/mês e Premium — R$ 49,90/mês). Os pagamentos são processados de forma segura via Stripe. Você pode cancelar sua assinatura a qualquer momento, mantendo acesso até o final do período pago.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">5. Uso Adequado</h2>
          <p>Você concorda em utilizar a plataforma apenas para fins legítimos de organização de estudos. É proibido: (a) tentar acessar sistemas não autorizados; (b) distribuir conteúdo malicioso; (c) compartilhar credenciais com terceiros; (d) utilizar a plataforma para fins comerciais sem autorização.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">6. Privacidade e Dados</h2>
          <p>Coletamos apenas os dados necessários para o funcionamento da plataforma: e-mail, dados de estudo (disciplinas, horas, questões) e preferências de configuração. Seus dados são armazenados com criptografia e nunca são vendidos a terceiros. Você pode solicitar a exclusão dos seus dados a qualquer momento entrando em contato conosco.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">7. Propriedade Intelectual</h2>
          <p>Todo o conteúdo, design, código e funcionalidades do Meu Sprint Pro são de propriedade exclusiva da plataforma. Os dados de estudo que você insere permanecem sendo seus.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">8. Limitação de Responsabilidade</h2>
          <p>O Meu Sprint Pro é uma ferramenta de apoio à organização de estudos. Não garantimos aprovação em concursos ou exames. A plataforma é fornecida "como está", e nos esforçamos para manter alta disponibilidade, mas não garantimos funcionamento ininterrupto.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">9. Alterações nos Termos</h2>
          <p>Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas por e-mail ou notificação na plataforma. O uso continuado após alterações constitui aceitação dos novos termos.</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">10. Contato</h2>
          <p>Para dúvidas, sugestões ou solicitações relacionadas a estes termos ou à sua privacidade, entre em contato pelo e-mail: <span className="text-primary font-medium">contato@meusprintpro.com</span></p>
        </section>
      </motion.div>
    </main>

    {/* Footer */}
    <footer className="border-t border-border/40 bg-card/30 py-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
            <Zap className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold">Meu Sprint Pro</span>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Todos os direitos reservados.</p>
      </div>
    </footer>
  </div>
);

export default TermsPage;
