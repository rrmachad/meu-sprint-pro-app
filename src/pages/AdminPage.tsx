import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Users, CreditCard, Key, Plus, Trash2,
  RefreshCw, Copy, BarChart3, TrendingUp, UserPlus,
  CheckCircle, XCircle, Loader2, Clock, Download, UserCog, Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAdmin } from '@/hooks/useAdmin';
import { Navigate } from 'react-router-dom';
import { TIERS } from '@/hooks/useSubscription';
import { useCountUp } from '@/hooks/useCountUp';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.08 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  subscription: {
    status: string;
    product_id: string;
    price_id: string;
    current_period_end: string;
  } | null;
}

interface License {
  id: string;
  code: string;
  tier: string;
  duration_days: number;
  max_uses: number;
  current_uses: number;
  active: boolean;
  created_at: string;
  expires_at: string | null;
}

interface Metrics {
  totalUsers: number;
  activeSubscriptions: number;
  estimatedMRR: number;
  activeLicenses: number;
  newUsersLast30Days: number;
  userGrowthData: { date: string; count: number }[];
  cumulativeData: { date: string; total: number }[];
  revenueByTier: Record<string, { count: number; revenue: number }>;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function MetricCard({ icon: Icon, label, value, suffix, gradient }: {
  icon: typeof Users;
  label: string;
  value: number;
  suffix?: string;
  gradient: string;
}) {
  const animatedValue = useCountUp(value, 1200);
  return (
    <motion.div variants={itemVariants}>
      <Card className="glass border-border/30 rounded-xl hover:border-primary/20 transition-colors">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`p-2.5 rounded-xl ${gradient}`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold tracking-tight">
              {suffix === 'R$' ? `R$ ${animatedValue.toFixed(2)}` : animatedValue}
              {suffix && suffix !== 'R$' ? ` ${suffix}` : ''}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getTierName(productId: string | null): string {
  if (!productId) return 'Gratuito';
  const found = Object.entries(TIERS).find(([, t]) => t.product_id === productId);
  return found ? found[1].name : 'Desconhecido';
}

function getTierBadgeClass(productId: string | null): string {
  if (!productId) return 'bg-muted text-muted-foreground';
  const found = Object.entries(TIERS).find(([, t]) => t.product_id === productId);
  if (!found) return 'bg-muted text-muted-foreground';
  return found[0] === 'premium'
    ? 'bg-warning/20 text-warning border-warning/30'
    : 'bg-primary/20 text-primary border-primary/30';
}

// ==================== USERS TAB ====================
function UsersTab({ adminApi }: { adminApi: (action: string, params?: Record<string, unknown>) => Promise<unknown> }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi('list_users') as { users: AdminUser[] };
      setUsers(data.users);
    } catch (err) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [adminApi]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm glass border-border/30"
        />
        <Button variant="outline" size="icon" onClick={loadUsers} className="glass border-border/30">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="glass border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead>Usuário</TableHead>
                <TableHead>Provedor</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className="border-border/20 hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {(u.full_name || u.email)?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border/40 capitalize">
                        {u.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${getTierBadgeClass(u.subscription?.product_id || null)}`}>
                        {u.subscription ? getTierName(u.subscription.product_id) : 'Gratuito'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== LICENSES TAB ====================
function LicensesTab({ adminApi }: { adminApi: (action: string, params?: Record<string, unknown>) => Promise<unknown> }) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ tier: 'premium', duration_days: 30, max_uses: 1, code: '' });

  const loadLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi('list_licenses') as { licenses: License[] };
      setLicenses(data.licenses);
    } catch {
      toast.error('Erro ao carregar licenças');
    } finally {
      setLoading(false);
    }
  }, [adminApi]);

  useEffect(() => { loadLicenses(); }, [loadLicenses]);

  const handleCreate = async () => {
    try {
      await adminApi('create_license', {
        tier: form.tier,
        duration_days: form.duration_days,
        max_uses: form.max_uses,
        code: form.code || undefined,
      });
      toast.success('Licença criada!');
      setDialogOpen(false);
      setForm({ tier: 'premium', duration_days: 30, max_uses: 1, code: '' });
      loadLicenses();
    } catch {
      toast.error('Erro ao criar licença');
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await adminApi('toggle_license', { license_id: id, active });
      toast.success(active ? 'Licença ativada' : 'Licença desativada');
      loadLicenses();
    } catch {
      toast.error('Erro ao atualizar licença');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi('delete_license', { license_id: id });
      toast.success('Licença removida');
      loadLicenses();
    } catch {
      toast.error('Erro ao remover licença');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{licenses.length} licença(s) cadastrada(s)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadLicenses} className="glass border-border/30">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1 gradient-neon text-primary-foreground">
            <Plus className="h-4 w-4" /> Nova Licença
          </Button>
        </div>
      </div>

      <Card className="glass border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead>Código</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : licenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma licença criada
                  </TableCell>
                </TableRow>
              ) : (
                licenses.map((l) => (
                  <TableRow key={l.id} className="border-border/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">{l.code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(l.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{l.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{l.duration_days} dias</TableCell>
                    <TableCell className="text-xs">{l.current_uses}/{l.max_uses}</TableCell>
                    <TableCell>
                      <Switch
                        checked={l.active}
                        onCheckedChange={(checked) => handleToggle(l.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(l.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create License Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-border/30 rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" /> Nova Licença
            </DialogTitle>
            <DialogDescription>Crie um código de acesso para distribuir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Código (opcional)</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Auto-gerado se vazio"
                className="glass border-border/30 font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Plano</Label>
                <Select value={form.tier} onValueChange={(v) => setForm({ ...form, tier: v })}>
                  <SelectTrigger className="glass border-border/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duração (dias)</Label>
                <Input
                  type="number"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                  min={1}
                  className="glass border-border/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Máximo de Usos</Label>
              <Input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })}
                min={1}
                className="glass border-border/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="glass border-border/30">Cancelar</Button>
            <Button onClick={handleCreate} className="gradient-neon text-primary-foreground">Criar Licença</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ==================== RECENT SIGNUPS TAB ====================
function RecentSignupsTab({ adminApi }: { adminApi: (action: string, params?: Record<string, unknown>) => Promise<unknown> }) {
  const [users, setUsers] = useState<{ id: string; email: string; full_name: string | null; avatar_url: string | null; created_at: string; provider: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi('recent_signups') as { users: typeof users };
      setUsers(data.users);
    } catch {
      toast.error('Erro ao carregar cadastros recentes');
    } finally {
      setLoading(false);
    }
  }, [adminApi]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (period === 'all') return users;
    const now = Date.now();
    const cutoff = period === 'today' ? now - 86400000 : period === '7d' ? now - 7 * 86400000 : now - 30 * 86400000;
    return users.filter((u) => new Date(u.created_at).getTime() >= cutoff);
  }, [users, period]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {(['today', '7d', '30d', 'all'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              className={period === p ? '' : 'glass border-border/30'}
              onClick={() => setPeriod(p)}
            >
              {p === 'today' ? 'Hoje' : p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Todos'}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{filtered.length} cadastro(s)</Badge>
          <Button
            variant="outline"
            size="sm"
            className="glass border-border/30"
            disabled={filtered.length === 0}
            onClick={() => {
              const header = 'Nome,Email,Método,Data de Cadastro\n';
              const rows = filtered.map((u) => {
                const name = (u.full_name || '').replace(/,/g, ' ');
                const email = u.email || '';
                const provider = u.provider || 'email';
                const date = new Date(u.created_at).toLocaleString('pt-BR');
                return `"${name}","${email}","${provider}","${date}"`;
              }).join('\n');
              const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `cadastros_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('CSV exportado com sucesso!');
            }}
          >
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="icon" onClick={load} className="glass border-border/30">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      <Card className="glass border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead>Usuário</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhum cadastro neste período
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} className="border-border/20 hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {(u.full_name || u.email)?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{u.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border/40 capitalize">
                        {u.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium">{timeAgo(u.created_at)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(u.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
}

// ==================== COLLABORATORS TAB ====================
interface RoleEntry {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
}

function CollaboratorsTab({ adminApi }: { adminApi: (action: string, params?: Record<string, unknown>) => Promise<unknown> }) {
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('moderator');
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi('list_roles') as { roles: RoleEntry[] };
      setRoles(data.roles);
    } catch {
      toast.error('Erro ao carregar colaboradores');
    } finally {
      setLoading(false);
    }
  }, [adminApi]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const data = await adminApi('find_user_by_email', { email: email.trim() }) as { user: { id: string; email: string; full_name: string | null } | null };
      if (data.user) {
        setFoundUser(data.user);
      } else {
        toast.error('Usuário não encontrado com este email');
      }
    } catch {
      toast.error('Erro ao buscar usuário');
    } finally {
      setSearching(false);
    }
  };

  const handleGrant = async () => {
    if (!foundUser) return;
    setGranting(true);
    try {
      await adminApi('grant_role', { user_id: foundUser.id, role: selectedRole });
      toast.success(`Papel "${selectedRole}" atribuído a ${foundUser.email}!`);
      setDialogOpen(false);
      setEmail('');
      setFoundUser(null);
      setSelectedRole('moderator');
      loadRoles();
    } catch {
      toast.error('Erro ao atribuir papel. O usuário pode já ter este papel.');
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (roleId: string) => {
    try {
      await adminApi('revoke_role', { role_id: roleId });
      toast.success('Papel revogado');
      loadRoles();
    } catch {
      toast.error('Erro ao revogar papel');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'moderator':
        return 'bg-warning/20 text-warning border-warning/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'moderator': return 'Moderador';
      case 'user': return 'Usuário';
      default: return role;
    }
  };

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roles.length} papel(éis) atribuído(s)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadRoles} className="glass border-border/30">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1 gradient-neon text-primary-foreground">
            <Plus className="h-4 w-4" /> Adicionar Colaborador
          </Button>
        </div>
      </div>

      <Card className="glass border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead>Usuário</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum colaborador adicionado
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((r) => (
                  <TableRow key={r.id} className="border-border/20 hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{r.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{r.email || r.user_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${getRoleBadge(r.role)}`}>
                        {getRoleLabel(r.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {r.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevoke(r.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-border/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Colaborador</DialogTitle>
            <DialogDescription>
              Busque um usuário cadastrado pelo email e atribua um papel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email do Usuário</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="usuario@exemplo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFoundUser(null); }}
                  className="glass border-border/30"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSearch}
                  disabled={searching || !email.trim()}
                  className="glass border-border/30 shrink-0"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {foundUser && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{foundUser.full_name || foundUser.email}</p>
                    <p className="text-xs text-muted-foreground">{foundUser.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Papel</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="glass border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moderator">Moderador</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedRole === 'moderator'
                      ? 'Moderadores podem ajudar na gestão de conteúdo e suporte.'
                      : 'Papel básico de acesso ao sistema.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="glass border-border/30">
              Cancelar
            </Button>
            <Button
              onClick={handleGrant}
              disabled={!foundUser || granting}
              className="gradient-neon text-primary-foreground"
            >
              {granting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atribuir Papel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ==================== MAIN ADMIN PAGE ====================
export default function AdminPage() {
  const { isAdmin, isModerator, hasAccess, role, loading, adminApi } = useAdmin();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const data = await adminApi('metrics') as Metrics;
      setMetrics(data);
    } catch {
      // silently fail
    } finally {
      setMetricsLoading(false);
    }
  }, [adminApi]);

  useEffect(() => {
    if (hasAccess) loadMetrics();
  }, [hasAccess, loadMetrics]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/20">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie usuários, assinaturas e licenças do Meu Sprint PRO.
          </p>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard icon={Users} label="Total Usuários" value={metrics.totalUsers} gradient="gradient-neon" />
          <MetricCard icon={UserPlus} label="Novos (30d)" value={metrics.newUsersLast30Days} gradient="gradient-blue" />
          <MetricCard icon={CreditCard} label="Assinantes Ativos" value={metrics.activeSubscriptions} gradient="gradient-orange" />
          <MetricCard icon={TrendingUp} label="MRR Estimado" value={metrics.estimatedMRR} suffix="R$" gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <MetricCard icon={Key} label="Licenças Ativas" value={metrics.activeLicenses} gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 h-auto gap-1 glass border-border/30 p-1 rounded-xl max-w-2xl">
          <TabsTrigger value="recent" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Clock className="h-3.5 w-3.5" /> Recentes
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Users className="h-3.5 w-3.5" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <UserCog className="h-3.5 w-3.5" /> Equipe
          </TabsTrigger>
          <TabsTrigger value="licenses" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <Key className="h-3.5 w-3.5" /> Licenças
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
            <BarChart3 className="h-3.5 w-3.5" /> Métricas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <RecentSignupsTab adminApi={adminApi} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab adminApi={adminApi} />
        </TabsContent>
        <TabsContent value="collaborators">
          <CollaboratorsTab adminApi={adminApi} />
        </TabsContent>
        <TabsContent value="licenses">
          <LicensesTab adminApi={adminApi} />
        </TabsContent>
        <TabsContent value="metrics">
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={loadMetrics} className="gap-1 glass border-border/30">
                <RefreshCw className={`h-3.5 w-3.5 ${metricsLoading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </div>
            {metrics ? (
              <div className="space-y-4">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="glass border-border/30 rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-base">Resumo de Usuários</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total de cadastros</span>
                        <span className="font-bold">{metrics.totalUsers}</span>
                      </div>
                      <Separator className="bg-border/30" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Novos últimos 30 dias</span>
                        <span className="font-bold text-primary">{metrics.newUsersLast30Days}</span>
                      </div>
                      <Separator className="bg-border/30" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa de conversão</span>
                        <span className="font-bold">
                          {metrics.totalUsers > 0
                            ? ((metrics.activeSubscriptions / metrics.totalUsers) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="glass border-border/30 rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-base">Resumo Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Assinantes ativos</span>
                        <span className="font-bold">{metrics.activeSubscriptions}</span>
                      </div>
                      <Separator className="bg-border/30" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">MRR estimado</span>
                        <span className="font-bold text-primary">R$ {metrics.estimatedMRR.toFixed(2)}</span>
                      </div>
                      <Separator className="bg-border/30" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Licenças ativas</span>
                        <span className="font-bold">{metrics.activeLicenses}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* User Growth Chart - Daily new signups */}
                <Card className="glass border-border/30 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Novos Cadastros (últimos 30 dias)</CardTitle>
                    <CardDescription>Quantidade de novos usuários por dia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.userGrowthData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(v) => {
                              const d = new Date(v + 'T00:00:00');
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                            interval={4}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('pt-BR')}
                            formatter={(value: number) => [value, 'Novos usuários']}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Cumulative Growth Chart */}
                <Card className="glass border-border/30 rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Crescimento Acumulado de Usuários</CardTitle>
                    <CardDescription>Total de usuários ao longo do tempo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.cumulativeData}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(v) => {
                              const d = new Date(v + 'T00:00:00');
                              return `${d.getDate()}/${d.getMonth() + 1}`;
                            }}
                            interval={4}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                            labelFormatter={(v) => new Date(v + 'T00:00:00').toLocaleDateString('pt-BR')}
                            formatter={(value: number) => [value, 'Total de usuários']}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="hsl(var(--primary))"
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue by Tier */}
                {Object.keys(metrics.revenueByTier).length > 0 && (
                  <Card className="glass border-border/30 rounded-xl">
                    <CardHeader>
                      <CardTitle className="text-base">Receita por Plano</CardTitle>
                      <CardDescription>Distribuição de assinantes e receita por tier</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(metrics.revenueByTier).map(([productId, data], i) => {
                                const tierEntry = Object.entries(TIERS).find(([, t]) => t.product_id === productId);
                                return {
                                  name: tierEntry ? tierEntry[1].name : 'Outro',
                                  value: data.revenue,
                                  count: data.count,
                                };
                              })}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              label={({ name, value }) => `${name}: R$${value.toFixed(0)}`}
                            >
                              {Object.keys(metrics.revenueByTier).map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number, name: string, props: any) => [
                                `R$ ${value.toFixed(2)} (${props.payload.count} assinantes)`,
                                name,
                              ]}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Carregando métricas...
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
