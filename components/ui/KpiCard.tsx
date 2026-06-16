import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { KpiResult, KpiStatus, KpiTrend } from '../../src/hooks/useKpis';

interface KpiCardProps {
  kpi: KpiResult;
  onEdit?: (kpi: KpiResult) => void;
  canEdit?: boolean;
  isCompact?: boolean;
}

const STATUS_COLORS: Record<KpiStatus, string> = {
  good:     'text-emerald-500',
  warning:  'text-amber-500',
  critical: 'text-red-500',
  neutral:  'text-blue-400',
};

const STATUS_BG: Record<KpiStatus, string> = {
  good:     'bg-emerald-500/10 border-emerald-500/20',
  warning:  'bg-amber-500/10 border-amber-500/20',
  critical: 'bg-red-500/10 border-red-500/20',
  neutral:  'bg-blue-500/10 border-blue-500/20',
};

const STATUS_BAR: Record<KpiStatus, string> = {
  good:     'bg-emerald-500',
  warning:  'bg-amber-500',
  critical: 'bg-red-500',
  neutral:  'bg-blue-400',
};

const STATUS_LABEL: Record<KpiStatus, string> = {
  good:     'Bom',
  warning:  'Atenção',
  critical: 'Crítico',
  neutral:  'Neutro',
};

const STATUS_DOT: Record<KpiStatus, string> = {
  good:     'bg-emerald-500',
  warning:  'bg-amber-500',
  critical: 'bg-red-500 animate-pulse',
  neutral:  'bg-blue-400',
};

const TREND_ICON: Record<KpiTrend, string> = {
  up:      'trending_up',
  down:    'trending_down',
  neutral: 'trending_flat',
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#6b7280', '#f59e0b', '#ef4444', '#8b5cf6'];

const CHART_HEIGHT = 120;

export const KpiCard: React.FC<KpiCardProps> = ({ kpi, onEdit, canEdit = false, isCompact = false }) => {
  const statusColor = STATUS_COLORS[kpi.status];
  const statusBg = STATUS_BG[kpi.status];
  const barColor = STATUS_BAR[kpi.status];

  // For percent KPIs, progress bar value (capped 0-100)
  const barValue = kpi.unit === 'percent' ? Math.min(100, Math.max(0, kpi.value)) : null;

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group ${isCompact ? 'p-4' : 'p-5'}`}>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={`size-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${statusBg}`}>
            <span className={`material-symbols-outlined text-[18px] ${statusColor}`}>{kpi.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-sub truncate">{kpi.label}</p>
            {!isCompact && <p className="text-[9px] text-text-sub/70 mt-0.5 leading-tight line-clamp-1">{kpi.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {/* Status dot */}
          <div className={`size-2 rounded-full ${STATUS_DOT[kpi.status]}`} title={STATUS_LABEL[kpi.status]} />
          {/* Manual badge */}
          {kpi.isManual && (
            <span className="text-[8px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">Manual</span>
          )}
        </div>
      </div>

      {/* Main Value */}
      <div className="mb-3">
        <div className="flex items-end gap-2">
          <span className={`font-black leading-none ${isCompact ? 'text-2xl' : 'text-3xl'} ${statusColor}`}>
            {kpi.formattedValue}
          </span>
          {kpi.trend !== 'neutral' && (
            <div className={`flex items-center gap-0.5 mb-0.5 ${kpi.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
              <span className="material-symbols-outlined text-[14px]">{TREND_ICON[kpi.trend]}</span>
              <span className="text-[10px] font-bold">{kpi.trendPercent.toFixed(1)}%</span>
            </div>
          )}
        </div>
        {kpi.previousValue !== undefined && (
          <p className="text-[9px] text-text-sub mt-1">
            Mês anterior: {kpi.unit === 'percent' ? `${kpi.previousValue?.toFixed(1)}%` : kpi.previousValue?.toFixed(0)}
          </p>
        )}
      </div>

      {/* Progress bar (for percent KPIs) */}
      {barValue !== null && !kpi.chartData?.length && (
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${barValue}%` }}
            />
          </div>
        </div>
      )}

      {/* Mini Chart */}
      {kpi.chartData && kpi.chartData.length > 0 && kpi.chartType === 'pie' && !isCompact && (
        <div className="mt-2" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={kpi.chartData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value" paddingAngle={2}>
                {kpi.chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: 'none', borderRadius: 8, fontSize: 10 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#ccc' }}
                formatter={(v: number, n: string) => [`${v}`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
            {kpi.chartData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="size-2 rounded-full" style={{ background: entry.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[9px] text-text-sub">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status label */}
      <div className="mt-auto pt-3 flex items-center justify-between">
        <span className={`text-[9px] font-black uppercase tracking-widest ${statusColor}`}>{STATUS_LABEL[kpi.status]}</span>
        {canEdit && (
          <button
            onClick={() => onEdit?.(kpi)}
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-text-sub hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[12px]">{kpi.isManual ? 'edit' : 'tune'}</span>
            {kpi.isManual ? 'Atualizar' : 'Limites'}
          </button>
        )}
      </div>
    </div>
  );
};
