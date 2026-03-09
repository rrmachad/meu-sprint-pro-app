import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ClipboardList, Plus, Trash2, Edit2, Check, X, Upload,
  ChevronDown, ChevronRight, GripVertical, FileText, Sparkles,
  CheckCircle2, Circle, Percent, Filter, Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { Topic, Discipline } from '@/types';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// ========== SMART PARSER ==========
// Splits text by "." but preserves dots in law references like "Lei nº 8.429/1992", "art. 5º", "nº 6.404", decimal numbers, etc.
function parseTopics(rawText: string): string[] {
  // Replace law-style dots with placeholder
  let text = rawText;

  // Protect patterns: numbers with dots (8.429, 6.404, 10.520, 1.234.567)
  text = text.replace(/(\d)\.(\d)/g, '$1⟨DOT⟩$2');

  // Protect abbreviations: art., nº., inc., etc.
  const abbreviations = ['art', 'inc', 'nº', 'n°', 'nr', 'parágrafo', 'alínea', 'cf', 'ex', 'obs', 'prof', 'dr', 'dra', 'sr', 'sra', 'ltda', 'cia', 'etc'];
  abbreviations.forEach((abbr) => {
    const re = new RegExp(`\\b(${abbr})\\.`, 'gi');
    text = text.replace(re, `$1⟨DOT⟩`);
  });

  // Split by period followed by space and capital letter, or period at end
  const parts = text
    .split(/\.\s+/)
    .map((s) => s.replace(/⟨DOT⟩/g, '.').trim())
    .filter((s) => s.length > 2);

  // Also split by newlines if present
  const result: string[] = [];
  parts.forEach((part) => {
    const lines = part.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 2);
    result.push(...lines);
  });

  // Remove leading numbers/bullets like "1.", "1)", "- ", "• "
  return result.map((t) => t.replace(/^[\d]+[.)]\s*/, '').replace(/^[-•·]\s*/, '').trim()).filter((t) => t.length > 2);
}

