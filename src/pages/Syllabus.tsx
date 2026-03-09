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
  CheckCircle2, Circle, Percent, Filter, Search, FileUp, Type,
  AlertCircle, Download,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
function protectDots(text: string): string {
  let t = text;
  // Protect numbers with dots (8.429, 6.404, 10.520, 1.234.567)
  t = t.replace(/(\d)\.(\d)/g, '$1⟨DOT⟩$2');
  // Protect abbreviations
  const abbreviations = ['art', 'inc', 'nº', 'n°', 'nr', 'parágrafo', 'alínea', 'cf', 'ex', 'obs', 'prof', 'dr', 'dra', 'sr', 'sra', 'ltda', 'cia', 'etc'];
  abbreviations.forEach((abbr) => {
    const re = new RegExp(`\\b(${abbr})\\.`, 'gi');
    t = t.replace(re, `$1⟨DOT⟩`);
  });
  return t;
}

function restoreDots(text: string): string {
  return text.replace(/⟨DOT⟩/g, '.');
}

function splitTopics(rawText: string): string[] {
  let text = protectDots(rawText);

  // Split by "." or ";" followed by space (or end of string)
  const parts = text
    .split(/[.;]\s+|[.;]$/)
    .map((s) => restoreDots(s).trim())
    .filter((s) => s.length > 2);

  // Also split by newlines
  const result: string[] = [];
  parts.forEach((part) => {
    const lines = part.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 2);
    result.push(...lines);
  });

  // Remove leading numbers/bullets
  return result
    .map((t) => t.replace(/^[\d]+[.)]\s*/, '').replace(/^[-•·]\s*/, '').trim())
    .filter((t) => t.length > 2);
}

// Common discipline keywords found in Brazilian public exam syllabi
const DISCIPLINE_KEYWORDS = [
  'língua portuguesa', 'português', 'matemática', 'raciocínio lógico',
  'direito constitucional', 'direito administrativo', 'direito penal',
  'direito civil', 'direito processual', 'direito tributário', 'direito do trabalho',
  'direito empresarial', 'direito financeiro', 'direito eleitoral', 'direito ambiental',
  'direito previdenciário', 'direito internacional', 'direitos humanos',
  'informática', 'noções de informática', 'conhecimentos de informática',
  'administração', 'administração pública', 'administração geral',
  'contabilidade', 'contabilidade geral', 'contabilidade pública',
  'economia', 'finanças públicas', 'auditoria', 'legislação',
  'atualidades', 'realidade brasileira', 'geografia', 'história',
  'ética', 'ética no serviço público', 'redação', 'redação oficial',
  'gestão de pessoas', 'gestão pública', 'políticas públicas',
  'estatística', 'arquivologia', 'biblioteconomia',
  'segurança da informação', 'redes de computadores', 'banco de dados',
  'sistemas operacionais', 'engenharia de software', 'programação',
  'código tributário', 'legislação tributária', 'legislação específica',
  'conhecimentos específicos', 'conhecimentos gerais', 'conhecimentos básicos',
  'conhecimentos complementares', 'noções de', 'fundamentos de',
];

// Detect if a line is a discipline header
function isDisciplineHeader(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 150) return false;

  const lower = trimmed.toLowerCase();

  // Check against known discipline keywords
  const matchesKeyword = DISCIPLINE_KEYWORDS.some((kw) => lower.includes(kw));

  // Pattern: starts with number like "1.", "1)", "1 -", "I.", "I -"
  const numberedHeader = /^(\d+|[IVXLC]+)[.)\-–—]\s*.+/i.test(trimmed);
  // Pattern: ALL CAPS or mostly caps (at least 60% uppercase letters)
  const letters = trimmed.replace(/[^a-zA-ZÀ-ÿ]/g, '');
  const upperRatio = letters.length > 0 ? (letters.replace(/[^A-ZÀ-Ý]/g, '').length / letters.length) : 0;
  const isAllCaps = upperRatio > 0.6 && letters.length > 3;
  // Pattern: ends with ":"
  const endsWithColon = trimmed.endsWith(':');
  // Should NOT contain too many separators (topics use . and ;)
  const hasFewSeparators = (trimmed.match(/[.;]/g) || []).length <= 2;

  // A line is a header if it matches keyword OR structural patterns
  if (matchesKeyword && hasFewSeparators) return true;
  return hasFewSeparators && (numberedHeader || isAllCaps || endsWithColon);
}

