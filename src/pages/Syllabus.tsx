import { useState, useCallback, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
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
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
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
  // Línguas
  'língua portuguesa', 'português', 'redação', 'redação oficial', 'redação discursiva',
  'inglês', 'língua inglesa', 'espanhol', 'língua espanhola',
  // Matemática e Raciocínio
  'matemática', 'matemática financeira', 'raciocínio lógico', 'raciocínio lógico-matemático',
  'raciocínio lógico e matemático', 'raciocínio analítico',
  // Direito
  'direito constitucional', 'direito administrativo', 'direito penal',
  'direito processual penal', 'direito processual civil',
  'direito civil', 'direito processual', 'direito tributário', 'direito do trabalho',
  'direito empresarial', 'direito comercial', 'direito financeiro',
  'direito eleitoral', 'direito ambiental',
  'direito previdenciário', 'direito internacional', 'direitos humanos',
  'direito econômico', 'direito digital',
  // Contabilidade e Finanças
  'contabilidade', 'contabilidade geral', 'contabilidade pública',
  'contabilidade de custos', 'contabilidade avançada', 'contabilidade aplicada ao setor público',
  'custos', 'economia', 'finanças públicas', 'economia e finanças públicas',
  'matemática financeira e estatística',
  // Administração e Gestão
  'administração', 'administração pública', 'administração geral',
  'administração geral e pública', 'administração financeira e orçamentária',
  'gestão de pessoas', 'gestão pública', 'políticas públicas',
  'gestão de projetos', 'gestão de contratos',
  // Auditoria e Controle
  'auditoria', 'auditoria governamental', 'auditoria fiscal',
  'controle externo', 'controle interno',
  // Legislação
  'legislação', 'legislação tributária', 'legislação tributária estadual',
  'legislação tributária municipal', 'legislação tributária federal',
  'legislação específica', 'legislação aduaneira',
  'legislação aplicada', 'legislação penal especial',
  // Informática
  'informática', 'noções de informática', 'conhecimentos de informática',
  'tecnologia da informação', 'ti', 'segurança da informação',
  'redes de computadores', 'banco de dados', 'sistemas operacionais',
  'engenharia de software', 'programação', 'governança de ti',
  // Áreas Específicas
  'estatística', 'arquivologia', 'biblioteconomia',
  'comércio internacional', 'relações internacionais',
  'atualidades', 'realidade brasileira', 'geografia', 'história',
  'história e geografia', 'história e geografia de',
  'ética', 'ética e filosofia', 'ética no serviço público', 'ética profissional',
  'orçamento público', 'afo', 'administração financeira',
  'código tributário', 'tributário',
  'conhecimentos específicos', 'conhecimentos gerais', 'conhecimentos básicos',
  'conhecimentos complementares',
  'regulação', 'agências reguladoras',
  'processo administrativo', 'licitações e contratos',
  'regime jurídico', 'servidores públicos',
  'sistema financeiro nacional', 'mercado de capitais',
  'criminologia', 'medicina legal',
  'engenharia', 'arquitetura', 'agronomia',
  'saúde pública', 'enfermagem', 'farmácia',
  'pedagogia', 'didática', 'legislação educacional',
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
  // Normalize whitespace
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strategy: find all discipline keyword positions in the full text,
  // then split the text at those positions.
  // This handles PDFs where text is extracted as one continuous block.

  // Sort keywords by length (longest first) to match most specific first
  const sortedKeywords = [...DISCIPLINE_KEYWORDS].sort((a, b) => b.length - a.length);
  const lowerText = normalizedText.toLowerCase();

  // Find all potential discipline header positions
  interface Match {
    index: number;
    keyword: string;
    fullMatch: string;
  }

  const matches: Match[] = [];
  const usedRanges: [number, number][] = [];

  const isOverlapping = (start: number, end: number) =>
    usedRanges.some(([s, e]) => start < e && end > s);

  for (const kw of sortedKeywords) {
    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
      const idx = lowerText.indexOf(kw, searchFrom);
      if (idx === -1) break;

      const end = idx + kw.length;

      // Ensure it's a word boundary (not part of a larger word)
      const charBefore = idx > 0 ? lowerText[idx - 1] : ' ';
      const charAfter = end < lowerText.length ? lowerText[end] : ' ';
      const validBoundary =
        /[\s\n.,;:()–—\-\d]/.test(charBefore) || idx === 0;
      const validEnd =
        /[\s\n.,;:()–—\-]/.test(charAfter) || end === lowerText.length;

      if (validBoundary && validEnd && !isOverlapping(idx, end)) {
        // Look backwards for a possible numbered prefix like "1." or "1 -"
        let prefixStart = idx;
        const textBefore = normalizedText.substring(Math.max(0, idx - 20), idx);
        const prefixMatch = textBefore.match(/([\d]+[.)\-–—]\s*|[IVXLC]+[.)\-–—]\s*)$/i);
        if (prefixMatch) {
          prefixStart = idx - prefixMatch[0].length;
        }

        const fullMatch = normalizedText.substring(prefixStart, end).trim();
        matches.push({ index: prefixStart, keyword: kw, fullMatch });
        usedRanges.push([prefixStart, end]);
      }

      searchFrom = idx + 1;
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.index - b.index);

  // Remove duplicate/overlapping matches (keep first occurrence)
  const filteredMatches: Match[] = [];
  for (const m of matches) {
    const overlaps = filteredMatches.some(
      (fm) => Math.abs(fm.index - m.index) < 5
    );
    if (!overlaps) {
      filteredMatches.push(m);
    }
  }

  // If no keyword matches found, fall back to line-by-line structural detection
  if (filteredMatches.length === 0) {
    return parseByLines(normalizedText);
  }

  // Split text at discipline boundaries
  const result: ParsedDiscipline[] = [];

  for (let i = 0; i < filteredMatches.length; i++) {
    const match = filteredMatches[i];
    const nextIndex = i + 1 < filteredMatches.length
      ? filteredMatches[i + 1].index
      : normalizedText.length;

    const name = cleanDisciplineName(match.fullMatch);
    const contentStart = match.index + match.fullMatch.length;
    const content = normalizedText.substring(contentStart, nextIndex).trim();
    const topics = splitTopics(content);

    if (topics.length > 0) {
      result.push({ name, topics });
    } else if (content.length > 5) {
      // If splitTopics returned nothing, add content as a single topic
      result.push({ name, topics: [content.replace(/\s+/g, ' ').trim()] });
    }
  }

  // Handle any text before the first discipline match
  if (filteredMatches.length > 0 && filteredMatches[0].index > 50) {
    const preText = normalizedText.substring(0, filteredMatches[0].index).trim();
    const preTopics = splitTopics(preText);
    if (preTopics.length > 0) {
      result.unshift({ name: 'Conteúdo Inicial', topics: preTopics });
    }
  }

  return result;
}

