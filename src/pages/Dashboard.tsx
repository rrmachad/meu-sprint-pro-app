import { motion } from 'framer-motion';
import { BookOpen, Clock, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function Dashboard() {
  const studyRecords = useAppStore((s) => s.studyRecords);
  const disciplines = useAppStore((s) => s.disciplines);

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = studyRecords.filter((r) => r.date === today);
  const todaySeconds = todayRecords.reduce((a, r) => a + r.durationSeconds, 0);
  const todayQuestions = todayRecords.reduce((a, r) => a + r.correctAnswers + r.wrongAnswers + r.blankAnswers, 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Inicial</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Hoje</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(todaySeconds)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Questões Hoje</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayQuestions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disciplinas</CardTitle>
            <BookOpen className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disciplines.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyRecords.length}</div>
          </CardContent>
        </Card>
      </div>

      {studyRecords.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum estudo registrado ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Comece selecionando uma disciplina e registrando seu primeiro estudo.
              Seu progresso aparecerá aqui!
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