// Clean discipline name
function cleanDisciplineName(raw: string): string {
  return raw
    .replace(/^(\d+|[IVXLC]+)[.)\-–—]\s*/i, '') // remove leading number
    .replace(/:$/, '') // remove trailing colon
    .trim();
}

// Parse full syllabus text into disciplines with topics
interface ParsedDiscipline {
  name: string;
  topics: string[];
}

function parseFullSyllabus(rawText: string): ParsedDiscipline[] {
  // Normalize: replace multiple spaces with single, split into lines
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const result: ParsedDiscipline[] = [];
  let currentDiscipline: ParsedDiscipline | null = null;
  let contentBuffer = '';

  const flushBuffer = () => {
    if (currentDiscipline && contentBuffer.trim()) {
      const topics = splitTopics(contentBuffer);
      currentDiscipline.topics.push(...topics);
      contentBuffer = '';
    }
  };

  for (const line of lines) {
    // Try to detect if line contains a discipline header possibly followed by content
    // e.g. "LÍNGUA PORTUGUESA Ortografia e acentuação. Emprego do sinal..."
    // Check if the beginning of the line matches a discipline pattern
    let headerPart = '';
    let remainingPart = '';

    if (isDisciplineHeader(line)) {
      headerPart = line;
    } else {
      // Check if line starts with a known keyword followed by content
      for (const kw of DISCIPLINE_KEYWORDS) {
        const idx = line.toLowerCase().indexOf(kw);
        if (idx === 0 || (idx > 0 && /^[\d.)\-–— ]*$/.test(line.substring(0, idx)))) {
          // Check if after the keyword there's topic content (contains . or ;)
          const afterKeyword = line.substring(idx + kw.length).trim();
          if (afterKeyword.length > 10 && /[.;]/.test(afterKeyword)) {
            headerPart = line.substring(0, idx + kw.length).trim();
            remainingPart = afterKeyword;
            break;
          } else if (afterKeyword.length <= 10 || !afterKeyword) {
            headerPart = line;
            break;
          }
        }
      }
    }

    if (headerPart) {
      flushBuffer();
      if (currentDiscipline && currentDiscipline.topics.length > 0) {
        result.push(currentDiscipline);
      }
      currentDiscipline = { name: cleanDisciplineName(headerPart), topics: [] };
      if (remainingPart) {
        contentBuffer = remainingPart;
      }
    } else {
      contentBuffer += ' ' + line;
    }
  }

  // Flush remaining
  flushBuffer();
  if (currentDiscipline && currentDiscipline.topics.length > 0) {
    result.push(currentDiscipline);
  }

  // If no disciplines detected, treat everything as topics under "Conteúdo Geral"
  if (result.length === 0) {
    const allTopics = splitTopics(rawText);
    if (allTopics.length > 0) {
      result.push({ name: 'Conteúdo Geral', topics: allTopics });
    }
  }

  return result;
}

// Extract text from PDF using pdfjs-dist
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

// ========== IMPORT DIALOG ==========
type ImportMode = 'single' | 'bulk';

