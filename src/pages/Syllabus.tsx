import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function Syllabus() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <h1 className="text-2xl font-bold">Edital Verticalizado</h1>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Importe seu edital</h3>
          <p className="text-sm text-muted-foreground">Cole o conteúdo programático do edital e o sistema organizará tudo automaticamente.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