// ========== IMPORT DIALOG ==========
function ImportDialog({
  open,
  onOpenChange,
  disciplines,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disciplines: Discipline[];
  onImport: (disciplineId: string, topics: string[]) => void;
}) {
  const [rawText, setRawText] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [preview, setPreview] = useState<string[]>([]);

  const handleParse = () => {
    const topics = parseTopics(rawText);
    setPreview(topics);
  };

  const handleImport = () => {
    if (!selectedDiscipline) {
      toast.error('Selecione uma disciplina.');
      return;
    }
    if (preview.length === 0) {
      toast.error('Nenhum tópico para importar. Cole o conteúdo e clique em "Analisar".');
      return;
    }
    onImport(selectedDiscipline, preview);
    setRawText('');
    setPreview([]);
    setSelectedDiscipline('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importação Inteligente do Edital
          </DialogTitle>
          <DialogDescription>
            Cole o conteúdo programático do edital. O sistema identificará e separará os tópicos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Disciplina de destino</Label>
            <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a disciplina..." />
              </SelectTrigger>
              <SelectContent>
                {disciplines.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Conteúdo Programático</Label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o conteúdo programático do edital. Exemplo:&#10;&#10;Direito Constitucional: Princípios fundamentais. Direitos e garantias fundamentais. Organização do Estado. Organização dos Poderes..."
              className="min-h-[160px] text-sm font-mono"
            />
          </div>

          <Button onClick={handleParse} variant="outline" className="w-full gap-2" disabled={!rawText.trim()}>
            <Sparkles className="h-4 w-4" />
            Analisar Conteúdo ({rawText.trim() ? 'Detectar tópicos' : 'Cole o texto acima'})
          </Button>

          {preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Tópicos detectados ({preview.length})
                </Label>
                <Badge variant="secondary" className="text-xs">
                  Prévia
                </Badge>
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                {preview.map((topic, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0 text-xs mt-0.5 w-5 text-right">{i + 1}.</span>
                    <span className="text-foreground">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={preview.length === 0 || !selectedDiscipline} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar {preview.length} Tópicos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to highlight search matches
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-warning/30 text-foreground rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ========== TOPIC ROW (Sortable) ==========
function TopicRow({
  topic,
  onToggle,
  onUpdate,
  onDelete,
  searchQuery = '',
}: {
  topic: Topic;
  onToggle: () => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  searchQuery?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(topic.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  const startEdit = () => {
    setEditText(topic.text);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const saveEdit = () => {
    if (editText.trim()) {
      onUpdate(editText.trim());
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditText(topic.text);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-1 rounded-lg px-2 py-2 transition-colors ${
        topic.completed ? 'bg-success/5' : 'hover:bg-muted/50'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:text-muted-foreground touch-none"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <Checkbox
        checked={topic.completed}
        onCheckedChange={onToggle}
        className="mt-0.5 shrink-0"
      />

      {editing ? (
        <div className="flex-1 flex items-center gap-1.5">
          <Input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="text-sm h-7"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={saveEdit}>
            <Check className="h-3.5 w-3.5 text-success" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEdit}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 text-sm leading-relaxed cursor-pointer select-none ${
              topic.completed ? 'line-through text-muted-foreground' : 'text-foreground'
            }`}
            onDoubleClick={startEdit}
          >
            <HighlightText text={topic.text} query={searchQuery} />
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startEdit}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ========== DISCIPLINE ACCORDION ==========
function DisciplineSection({ discipline, statusFilter = 'all', searchQuery = '' }: { discipline: Discipline; statusFilter?: 'all' | 'pending' | 'completed'; searchQuery?: string }) {
  const allDisciplineTopics = useAppStore((s) => s.topics.filter((t) => t.disciplineId === discipline.id));
  const topics = allDisciplineTopics.filter((t) => {
    if (statusFilter === 'pending' && t.completed) return false;
    if (statusFilter === 'completed' && !t.completed) return false;
    if (searchQuery.trim() && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  const allTopics = useAppStore((s) => s.topics);
  const { addTopic, updateTopic, removeTopic, setTopics } = useAppStore();
  const [newTopicText, setNewTopicText] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortedTopics = [...topics].sort((a, b) => a.order - b.order);
  const completed = allDisciplineTopics.filter((t) => t.completed).length;
  const total = allDisciplineTopics.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedTopics.findIndex((t) => t.id === active.id);
    const newIndex = sortedTopics.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(sortedTopics, oldIndex, newIndex).map((t, i) => ({ ...t, order: i }));

    // Merge with other discipline topics
    const otherTopics = allTopics.filter((t) => t.disciplineId !== discipline.id);
    setTopics([...otherTopics, ...reordered]);
  };

  const handleToggle = (id: string, current: boolean) => {
    updateTopic(id, { completed: !current });
  };

  const handleAddTopic = () => {
    if (!newTopicText.trim()) return;
    const topic: Topic = {
      id: crypto.randomUUID(),
      disciplineId: discipline.id,
      text: newTopicText.trim(),
      completed: false,
      order: topics.length,
    };
    addTopic(topic);
    setNewTopicText('');
    toast.success('Tópico adicionado!');
  };

  const handleUpdateTopic = (id: string, text: string) => {
    updateTopic(id, { text });
    toast.success('Tópico atualizado!');
  };

  const handleDeleteTopic = (id: string) => {
    removeTopic(id);
    toast.success('Tópico removido!');
  };

  return (
    <AccordionItem value={discipline.id} className="border rounded-lg overflow-hidden bg-card">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{discipline.name}</span>
              <Badge variant="outline" className="text-[10px]">{discipline.prova}</Badge>
              {discipline.cannotZero && (
                <Badge variant="destructive" className="text-[10px]">Não pode zerar</Badge>
              )}
            </div>
            {total > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={percent} className="h-1.5 flex-1 max-w-[200px]" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {completed}/{total} ({percent}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-0">
        <div className="space-y-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedTopics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {sortedTopics.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  onToggle={() => handleToggle(topic.id, topic.completed)}
                  onUpdate={(text) => handleUpdateTopic(topic.id, text)}
                  onDelete={() => handleDeleteTopic(topic.id)}
                  searchQuery={searchQuery}
                />
              ))}
            </SortableContext>
          </DndContext>

          {topics.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum tópico cadastrado. Use a importação inteligente ou adicione manualmente.
            </p>
          )}

          {/* Add topic inline */}
          {addingTopic ? (
            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newTopicText}
                onChange={(e) => setNewTopicText(e.target.value)}
                placeholder="Novo tópico..."
                className="text-sm h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTopic();
                  if (e.key === 'Escape') {
                    setAddingTopic(false);
                    setNewTopicText('');
                  }
                }}
              />
              <Button size="sm" className="h-8 gap-1" onClick={handleAddTopic} disabled={!newTopicText.trim()}>
                <Check className="h-3.5 w-3.5" /> Adicionar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => { setAddingTopic(false); setNewTopicText(''); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => setAddingTopic(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar tópico manualmente
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ========== MAIN PAGE ==========
export default function Syllabus() {
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const { addTopic, clearTopicsByDiscipline, clearAllTopics } = useAppStore();
  const [importOpen, setImportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;
  const globalPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const handleImport = (disciplineId: string, topicTexts: string[]) => {
    topicTexts.forEach((text, i) => {
      const topic: Topic = {
        id: crypto.randomUUID(),
        disciplineId,
        text,
        completed: false,
        order: topics.filter((t) => t.disciplineId === disciplineId).length + i,
      };
      addTopic(topic);
    });
    toast.success(`${topicTexts.length} tópicos importados com sucesso!`);
  };

  // Filter disciplines
  const filteredDisciplines = disciplines
    .filter((d) => disciplineFilter === 'all' || d.id === disciplineFilter)
    .sort((a, b) => a.order - b.order);

  // Check if a discipline has visible topics after status filter
  const hasVisibleTopics = (disciplineId: string) => {
    const discTopics = topics.filter((t) => t.disciplineId === disciplineId);
    return discTopics.some((t) => {
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (searchQuery.trim() && !t.text.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (disciplineFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Edital Verticalizado
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize, acompanhe e domine todo o conteúdo do edital.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Importar Edital
          </Button>
          {totalTopics > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar Todos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar todos os tópicos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os {totalTopics} tópicos de todas as disciplinas serão removidos. Essa ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => { clearAllTopics(); toast.success('Todos os tópicos foram removidos.'); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, Limpar Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Filters */}
      {disciplines.length > 0 && totalTopics > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">{activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Status filter */}
                <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
                  {([
                    { value: 'all', label: 'Todos' },
                    { value: 'pending', label: 'Pendentes' },
                    { value: 'completed', label: 'Concluídos' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      className={`px-3 py-1.5 transition-colors ${
                        statusFilter === opt.value
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Discipline filter */}
                <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder="Todas as disciplinas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as disciplinas</SelectItem>
                    {disciplines.sort((a, b) => a.order - b.order).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar tópico..."
                    className="h-8 w-[200px] pl-7 text-xs"
                  />
                </div>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => { setStatusFilter('all'); setDisciplineFilter('all'); setSearchQuery(''); }}
                  >
                    <X className="h-3 w-3" /> Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Progress */}
      {totalTopics > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Progresso Geral</span>
              </div>
              <span className="text-sm font-bold text-primary">{globalPercent}%</span>
            </div>
            <Progress value={globalPercent} className="h-2.5" />
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{completedTopics} de {totalTopics} tópicos concluídos</span>
              <span>{totalTopics - completedTopics} restantes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disciplines */}
      {disciplines.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhuma disciplina cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre suas disciplinas nas Configurações para começar a organizar o edital.
            </p>
            <Button variant="outline" asChild>
              <a href="/configuracoes">Ir para Configurações</a>
            </Button>
          </CardContent>
        </Card>
      ) : filteredDisciplines.filter((d) => hasVisibleTopics(d.id)).length === 0 && activeFilterCount > 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Nenhum resultado para os filtros selecionados.</p>
            <Button variant="outline" size="sm" onClick={() => { setStatusFilter('all'); setDisciplineFilter('all'); setSearchQuery(''); }}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {filteredDisciplines
            .filter((d) => hasVisibleTopics(d.id))
            .map((discipline) => (
              <DisciplineSection key={discipline.id} discipline={discipline} statusFilter={statusFilter} />
            ))}
        </Accordion>
      )}

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        disciplines={disciplines}
        onImport={handleImport}
      />
    </motion.div>
  );
}