// Fallback: line-by-line parsing for structured documents
function parseByLines(normalizedText: string): ParsedDiscipline[] {
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
    if (isDisciplineHeader(line)) {
      flushBuffer();
      if (currentDiscipline && currentDiscipline.topics.length > 0) {
        result.push(currentDiscipline);
      }
      currentDiscipline = { name: cleanDisciplineName(line), topics: [] };
    } else {
      contentBuffer += ' ' + line;
    }
  }

  flushBuffer();
  if (currentDiscipline && currentDiscipline.topics.length > 0) {
    result.push(currentDiscipline);
  }

  if (result.length === 0) {
    const allTopics = splitTopics(normalizedText);
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

  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {

    const fileName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || fileName.endsWith('.txt');
    const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx');
    const isDoc = file.type === 'application/msword' || fileName.endsWith('.doc');

    if (!isPdf && !isTxt && !isDocx && !isDoc) {
      toast.error('Por favor, selecione um arquivo PDF, TXT, DOC ou DOCX.');
      return;
    }

    setPdfFileName(file.name);
    setLoading(true);
    try {
      let text = '';
      if (isPdf) {
        text = await extractPdfText(file);
      } else if (isDocx) {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (isDoc) {
        // .doc (legacy format) - try reading as text; mammoth may partially support it
        try {
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
        } catch {
          // Fallback: read as text
          text = await file.text();
        }
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
      const ext = fileName.split('.').pop()?.toUpperCase() || 'Arquivo';
      toast.success(`${ext} processado com sucesso!`);
    } catch (err) {
      console.error('File extraction error:', err);
      toast.error('Erro ao processar o arquivo. Tente copiar e colar o texto manualmente.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setTab('pdf');
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-neon flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-neon-green-foreground" />
            </div>
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
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                  </div>
                ) : isDragging ? (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-primary animate-bounce" />
                    <p className="text-sm font-medium text-primary">Solte o arquivo aqui</p>
                  </div>
                ) : pdfFileName ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-primary" />
                    <p className="text-sm font-medium">{pdfFileName}</p>
                    <p className="text-xs text-muted-foreground">Clique ou arraste para trocar o arquivo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Arraste e solte ou clique para selecionar</p>
                    <p className="text-xs text-muted-foreground">
                      PDF, TXT, DOC ou DOCX — detecção automática de disciplinas e tópicos
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
                      <Input
                        value={disc.name}
                        onChange={(e) => {
                          const updated = [...bulkPreview];
                          updated[di] = { ...updated[di], name: e.target.value };
                          setBulkPreview(updated);
                        }}
                        className="h-7 text-sm font-semibold border-transparent hover:border-border focus:border-border bg-transparent px-1.5"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => {
                          setBulkPreview(bulkPreview.filter((_, i) => i !== di));
                        }}
                        title="Remover disciplina"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="pl-4 space-y-0.5">
                      {disc.topics.map((topic, ti) => (
                        <div key={ti} className="flex items-center gap-2 text-xs group">
                          <span className="text-muted-foreground shrink-0 w-4 text-right">{ti + 1}.</span>
                          <span className="text-foreground/80 flex-1">{topic}</span>
                          <button
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            onClick={() => {
                              const updated = [...bulkPreview];
                              updated[di] = { ...updated[di], topics: updated[di].topics.filter((_, i) => i !== ti) };
                              setBulkPreview(updated);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <form
                        className="flex items-center gap-1 mt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.target as HTMLFormElement;
                          const input = form.elements.namedItem('newTopic') as HTMLInputElement;
                          const val = input.value.trim();
                          if (!val) return;
                          const updated = [...bulkPreview];
                          updated[di] = { ...updated[di], topics: [...updated[di].topics, val] };
                          setBulkPreview(updated);
                          input.value = '';
                        }}
                      >
                        <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
                        <input
                          name="newTopic"
                          placeholder="Adicionar tópico..."
                          className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50 text-foreground"
                        />
                      </form>
                    </div>
                    {di < bulkPreview.length - 1 && <Separator className="mt-2" />}
                  </div>
                ))}
              </div>
              {/* Add discipline manually */}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  setBulkPreview([...bulkPreview, { name: 'Nova Disciplina', topics: [] }]);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Disciplina Manualmente
              </Button>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Disciplinas que ainda não existem serão criadas automaticamente ao importar. Você pode adicionar disciplinas não detectadas manualmente.
                </span>
              </div>
            </div>
          )}

          {/* Add discipline manually when no preview yet */}
          {mode === 'bulk' && bulkPreview.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                setBulkPreview([{ name: 'Nova Disciplina', topics: [] }]);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar Disciplina Manualmente
            </Button>
          )}

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
  if (!text) return null;
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
  const allTopics = useAppStore((s) => s.topics);
  const allDisciplineTopics = useMemo(
    () => allTopics.filter((t) => t.disciplineId === discipline.id),
    [allTopics, discipline.id]
  );
  const topics = useMemo(
    () => allDisciplineTopics.filter((t) => {
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (searchQuery.trim() && !(t.text || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }),
    [allDisciplineTopics, searchQuery, statusFilter]
  );
  const addTopic = useAppStore((s) => s.addTopic);
  const updateTopic = useAppStore((s) => s.updateTopic);
  const removeTopic = useAppStore((s) => s.removeTopic);
  const setTopics = useAppStore((s) => s.setTopics);
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
  const provaLabel = discipline.prova?.trim() ? discipline.prova.trim() : 'Sem prova';

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
    <AccordionItem value={discipline.id} className="border border-border/30 rounded-xl overflow-hidden glass hover:border-primary/20 transition-all duration-300">
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{discipline.name}</span>
              <Badge variant="outline" className="text-[10px] rounded-full border-border/40">{provaLabel}</Badge>
              {discipline.cannotZero && (
                <Badge variant="destructive" className="text-[10px] rounded-full">Não pode zerar</Badge>
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
        {total > 0 && (
          <div className="flex items-center gap-2 mb-3">
            {completed < total ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => {
                  allDisciplineTopics.filter(t => !t.completed).forEach(t => updateTopic(t.id, { completed: true }));
                  toast.success(`Todos os ${total} tópicos de "${discipline.name}" marcados como concluídos!`);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Marcar todos como concluídos
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => {
                  allDisciplineTopics.filter(t => t.completed).forEach(t => updateTopic(t.id, { completed: false }));
                  toast.success(`Todos os tópicos de "${discipline.name}" desmarcados.`);
                }}
              >
                <Circle className="h-3.5 w-3.5" />
                Desmarcar todos
              </Button>
            )}
          </div>
        )}
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

          const status = topic.completed ? '[X]' : '[  ]';

          // Clean topic text: remove leading %E, %É, %C3%xx and similar URL-encoded artifacts
          let cleanText = topic.text
            .replace(/^(%[A-Fa-f0-9É]{1,2}\s*)+/g, '')
            .replace(/%[A-Fa-f0-9]{2}/g, (match) => {
              try { return decodeURIComponent(match); } catch { return match; }
            })
            .trim();

          if (!cleanText) cleanText = topic.text.trim();

          const prefix = `${status} ${ti + 1}. `;

          pdf.setFont('helvetica', 'normal');
          if (topic.completed) {
            pdf.setTextColor(120, 120, 120);
          } else {
            pdf.setTextColor(30, 30, 30);
          }

          // Word wrap with safe margin
          const maxTextWidth = contentWidth - 10;
          const lines = pdf.splitTextToSize(prefix + cleanText, maxTextWidth);
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
      <DialogContent className="sm:max-w-md glass border-border/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl gradient-neon flex items-center justify-center">
              <Download className="h-4 w-4 text-neon-green-foreground" />
            </div>
            Exportar Edital em PDF
          </DialogTitle>
          <DialogDescription>
            Gere um PDF completo do seu edital verticalizado com o progresso de cada disciplina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/30 glass p-4 space-y-2">
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

// ========== ERROR BOUNDARY ==========


class SyllabusErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Syllabus error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">Erro ao carregar o Edital</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <p className="text-xs text-muted-foreground/60 font-mono max-w-md break-all">
            {this.state.error?.message}
          </p>
          <Button onClick={() => { this.setState({ hasError: false, error: null }); }} className="gap-2">
            Tentar Novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ========== MAIN PAGE ==========
export default function Syllabus() {
  return (
    <SyllabusErrorBoundary>
      <SyllabusContent />
    </SyllabusErrorBoundary>
  );
}

function SyllabusContent() {
  const disciplines = useAppStore((s) => s.disciplines);
  const topics = useAppStore((s) => s.topics);
  const addTopic = useAppStore((s) => s.addTopic);
  const addDiscipline = useAppStore((s) => s.addDiscipline);
  const clearAllTopics = useAppStore((s) => s.clearAllTopics);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [provaFilter, setProvaFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;
  const globalPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const normalizeProvaValue = (prova?: string | null) => {
    const value = typeof prova === 'string' ? prova.trim() : '';
    return value.length > 0 ? value : '__SEM_PROVA__';
  };

  const formatProvaLabel = (provaValue: string) => (
    provaValue === '__SEM_PROVA__' ? 'Sem prova' : provaValue
  );

  const handleImportSingle = (disciplineId: string, topicTexts: string[]) => {
    const validTexts = topicTexts.map(t => t?.trim()).filter(t => t && t.length > 0);
    if (validTexts.length === 0) {
      toast.error('Nenhum tópico válido para importar.');
      return;
    }
    validTexts.forEach((text, i) => {
      const topic: Topic = {
        id: crypto.randomUUID(),
        disciplineId,
        text,
        completed: false,
        order: topics.filter((t) => t.disciplineId === disciplineId).length + i,
      };
      addTopic(topic);
    });
    const skipped = topicTexts.length - validTexts.length;
    const msg = skipped > 0
      ? `${validTexts.length} tópicos importados (${skipped} vazios ignorados)!`
      : `${validTexts.length} tópicos importados com sucesso!`;
    toast.success(msg);
  };

  const { canAddDiscipline, maxDisciplines } = useSubscriptionLimits();

  const handleImportBulk = (parsed: ParsedDiscipline[]) => {
    let totalImported = 0;
    let disciplinesCreated = 0;
    let currentDisciplineCount = disciplines.length;

    parsed.forEach((disc) => {
      let discipline = disciplines.find(
        (d) => d.name.toLowerCase().trim() === disc.name.toLowerCase().trim()
      );
      if (!discipline) {
        if (!canAddDiscipline(currentDisciplineCount)) {
          toast.error(`Limite de ${maxDisciplines} disciplinas atingido (plano gratuito). Disciplina "${disc.name}" ignorada.`);
          return;
        }
        const newDisc: Discipline = {
          id: crypto.randomUUID(),
          name: disc.name,
          category: 'mista',
          weight: 0,
          prova: 'P1',
          defaultQuestions: 0,
          order: currentDisciplineCount,
        };
        addDiscipline(newDisc);
        discipline = newDisc;
        disciplinesCreated++;
        currentDisciplineCount++;
      }

      const existingCount = topics.filter((t) => t.disciplineId === discipline!.id).length;
      const validTopics = disc.topics.map(t => t?.trim()).filter(t => t && t.length > 0);
      validTopics.forEach((text, i) => {
        addTopic({
          id: crypto.randomUUID(),
          disciplineId: discipline!.id,
          text,
          completed: false,
          order: existingCount + i,
        });
      });
      totalImported += validTopics.length;
    });

    const msg = disciplinesCreated > 0
      ? `${totalImported} tópicos importados em ${parsed.length} disciplinas (${disciplinesCreated} nova${disciplinesCreated > 1 ? 's' : ''})!`
      : `${totalImported} tópicos importados em ${parsed.length} disciplinas!`;
    toast.success(msg);
  };

  // Filter disciplines
  const filteredDisciplines = disciplines
    .filter((d) => disciplineFilter === 'all' || d.id === disciplineFilter)
    .filter((d) => provaFilter === 'all' || normalizeProvaValue(d.prova) === provaFilter)
    .sort((a, b) => a.order - b.order);

  // Check if a discipline has visible topics after status filter
  const hasVisibleTopics = (disciplineId: string) => {
    const discTopics = topics.filter((t) => t.disciplineId === disciplineId);
    return discTopics.some((t) => {
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (searchQuery.trim() && !(t.text || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  };

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (disciplineFilter !== 'all' ? 1 : 0) + (provaFilter !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <div className="h-8 w-8 rounded-xl gradient-orange flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-sporty-orange-foreground" />
            </div>
            Edital Verticalizado
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize, acompanhe e domine todo o conteúdo do edital.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportOpen(true)} className="gap-2 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90">
            <Sparkles className="h-4 w-4" />
            Importar Edital
          </Button>
          {totalTopics > 0 && (
            <Button variant="outline" onClick={() => setExportOpen(true)} className="gap-2 rounded-xl border-border/40 hover:border-primary/40">
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
        <Card className="glass border-border/30">
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

                {/* Prova filter */}
                {(() => {
                  const provas = [...new Set(disciplines.map((d) => normalizeProvaValue(d.prova)))].sort();
                  return provas.length > 1 ? (
                    <Select value={provaFilter} onValueChange={setProvaFilter}>
                      <SelectTrigger className="w-[120px] h-8 text-xs">
                        <SelectValue placeholder="Todas as provas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as provas</SelectItem>
                        {provas.map((p) => (
                          <SelectItem key={p} value={p}>{formatProvaLabel(p)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null;
                })()}

                {/* Discipline filter */}
                <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder="Todas as disciplinas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as disciplinas</SelectItem>
                    {disciplines
                      .filter((d) => provaFilter === 'all' || normalizeProvaValue(d.prova) === provaFilter)
                      .sort((a, b) => a.order - b.order)
                      .map((d) => (
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
                    onClick={() => { setStatusFilter('all'); setDisciplineFilter('all'); setProvaFilter('all'); setSearchQuery(''); }}
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
        <Card className="glass border-border/30 bg-gradient-to-r from-neon-green/10 to-neon-green/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-neon-green" />
                <span className="text-sm font-bold uppercase tracking-wider">Progresso Geral</span>
              </div>
              <span className="text-sm font-extrabold text-neon-green">{globalPercent}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full gradient-neon transition-all duration-700" style={{ width: `${globalPercent}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{completedTopics} de {totalTopics} tópicos concluídos</span>
              <span>{totalTopics - completedTopics} restantes</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress by Prova */}
      {totalTopics > 0 && (() => {
        const provas = [...new Set(disciplines.map((d) => normalizeProvaValue(d.prova)))].sort();
        if (provas.length <= 1) return null;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {provas.map(prova => {
              const provaDiscs = disciplines.filter((d) => normalizeProvaValue(d.prova) === prova);
              const provaTopics = topics.filter(t => provaDiscs.some(d => d.id === t.disciplineId));
              const provaCompleted = provaTopics.filter(t => t.completed).length;
              const provaTotal = provaTopics.length;
              const provaPct = provaTotal > 0 ? Math.round((provaCompleted / provaTotal) * 100) : 0;
              if (provaTotal === 0) return null;
              return (
                <Card key={prova} className="glass border-border/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold">{formatProvaLabel(prova)}</Badge>
                        <span className="text-xs text-muted-foreground">{provaDiscs.length} disciplina{provaDiscs.length > 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-bold text-primary">{provaPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${provaPct}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {provaCompleted}/{provaTotal} tópicos
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}


      {disciplines.length === 0 ? (
        <Card className="border-dashed glass border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-orange flex items-center justify-center mb-4">
              <ClipboardList className="h-8 w-8 text-sporty-orange-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nenhuma disciplina cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastre suas disciplinas nas Configurações para começar a organizar o edital.
            </p>
            <Button variant="outline" asChild className="rounded-xl border-border/40 hover:border-primary/40">
              <a href="/configuracoes">Ir para Configurações</a>
            </Button>
          </CardContent>
        </Card>
      ) : filteredDisciplines.filter((d) => hasVisibleTopics(d.id)).length === 0 && activeFilterCount > 0 ? (
        <Card className="border-dashed glass border-border/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Nenhum resultado para os filtros selecionados.</p>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setStatusFilter('all'); setDisciplineFilter('all'); setProvaFilter('all'); setSearchQuery(''); }}>
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

      {/* Export PDF Dialog */}
      <ExportPdfDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        disciplines={disciplines}
        topics={topics}
      />
    </motion.div>
  );
}
