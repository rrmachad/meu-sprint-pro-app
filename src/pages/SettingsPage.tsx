import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function SettingsPage() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Settings className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Configurações do sistema</h3>
          <p className="text-sm text-muted-foreground">Gerencie seu concurso, disciplinas, metas e preferências.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