function ImportDialog({
  open,
  onOpenChange,
  disciplines,
  onImportSingle,
  onImportBulk,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disciplines: Discipline[];
  onImportSingle: (disciplineId: string, topics: string[]) => void;
  onImportBulk: (parsed: ParsedDiscipline[]) => void;
}) {
  const [tab, setTab] = useState<'text' | 'pdf'>('text');
  const [mode, setMode] = useState<ImportMode>('bulk');
  const [rawText, setRawText] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [singlePreview, setSinglePreview] = useState<string[]>([]);
  const [bulkPreview, setBulkPreview] = useState<ParsedDiscipline[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setRawText('');
    setSelectedDiscipline('');
    setSinglePreview([]);
    setBulkPreview([]);
    setLoading(false);
    setPdfFileName('');
  };

  const handleAnalyze = () => {
    if (!rawText.trim()) return;
    if (mode === 'single') {
      setSinglePreview(splitTopics(rawText));
      setBulkPreview([]);
    } else {
      const parsed = parseFullSyllabus(rawText);
      setBulkPreview(parsed);
      setSinglePreview([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      toast.error('Por favor, selecione um arquivo PDF ou TXT.');
      return;
    }

    setPdfFileName(file.name);
    setLoading(true);
    try {
      let text = '';
      if (isPdf) {
        text = await extractPdfText(file);
      } else {
        text = await file.text();
      }
      setRawText(text);
      // Auto-analyze
      if (mode === 'single') {
        setSinglePreview(splitTopics(text));
      } else {
        setBulkPreview(parseFullSyllabus(text));
      }
      toast.success(`${isPdf ? 'PDF' : 'TXT'} processado com sucesso!`);
    } catch (err) {
      console.error('File extraction error:', err);
      toast.error('Erro ao processar o arquivo. Tente copiar e colar o texto manualmente.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (mode === 'single') {
      if (!selectedDiscipline) {
        toast.error('Selecione uma disciplina.');
        return;
      }
      if (singlePreview.length === 0) {
        toast.error('Nenhum tópico para importar.');
        return;
      }
      onImportSingle(selectedDiscipline, singlePreview);
    } else {
      if (bulkPreview.length === 0) {
        toast.error('Nenhuma disciplina detectada.');
        return;
      }
      onImportBulk(bulkPreview);
    }
    resetState();
    onOpenChange(false);
  };

  const totalTopics = mode === 'single' ? singlePreview.length : bulkPreview.reduce((acc, d) => acc + d.topics.length, 0);
  const hasPreview = mode === 'single' ? singlePreview.length > 0 : bulkPreview.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importação Inteligente do Edital
          </DialogTitle>
          <DialogDescription>
            Importe o conteúdo programático do edital via PDF, TXT ou colando o texto. O sistema detecta disciplinas e tópicos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import mode toggle */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Modo de importação</Label>
            <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
              <button
                onClick={() => { setMode('bulk'); setSinglePreview([]); setBulkPreview([]); }}
                className={`flex-1 px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'bulk' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Edital Completo (auto-detectar disciplinas)
              </button>
              <button
                onClick={() => { setMode('single'); setSinglePreview([]); setBulkPreview([]); }}
                className={`flex-1 px-3 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                  mode === 'single' ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <Type className="h-3.5 w-3.5" />
                Disciplina específica
              </button>
            </div>
          </div>

          {/* Single mode: select discipline */}
          {mode === 'single' && (
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
          )}

          {/* Source tabs: Text or PDF */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'text' | 'pdf')}>
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1 gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Colar Texto
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex-1 gap-1.5">
                <FileUp className="h-3.5 w-3.5" />
                Importar PDF / TXT
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Conteúdo Programático</Label>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={mode === 'bulk'
                    ? "Cole aqui todo o conteúdo programático do edital. Exemplo:\n\nLÍNGUA PORTUGUESA\nCompreensão e interpretação de textos; Ortografia oficial; Acentuação gráfica...\n\nDIREITO CONSTITUCIONAL\nPrincípios fundamentais. Direitos e garantias fundamentais..."
                    : "Cole aqui o conteúdo de uma disciplina. Exemplo:\n\nCompreensão e interpretação de textos. Ortografia oficial. Acentuação gráfica. Emprego das classes de palavras..."
                  }
                  className="min-h-[180px] text-sm font-mono"
                />
              </div>
              <Button onClick={handleAnalyze} variant="outline" className="w-full gap-2" disabled={!rawText.trim()}>
                <Sparkles className="h-4 w-4" />
                Analisar Conteúdo
              </Button>
            </TabsContent>

            <TabsContent value="pdf" className="space-y-3 mt-3">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Processando PDF...</p>
                  </div>
                ) : pdfFileName ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-primary" />
                    <p className="text-sm font-medium">{pdfFileName}</p>
                    <p className="text-xs text-muted-foreground">Clique para trocar o arquivo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Clique para selecionar um PDF ou TXT</p>
                    <p className="text-xs text-muted-foreground">
                      O sistema extrairá o texto e detectará disciplinas e tópicos automaticamente
                    </p>
                  </div>
                )}
              </div>

              {rawText && !loading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Texto extraído do PDF (você pode editar)</Label>
                    <Badge variant="outline" className="text-[10px]">{rawText.length} caracteres</Badge>
                  </div>
                  <Textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="min-h-[120px] text-xs font-mono"
                  />
                  <Button onClick={handleAnalyze} variant="outline" className="w-full gap-2" size="sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    Re-analisar Conteúdo
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Preview: Bulk mode */}
          {mode === 'bulk' && bulkPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  {bulkPreview.length} disciplina{bulkPreview.length > 1 ? 's' : ''} detectada{bulkPreview.length > 1 ? 's' : ''}
                </Label>
                <Badge variant="secondary" className="text-xs">
                  {totalTopics} tópicos no total
                </Badge>
              </div>
              <div className="max-h-[250px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                {bulkPreview.map((disc, di) => (
                  <div key={di}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="text-[10px]">{disc.topics.length}</Badge>
                      <span className="text-sm font-semibold text-foreground">{disc.name}</span>
                    </div>
                    <div className="pl-4 space-y-0.5">
                      {disc.topics.map((topic, ti) => (
                        <div key={ti} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0 w-4 text-right">{ti + 1}.</span>
                          <span className="text-foreground/80">{topic}</span>
                        </div>
                      ))}
                    </div>
                    {di < bulkPreview.length - 1 && <Separator className="mt-2" />}
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Disciplinas que ainda não existem serão criadas automaticamente ao importar.
                </span>
              </div>
            </div>
          )}

          {/* Preview: Single mode */}
          {mode === 'single' && singlePreview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Tópicos detectados ({singlePreview.length})
                </Label>
                <Badge variant="secondary" className="text-xs">Prévia</Badge>
              </div>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                {singlePreview.map((topic, i) => (
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
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>Cancelar</Button>
          <Button
            onClick={handleImport}
            disabled={!hasPreview || (mode === 'single' && !selectedDiscipline)}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar {totalTopics} Tópicos
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

// ========== PDF EXPORT ==========
function ExportPdfDialog({
  open,
  onOpenChange,
  disciplines,
  topics,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disciplines: Discipline[];
  topics: Topic[];
}) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentDiscipline, setCurrentDiscipline] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Title page
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Edital Verticalizado', pageWidth / 2, 40, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const totalTopics = topics.length;
      const completedTopics = topics.filter(t => t.completed).length;
      const globalPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
      pdf.text(`Progresso Geral: ${completedTopics}/${totalTopics} tópicos (${globalPercent}%)`, pageWidth / 2, 52, { align: 'center' });
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 60, { align: 'center' });

      // Progress bar on title page
      const barX = margin + 20;
      const barW = contentWidth - 40;
      const barY = 68;
      const barH = 6;
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(230, 230, 230);
      pdf.roundedRect(barX, barY, barW, barH, 2, 2, 'FD');
      if (globalPercent > 0) {
        pdf.setFillColor(34, 197, 94);
        pdf.roundedRect(barX, barY, barW * (globalPercent / 100), barH, 2, 2, 'F');
      }

      // Summary table
      y = 85;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumo por Disciplina', margin, y);
      y += 8;

      const sortedDiscs = [...disciplines].sort((a, b) => a.order - b.order);

      pdf.setFontSize(9);
      // Table header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y, contentWidth, 7, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.text('Disciplina', margin + 2, y + 5);
      pdf.text('Progresso', pageWidth - margin - 30, y + 5);
      y += 9;

      pdf.setFont('helvetica', 'normal');
      for (const disc of sortedDiscs) {
        const dTopics = topics.filter(t => t.disciplineId === disc.id);
        if (dTopics.length === 0) continue;
        const done = dTopics.filter(t => t.completed).length;
        const pct = Math.round((done / dTopics.length) * 100);

        if (y > pageHeight - 20) { pdf.addPage(); y = margin; }

        const name = disc.name.length > 50 ? disc.name.substring(0, 50) + '...' : disc.name;
        pdf.text(name, margin + 2, y + 4);
        pdf.text(`${done}/${dTopics.length} (${pct}%)`, pageWidth - margin - 30, y + 4);
        y += 7;
      }

      // Discipline pages
      for (let i = 0; i < sortedDiscs.length; i++) {
        const disc = sortedDiscs[i];
        const dTopics = topics.filter(t => t.disciplineId === disc.id).sort((a, b) => a.order - b.order);
        if (dTopics.length === 0) continue;

        setCurrentDiscipline(disc.name);
        setProgress(Math.round(((i + 1) / sortedDiscs.length) * 100));

        pdf.addPage();
        y = margin;

        // Discipline header
        const done = dTopics.filter(t => t.completed).length;
        const pct = Math.round((done / dTopics.length) * 100);

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(disc.name, margin, y + 6);
        y += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${done}/${dTopics.length} tópicos concluídos (${pct}%)`, margin, y + 4);
        y += 6;

        // Mini progress bar
        pdf.setFillColor(230, 230, 230);
        pdf.roundedRect(margin, y, contentWidth, 4, 1.5, 1.5, 'F');
        if (pct > 0) {
          pdf.setFillColor(34, 197, 94);
          pdf.roundedRect(margin, y, contentWidth * (pct / 100), 4, 1.5, 1.5, 'F');
        }
        y += 10;

        // Topics
        pdf.setFontSize(9);
        for (let ti = 0; ti < dTopics.length; ti++) {
          const topic = dTopics[ti];
          if (y > pageHeight - 15) { pdf.addPage(); y = margin; }

          const status = topic.completed ? '✓' : '○';
          const prefix = `${status} ${ti + 1}. `;

          pdf.setFont('helvetica', topic.completed ? 'normal' : 'normal');
          if (topic.completed) {
            pdf.setTextColor(120, 120, 120);
          } else {
            pdf.setTextColor(30, 30, 30);
          }

          // Word wrap
          const lines = pdf.splitTextToSize(prefix + topic.text, contentWidth - 4);
          for (const line of lines) {
            if (y > pageHeight - 15) { pdf.addPage(); y = margin; }
            pdf.text(line, margin + 2, y + 3);
            y += 4.5;
          }
          y += 1;
        }

        // Small delay for UI progress update
        await new Promise(r => setTimeout(r, 10));
      }

      pdf.setTextColor(0, 0, 0);
      pdf.save('edital-verticalizado.pdf');
      toast.success('PDF exportado com sucesso!');
      onOpenChange(false);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erro ao gerar o PDF.');
    } finally {
      setExporting(false);
      setProgress(0);
      setCurrentDiscipline('');
    }
  };

  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Edital em PDF
          </DialogTitle>
          <DialogDescription>
            Gere um PDF completo do seu edital verticalizado com o progresso de cada disciplina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Disciplinas</span>
              <span className="font-medium">{disciplines.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tópicos totais</span>
              <span className="font-medium">{totalTopics}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Concluídos</span>
              <span className="font-medium text-green-500">{completedTopics}</span>
            </div>
          </div>

          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Exportando: {currentDiscipline}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>Cancelar</Button>
          <Button onClick={handleExport} disabled={exporting || totalTopics === 0} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== MAIN PAGE ==========
export default function Syllabus() {
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const { addTopic, addDiscipline, clearTopicsByDiscipline, clearAllTopics } = useAppStore();
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;
  const globalPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const handleImportSingle = (disciplineId: string, topicTexts: string[]) => {
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

  const handleImportBulk = (parsed: ParsedDiscipline[]) => {
    let totalImported = 0;
    let disciplinesCreated = 0;

    parsed.forEach((disc) => {
      let discipline = disciplines.find(
        (d) => d.name.toLowerCase().trim() === disc.name.toLowerCase().trim()
      );
      if (!discipline) {
        const newDisc: Discipline = {
          id: crypto.randomUUID(),
          name: disc.name,
          category: 'mista',
          weight: 0,
          prova: 'P1',
          defaultQuestions: 0,
          order: disciplines.length + disciplinesCreated,
        };
        addDiscipline(newDisc);
        discipline = newDisc;
        disciplinesCreated++;
      }

      const existingCount = topics.filter((t) => t.disciplineId === discipline!.id).length;
      disc.topics.forEach((text, i) => {
        addTopic({
          id: crypto.randomUUID(),
          disciplineId: discipline!.id,
          text,
          completed: false,
          order: existingCount + i,
        });
      });
      totalImported += disc.topics.length;
    });

    const msg = disciplinesCreated > 0
      ? `${totalImported} tópicos importados em ${parsed.length} disciplinas (${disciplinesCreated} nova${disciplinesCreated > 1 ? 's' : ''})!`
      : `${totalImported} tópicos importados em ${parsed.length} disciplinas!`;
    toast.success(msg);
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
            <Button variant="outline" onClick={() => setExportOpen(true)} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          )}
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
              <DisciplineSection key={discipline.id} discipline={discipline} statusFilter={statusFilter} searchQuery={searchQuery} />
            ))}
        </Accordion>
      )}

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        disciplines={disciplines}
        onImportSingle={handleImportSingle}
        onImportBulk={handleImportBulk}
      />
    </motion.div>
  );
}
