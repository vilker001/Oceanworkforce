import React, { useState, useEffect } from 'react';
import { KpiCard } from '../ui/KpiCard';
import { useKpis } from '../../src/hooks/useKpis';
import type { KpiResult } from '../../src/hooks/useKpis';
import type { User } from '../../types';

interface KpiDashboardProps {
  currentUser: User;
}

const ROLE_ICONS: Record<string, string> = {
  'Gestor de Projetos': 'account_tree',
  'Gestor Técnico': 'code',
  'Gestor de Trading': 'candlestick_chart',
  'Fotógrafo': 'photo_camera',
  'Promoter de Venda': 'campaign',
  'Colaborador': 'person',
};

const ROLE_COLORS: Record<string, string> = {
  'Gestor de Projetos': 'from-blue-600 to-indigo-700',
  'Gestor Técnico': 'from-violet-600 to-purple-700',
  'Gestor de Trading': 'from-emerald-600 to-teal-700',
  'Fotógrafo': 'from-orange-500 to-amber-600',
  'Promoter de Venda': 'from-rose-500 to-pink-600',
  'Colaborador': 'from-slate-500 to-zinc-600',
};

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── Manual Edit Modal ─────────────────────────────────────────────────────────

interface ManualEditModalProps {
  kpi: KpiResult;
  onSave: (value: number, notes: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const ManualEditModal: React.FC<ManualEditModalProps> = ({ kpi, onSave, onClose, saving }) => {
  const [value, setValue] = useState(kpi.value.toString());
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">{kpi.icon}</span>
          </div>
          <div>
            <h3 className="font-black text-lg">{kpi.label}</h3>
            <p className="text-text-sub text-xs">{kpi.description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-sub mb-2 block">
              Valor {kpi.unit === 'percent' ? '(%)' : kpi.unit === 'mt' ? '(MT)' : kpi.unit === 'usd' ? '(USD)' : ''}
            </label>
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-primary rounded-2xl p-4 text-xl font-black outline-none transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-text-sub mb-2 block">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Valores baseados em relatório semanal..."
              className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-primary rounded-2xl p-3 text-sm outline-none transition-all resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 font-bold text-sm text-text-sub hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all">Cancelar</button>
          <button
            onClick={() => onSave(parseFloat(value) || 0, notes)}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> A guardar...</> : <><span className="material-symbols-outlined text-sm">save</span> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Threshold Edit Modal ──────────────────────────────────────────────────────

interface ThresholdEditModalProps {
  kpi: KpiResult;
  currentGood: number;
  currentWarning: number;
  onSave: (good: number, warning: number) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  isGP: boolean;
}

const ThresholdEditModal: React.FC<ThresholdEditModalProps> = ({ kpi, currentGood, currentWarning, onSave, onClose, saving, isGP }) => {
  const [good, setGood] = useState(currentGood.toString());
  const [warning, setWarning] = useState(currentWarning.toString());
  const [error, setError] = useState('');

  const handleSave = async () => {
    const g = parseFloat(good);
    const w = parseFloat(warning);
    if (isNaN(g) || isNaN(w)) { setError('Valores inválidos.'); return; }
    const result = await onSave(g, w);
    if ((result as any)?.message) setError((result as any).message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500">tune</span>
          </div>
          <div>
            <h3 className="font-black text-lg">Limites: {kpi.label}</h3>
            <p className="text-text-sub text-xs">Configurar thresholds de status para este KPI</p>
          </div>
        </div>
        {error && <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm mb-4">{error}</div>}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 block">🟢 Limite Bom (acima = Bom)</label>
            <input type="number" step="0.1" value={good} onChange={e => setGood(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 rounded-2xl p-3 text-lg font-black outline-none transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 block">🟡 Limite Atenção (abaixo = Crítico)</label>
            <input type="number" step="0.1" value={warning} onChange={e => setWarning(e.target.value)} className="w-full bg-gray-50 dark:bg-zinc-800 border-2 border-amber-200 dark:border-amber-800 focus:border-amber-500 rounded-2xl p-3 text-lg font-black outline-none transition-all" />
          </div>
          <p className="text-[9px] text-text-sub bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">ℹ️ Editável uma vez por mês. Após guardar, a próxima edição só será possível no mês seguinte.</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 font-bold text-sm text-text-sub hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? 'A guardar...' : <><span className="material-symbols-outlined text-sm">save</span> Guardar Limites</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Alert Panel (Gestor de Projetos only) ─────────────────────────────────────

interface AlertPanelProps {
  criticalKpis: { memberName: string; memberAvatar?: string; role: string; kpi: KpiResult }[];
}

const AlertPanel: React.FC<AlertPanelProps> = ({ criticalKpis }) => {
  if (criticalKpis.length === 0) return null;
  return (
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-red-500 animate-pulse">crisis_alert</span>
        <h3 className="font-black text-red-600 dark:text-red-400 uppercase tracking-wider text-sm">KPIs Críticos da Equipa ({criticalKpis.length})</h3>
      </div>
      <div className="flex flex-col gap-2">
        {criticalKpis.map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl p-3 border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-sm">{item.memberName}</span>
              <span className="text-[10px] text-text-sub bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{item.role}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px] text-red-500">{item.kpi.icon}</span>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">{item.kpi.label}: {item.kpi.formattedValue}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main KPI Dashboard ────────────────────────────────────────────────────────

export const KpiDashboard: React.FC<KpiDashboardProps> = ({ currentUser }) => {
  const { kpis, thresholds, loading, error, refetch, updateManualKpi, updateThreshold } = useKpis(
    currentUser.id!,
    currentUser.role
  );

  const [editingKpi, setEditingKpi] = useState<KpiResult | null>(null);
  const [editingThreshold, setEditingThreshold] = useState<KpiResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isGP = currentUser.role === 'Gestor de Projetos';
  const now = new Date();
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const roleGradient = ROLE_COLORS[currentUser.role] || ROLE_COLORS['Colaborador'];
  const roleIcon = ROLE_ICONS[currentUser.role] || 'person';

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveManual = async (value: number, notes: string) => {
    if (!editingKpi) return;
    setSaving(true);
    const ok = await updateManualKpi(editingKpi.key, value, notes);
    setSaving(false);
    if (ok) { showMessage('success', `KPI "${editingKpi.label}" atualizado!`); setEditingKpi(null); refetch(); }
    else showMessage('error', 'Erro ao guardar. Tenta novamente.');
  };

  const handleSaveThreshold = async (good: number, warning: number) => {
    if (!editingThreshold) return;
    setSaving(true);
    const result = await updateThreshold(editingThreshold.key, good, warning);
    setSaving(false);
    if (result.success) { showMessage('success', 'Limites atualizados!'); setEditingThreshold(null); }
    else showMessage('error', result.message || 'Erro ao guardar limites.');
    return result;
  };

  const handleEdit = (kpi: KpiResult) => {
    if (kpi.isManual) setEditingKpi(kpi);
    else setEditingThreshold(kpi);
  };

  // Can user edit a given KPI?
  const canEditKpi = (kpi: KpiResult): boolean => {
    // Manual KPIs: user can always edit their own
    if (kpi.isManual) return true;
    // Threshold editing: GP can edit all; managers can edit operational roles; own thresholds only GP can change
    if (isGP) return true;
    const managerRoles = ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading'];
    if (managerRoles.includes(currentUser.role)) return false; // managers can't change their own thresholds
    return false;
  };

  // Group KPIs
  const chartKpis = kpis.filter(k => k.chartData && k.chartData.length > 0);
  const regularKpis = kpis.filter(k => !k.chartData || k.chartData.length === 0);
  const criticalKpis = kpis.filter(k => k.status === 'critical');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
        </div>
        <p className="text-text-sub font-medium">A calcular os seus KPIs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="size-16 rounded-3xl bg-red-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
        </div>
        <p className="text-red-500 font-bold">Erro ao carregar KPIs</p>
        <p className="text-text-sub text-sm text-center max-w-sm">{error}</p>
        <button onClick={refetch} className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Toast message */}
      {message && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="material-symbols-outlined text-sm">{message.type === 'success' ? 'check_circle' : 'error'}</span>
          {message.text}
        </div>
      )}

      {/* Hero Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${roleGradient} p-8 text-white shadow-2xl`}>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 size-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 size-48 bg-black/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-white text-2xl">{roleIcon}</span>
            </div>
            <div>
              <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Dashboard de KPIs</p>
              <h1 className="text-2xl lg:text-3xl font-black">{currentUser.name}</h1>
              <p className="text-white/80 text-sm font-medium mt-0.5">{currentUser.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 text-center">
              <p className="text-white/70 text-[9px] font-black uppercase tracking-widest">Período</p>
              <p className="text-white font-black text-sm">{currentMonthLabel}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2.5 text-center">
              <p className="text-white/70 text-[9px] font-black uppercase tracking-widest">KPIs</p>
              <p className="text-white font-black text-sm">{kpis.length}</p>
            </div>
            {criticalKpis.length > 0 && (
              <div className="bg-red-500/30 border border-red-300/40 rounded-2xl px-4 py-2.5 text-center">
                <p className="text-white/80 text-[9px] font-black uppercase tracking-widest">Críticos</p>
                <p className="text-white font-black text-sm">{criticalKpis.length}</p>
              </div>
            )}
            <button
              onClick={refetch}
              className="size-10 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl flex items-center justify-center transition-all"
              title="Atualizar KPIs"
            >
              <span className="material-symbols-outlined text-white text-lg">refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Bons', count: kpis.filter(k => k.status === 'good').length, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: 'check_circle' },
          { label: 'Atenção', count: kpis.filter(k => k.status === 'warning').length, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: 'warning' },
          { label: 'Críticos', count: kpis.filter(k => k.status === 'critical').length, color: 'text-red-500', bg: 'bg-red-500/10', icon: 'crisis_alert' },
          { label: 'Neutros', count: kpis.filter(k => k.status === 'neutral').length, color: 'text-blue-400', bg: 'bg-blue-400/10', icon: 'info' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-2xl p-4 flex items-center gap-3 border border-transparent`}>
            <span className={`material-symbols-outlined ${item.color}`}>{item.icon}</span>
            <div>
              <p className={`text-xl font-black ${item.color}`}>{item.count}</p>
              <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Panel (GP only) */}
      {isGP && criticalKpis.length > 0 && (
        <AlertPanel criticalKpis={criticalKpis.map(k => ({
          memberName: currentUser.name,
          memberAvatar: currentUser.avatar,
          role: currentUser.role,
          kpi: k,
        }))} />
      )}

      {/* Regular KPI Cards */}
      {regularKpis.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Indicadores de Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {regularKpis.map(kpi => (
              <KpiCard
                key={kpi.key}
                kpi={kpi}
                canEdit={canEditKpi(kpi)}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chart KPIs */}
      {chartKpis.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Análise Visual</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chartKpis.map(kpi => (
              <KpiCard
                key={kpi.key}
                kpi={kpi}
                canEdit={canEditKpi(kpi)}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-400 mt-0.5 text-lg">info</span>
        <div>
          <p className="text-blue-700 dark:text-blue-400 font-bold text-sm mb-1">Como funcionam os KPIs</p>
          <p className="text-blue-600/80 dark:text-blue-400/70 text-xs leading-relaxed">
            Os KPIs são recalculados automaticamente em tempo real com base nos dados do sistema. KPIs marcados como <strong>Manual</strong> precisam ser atualizados por ti. Os limites de status (Bom/Atenção/Crítico) podem ser ajustados pelos gestores uma vez por mês.
          </p>
        </div>
      </div>

      {/* Modals */}
      {editingKpi && (
        <ManualEditModal
          kpi={editingKpi}
          onSave={handleSaveManual}
          onClose={() => setEditingKpi(null)}
          saving={saving}
        />
      )}
      {editingThreshold && (
        <ThresholdEditModal
          kpi={editingThreshold}
          currentGood={thresholds.find(t => t.kpi_key === editingThreshold.key)?.good_threshold ?? 80}
          currentWarning={thresholds.find(t => t.kpi_key === editingThreshold.key)?.warning_threshold ?? 50}
          onSave={handleSaveThreshold}
          onClose={() => setEditingThreshold(null)}
          saving={saving}
          isGP={isGP}
        />
      )}
    </div>
  );
};
