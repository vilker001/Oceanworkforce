import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KpiStatus = 'good' | 'warning' | 'critical' | 'neutral';
export type KpiTrend = 'up' | 'down' | 'neutral';
export type KpiUnit = 'percent' | 'mt' | 'usd' | 'days' | 'count' | 'ratio';
export type KpiChartType = 'bar' | 'pie' | 'line' | 'none';

export interface KpiResult {
  key: string;
  label: string;
  description: string;
  icon: string;
  value: number;
  formattedValue: string;
  previousValue?: number;
  trend: KpiTrend;
  trendPercent: number;
  status: KpiStatus;
  unit: KpiUnit;
  isManual: boolean;
  chartData?: { name: string; value: number; color?: string }[];
  chartType: KpiChartType;
}

export interface TeamMemberKpis {
  userId: string;
  userName: string;
  userAvatar: string;
  role: string;
  kpis: KpiResult[];
}

export interface KpiThreshold {
  role: string;
  kpi_key: string;
  good_threshold: number;
  warning_threshold: number;
  direction: 'higher_better' | 'lower_better';
  last_edit_month?: string;
}

export interface ManualKpiEntry {
  id?: string;
  user_id: string;
  kpi_key: string;
  value: number;
  month_year: string;
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = new Date();
const monthYear = (d = now) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthStart = (d = now) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
const monthEnd = (d = now) => new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
const prevMonthStart = () => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.toISOString().split('T')[0]; };
const prevMonthEnd = () => { const d = new Date(now.getFullYear(), now.getMonth(), 0); return d.toISOString().split('T')[0]; };

const fmtPercent = (v: number) => `${v.toFixed(1)}%`;
const fmtMT = (v: number) => `${v.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })} MT`;
const fmtUSD = (v: number) => `$${v.toFixed(2)}`;
const fmtDays = (v: number) => `${v.toFixed(1)} dias`;
const fmtCount = (v: number) => `${Math.round(v)}`;
const fmtRatio = (v: number) => v.toFixed(2);

const formatValue = (value: number, unit: KpiUnit): string => {
  switch (unit) {
    case 'percent': return fmtPercent(value);
    case 'mt': return fmtMT(value);
    case 'usd': return fmtUSD(value);
    case 'days': return fmtDays(value);
    case 'count': return fmtCount(value);
    case 'ratio': return fmtRatio(value);
    default: return String(value);
  }
};

const computeStatus = (value: number, threshold: KpiThreshold | undefined): KpiStatus => {
  if (!threshold) return 'neutral';
  const { good_threshold, warning_threshold, direction } = threshold;
  if (direction === 'higher_better') {
    if (value >= good_threshold) return 'good';
    if (value >= warning_threshold) return 'warning';
    return 'critical';
  } else {
    if (value <= good_threshold) return 'good';
    if (value <= warning_threshold) return 'warning';
    return 'critical';
  }
};

const computeTrend = (current: number, previous?: number): { trend: KpiTrend; trendPercent: number } => {
  if (previous === undefined || previous === 0) return { trend: 'neutral', trendPercent: 0 };
  const diff = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(diff) < 0.5) return { trend: 'neutral', trendPercent: 0 };
  return { trend: diff > 0 ? 'up' : 'down', trendPercent: Math.abs(diff) };
};

const makeKpi = (
  opts: Omit<KpiResult, 'formattedValue' | 'trend' | 'trendPercent' | 'status'> & {
    threshold?: KpiThreshold;
  }
): KpiResult => {
  const { threshold, ...rest } = opts;
  const { trend, trendPercent } = computeTrend(rest.value, rest.previousValue);
  return {
    ...rest,
    formattedValue: formatValue(rest.value, rest.unit),
    trend,
    trendPercent,
    status: computeStatus(rest.value, threshold),
    chartType: rest.chartType ?? 'none',
  };
};

// ─── KPI Calculators by Role ──────────────────────────────────────────────────

const calcGestorProjetos = async (
  userId: string,
  thresholds: KpiThreshold[],
  manualValues: ManualKpiEntry[]
): Promise<KpiResult[]> => {
  const thr = (key: string) => thresholds.find(t => t.kpi_key === key);
  const curMY = monthYear();

  const [tasksRes, stagesRes, transRes, usersRes] = await Promise.all([
    supabase.from('tasks').select('id, status, due_date, created_at, updated_at').gte('created_at', monthStart()).lte('created_at', monthEnd()),
    supabase.from('project_stages').select('id, status, due_date, completed_at, start_date, created_at').gte('created_at', monthStart()),
    supabase.from('transactions').select('id, type, value, date, status').gte('date', monthStart()).lte('date', monthEnd()),
    supabase.from('users').select('id, name, role'),
    ]);

  const [prevTasksRes, prevTransRes] = await Promise.all([
    supabase.from('tasks').select('id, status').gte('created_at', prevMonthStart()).lte('created_at', prevMonthEnd()),
    supabase.from('transactions').select('id, type, value').gte('date', prevMonthStart()).lte('date', prevMonthEnd()),
  ]);

  const tasks = tasksRes.data || [];
  const stages = stagesRes.data || [];
  const trans = transRes.data || [];
  const prevTasks = prevTasksRes.data || [];
  const prevTrans = prevTransRes.data || [];

  // Taxa de Conclusão de Tarefas
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'Done').length;
  const taxaConclusao = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
  const prevDone = prevTasks.filter(t => t.status === 'Done').length;
  const prevTaxaConclusao = prevTasks.length > 0 ? (prevDone / prevTasks.length) * 100 : undefined;

  // Taxa de Retrabalho (tarefas em atraso que não estão Done)
  const overdueTasks = tasks.filter(t => t.status !== 'Done' && t.due_date && new Date(t.due_date) < now).length;
  const taxaRetrabalho = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

  // Taxa de Cumprimento de Marcos
  const totalStages = stages.length;
  const onTimeStages = stages.filter(s => s.status === 'Concluido' && s.completed_at && s.due_date && new Date(s.completed_at) <= new Date(s.due_date)).length;
  const taxaMarcos = totalStages > 0 ? (onTimeStages / totalStages) * 100 : 0;

  // Receita e Despesas
  const receita = trans.filter(t => t.type === 'income' && (t.status === 'Recebido' || t.status === 'Pago')).reduce((s, t) => s + Number(t.value), 0);
  const despesas = trans.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.value), 0);
  const prevReceita = prevTrans.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.value), 0);

  // Eficiência da Equipa (XP médio) - via gamification
  const xpRes = await supabase.from('xp_history').select('user_id, xp_amount').gte('created_at', monthStart()).lte('created_at', monthEnd());
  const xpData = xpRes.data || [];
  const xpByUser: Record<string, number> = {};
  xpData.forEach(x => { xpByUser[x.user_id] = (xpByUser[x.user_id] || 0) + x.xp_amount; });
  const xpValues = Object.values(xpByUser);
  const avgXp = xpValues.length > 0 ? xpValues.reduce((s, v) => s + v, 0) / xpValues.length : 0;

  const prevXpRes = await supabase.from('xp_history').select('user_id, xp_amount').gte('created_at', prevMonthStart()).lte('created_at', prevMonthEnd());
  const prevXpData = prevXpRes.data || [];
  const prevXpByUser: Record<string, number> = {};
  prevXpData.forEach(x => { prevXpByUser[x.user_id] = (prevXpByUser[x.user_id] || 0) + x.xp_amount; });
  const prevXpValues = Object.values(prevXpByUser);
  const prevAvgXp = prevXpValues.length > 0 ? prevXpValues.reduce((s, v) => s + v, 0) / prevXpValues.length : undefined;

  return [
    makeKpi({ key: 'taxa_conclusao_tarefas', label: 'Taxa de Conclusão de Tarefas', description: 'Tarefas concluídas vs total criadas no mês', icon: 'task_alt', value: taxaConclusao, previousValue: prevTaxaConclusao, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('taxa_conclusao_tarefas') }),
    makeKpi({ key: 'taxa_retrabalho', label: 'Tarefas em Atraso', description: 'Tarefas não concluídas além do prazo', icon: 'warning', value: taxaRetrabalho, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('taxa_retrabalho') }),
    makeKpi({ key: 'taxa_cumprimento_marcos', label: 'Cumprimento de Marcos', description: 'Etapas concluídas na data prevista ou antes', icon: 'flag', value: taxaMarcos, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('taxa_cumprimento_marcos') }),
    makeKpi({ key: 'receita_mensal', label: 'Receita do Mês', description: 'Total de receitas recebidas no mês atual', icon: 'payments', value: receita, previousValue: prevReceita, unit: 'mt', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'resultado_liquido', label: 'Resultado Líquido', description: 'Receita menos despesas do mês', icon: 'account_balance', value: receita - despesas, unit: 'mt', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'eficiencia_equipa', label: 'Eficiência da Equipa (XP)', description: 'Média de XP ganho por colaborador este mês', icon: 'bolt', value: avgXp, previousValue: prevAvgXp, unit: 'count', isManual: false, chartType: 'none', threshold: thr('eficiencia_equipa') }),
    makeKpi({ key: 'etapas_concluidas', label: 'Etapas Concluídas', description: 'Total de etapas de projeto concluídas no mês', icon: 'check_circle', value: stages.filter(s => s.status === 'Concluido').length, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
  ];
};

const calcGestorTecnico = async (
  userId: string,
  thresholds: KpiThreshold[],
  manualValues: ManualKpiEntry[]
): Promise<KpiResult[]> => {
  const thr = (key: string) => thresholds.find(t => t.kpi_key === key);
  const curMY = monthYear();

  const [stagesRes, prevStagesRes] = await Promise.all([
    supabase.from('project_stages').select('id, status, due_date, completed_at, start_date, created_at'),
    supabase.from('project_stages').select('id, status, due_date, completed_at').gte('created_at', prevMonthStart()).lte('created_at', prevMonthEnd()),
  ]);

  const stages = stagesRes.data || [];
  const prevStages = prevStagesRes.data || [];
  const curStages = stages.filter(s => s.created_at >= monthStart());

  // Tempo médio de desenvolvimento
  const completedWithDates = stages.filter(s => s.status === 'Concluido' && s.start_date && s.completed_at);
  const avgDays = completedWithDates.length > 0
    ? completedWithDates.reduce((sum, s) => {
        const diff = (new Date(s.completed_at!).getTime() - new Date(s.start_date).getTime()) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0) / completedWithDates.length
    : 0;

  // Projetos concluídos
  const projectsRes = await supabase.from('projects').select('id, status, created_at').eq('status', 'Concluido').gte('created_at', monthStart());
  const projectsDone = (projectsRes.data || []).length;

  // Eficiência técnica (etapas no prazo)
  const curCompleted = curStages.filter(s => s.status === 'Concluido');
  const onTime = curCompleted.filter(s => s.completed_at && s.due_date && new Date(s.completed_at) <= new Date(s.due_date)).length;
  const eficiencia = curCompleted.length > 0 ? (onTime / curCompleted.length) * 100 : 0;
  const prevCompleted = prevStages.filter(s => s.status === 'Concluido');
  const prevOnTime = prevCompleted.filter(s => s.completed_at && s.due_date && new Date(s.completed_at) <= new Date(s.due_date)).length;
  const prevEficiencia = prevCompleted.length > 0 ? (prevOnTime / prevCompleted.length) * 100 : undefined;

  // Taxa de automação (manual)
  const autoManual = manualValues.find(m => m.kpi_key === 'taxa_automacao' && m.month_year === curMY);

  // Etapas concluídas vs pendentes (chart data)
  const stageDone = curStages.filter(s => s.status === 'Concluido').length;
  const stagePending = curStages.filter(s => s.status === 'A Fazer').length;
  const stageProgress = curStages.filter(s => s.status === 'Em Progresso').length;

  return [
    makeKpi({ key: 'tempo_medio_dev', label: 'Tempo Médio por Etapa', description: 'Média de dias para concluir uma etapa', icon: 'timer', value: avgDays, unit: 'days', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'projetos_concluidos', label: 'Projetos Concluídos', description: 'Projetos finalizados este mês', icon: 'folder_open', value: projectsDone, unit: 'count', isManual: false, chartType: 'none', threshold: thr('projetos_concluidos') }),
    makeKpi({ key: 'eficiencia_equipa_tecnica', label: 'Eficiência da Equipa', description: 'Etapas concluídas no prazo vs total', icon: 'speed', value: eficiencia, previousValue: prevEficiencia, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('eficiencia_equipa_tecnica') }),
    makeKpi({ key: 'taxa_automacao', label: 'Taxa de Automação', description: 'Percentagem de processos automatizados (manual)', icon: 'smart_toy', value: autoManual?.value ?? 0, unit: 'percent', isManual: true, chartType: 'none', threshold: thr('taxa_automacao') }),
    makeKpi({ key: 'etapas_status', label: 'Distribuição de Etapas', description: 'Etapas por estado no mês atual', icon: 'bar_chart', value: curStages.length, unit: 'count', isManual: false, chartType: 'pie', chartData: [
      { name: 'Concluídas', value: stageDone, color: '#10b981' },
      { name: 'Em Progresso', value: stageProgress, color: '#3b82f6' },
      { name: 'A Fazer', value: stagePending, color: '#6b7280' },
    ], threshold: undefined }),
    makeKpi({ key: 'etapas_concluidas_total', label: 'Etapas Concluídas', description: 'Total de etapas concluídas este mês', icon: 'check_circle', value: stageDone, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
  ];
};

const calcGestorTrading = async (
  userId: string,
  thresholds: KpiThreshold[],
  manualValues: ManualKpiEntry[]
): Promise<KpiResult[]> => {
  const thr = (key: string) => thresholds.find(t => t.kpi_key === key);
  const curMY = monthYear();

  const [allTradesRes, monthTradesRes, prevMonthTradesRes] = await Promise.all([
    supabase.from('trading_trades').select('*').eq('created_by', userId),
    supabase.from('trading_trades').select('*').eq('created_by', userId).gte('open_date', monthStart()).lte('open_date', monthEnd()),
    supabase.from('trading_trades').select('*').eq('created_by', userId).gte('open_date', prevMonthStart()).lte('open_date', prevMonthEnd()),
  ]);

  const allTrades = allTradesRes.data || [];
  const monthTrades = monthTradesRes.data || [];
  const prevTrades = prevMonthTradesRes.data || [];

  const closedMonth = monthTrades.filter(t => t.result);
  const closedPrev = prevTrades.filter(t => t.result);
  const closedAll = allTrades.filter(t => t.result);

  // Win Rate
  const wins = closedMonth.filter(t => t.result === 'positivo').length;
  const winRate = closedMonth.length > 0 ? (wins / closedMonth.length) * 100 : 0;
  const prevWins = closedPrev.filter(t => t.result === 'positivo').length;
  const prevWinRate = closedPrev.length > 0 ? (prevWins / closedPrev.length) * 100 : undefined;

  // Lucro líquido
  const lucroMes = closedMonth.reduce((s, t) => s + (Number(t.realized_usd) || 0), 0);
  const lucroPrev = closedPrev.reduce((s, t) => s + (Number(t.realized_usd) || 0), 0);

  // Profit Factor
  const totalGain = closedAll.filter(t => (t.realized_usd || 0) > 0).reduce((s, t) => s + Number(t.realized_usd), 0);
  const totalLoss = Math.abs(closedAll.filter(t => (t.realized_usd || 0) < 0).reduce((s, t) => s + Number(t.realized_usd), 0));
  const profitFactor = totalLoss > 0 ? totalGain / totalLoss : totalGain > 0 ? 999 : 0;

  // Retorno mensal %
  const initialCapital = manualValues.find(m => m.kpi_key === 'capital_inicial' && m.month_year === curMY)?.value ?? 0;
  const retornoMensal = initialCapital > 0 ? (lucroMes / initialCapital) * 100 : 0;
  const prevRetorno = initialCapital > 0 ? (lucroPrev / initialCapital) * 100 : undefined;

  // Risco médio por trade
  const tradesComCapital = monthTrades.filter(t => t.stop_loss_usd && initialCapital > 0);
  const riscoMedio = tradesComCapital.length > 0
    ? tradesComCapital.reduce((s, t) => s + (Number(t.stop_loss_usd) / initialCapital) * 100, 0) / tradesComCapital.length
    : 0;

  // Expectância matemática
  const avgWin = wins > 0 ? closedMonth.filter(t => t.result === 'positivo').reduce((s, t) => s + Number(t.realized_usd || 0), 0) / wins : 0;
  const losses = closedMonth.filter(t => t.result === 'negativo').length;
  const avgLoss = losses > 0 ? Math.abs(closedMonth.filter(t => t.result === 'negativo').reduce((s, t) => s + Number(t.realized_usd || 0), 0) / losses) : 0;
  const lossRate = closedMonth.length > 0 ? (losses / closedMonth.length) : 0;
  const winRateDecimal = closedMonth.length > 0 ? wins / closedMonth.length : 0;
  const expectancia = (winRateDecimal * avgWin) - (lossRate * avgLoss);

  // Classificações
  const violacoes = monthTrades.filter(t => t.classification === 'violação de regras').length;
  const foraDePlano = monthTrades.filter(t => t.classification === 'fora do plano').length;
  const dentroDePlano = monthTrades.filter(t => t.classification === 'dentro do plano').length;
  const cumprimentoPlano = monthTrades.length > 0 ? (dentroDePlano / monthTrades.length) * 100 : 0;

  // Relação Risco-Retorno
  const tradesComTpSl = monthTrades.filter(t => t.take_profit_usd && t.stop_loss_usd && t.stop_loss_usd > 0);
  const relacaoRR = tradesComTpSl.length > 0
    ? tradesComTpSl.reduce((s, t) => s + (Number(t.take_profit_usd) / Number(t.stop_loss_usd)), 0) / tradesComTpSl.length
    : 0;

  // Dias positivos vs negativos
  const tradesByDay: Record<string, number> = {};
  closedMonth.forEach(t => {
    const day = (t.open_date || '').split('T')[0];
    tradesByDay[day] = (tradesByDay[day] || 0) + Number(t.realized_usd || 0);
  });
  const diasPositivos = Object.values(tradesByDay).filter(v => v > 0).length;
  const diasNegativos = Object.values(tradesByDay).filter(v => v < 0).length;

  return [
    makeKpi({ key: 'win_rate', label: 'Win Rate', description: 'Percentagem de trades positivos', icon: 'trending_up', value: winRate, previousValue: prevWinRate, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('win_rate') }),
    makeKpi({ key: 'lucro_liquido_usd', label: 'Lucro Líquido', description: 'Resultado líquido de todos os trades do mês', icon: 'attach_money', value: lucroMes, previousValue: lucroPrev, unit: 'usd', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'retorno_mensal', label: 'Retorno Mensal', description: 'Retorno % sobre capital inicial do mês', icon: 'percent', value: retornoMensal, previousValue: prevRetorno, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('retorno_mensal') }),
    makeKpi({ key: 'capital_inicial', label: 'Capital Inicial do Mês', description: 'Capital no início do mês (inserção manual)', icon: 'account_balance_wallet', value: initialCapital, unit: 'usd', isManual: true, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'profit_factor', label: 'Profit Factor', description: 'Rácio entre total de ganhos e total de perdas', icon: 'balance', value: profitFactor, unit: 'ratio', isManual: false, chartType: 'none', threshold: thr('profit_factor') }),
    makeKpi({ key: 'expectancia', label: 'Expectância Matemática', description: 'Ganho esperado médio por trade (USD)', icon: 'functions', value: expectancia, unit: 'usd', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'relacao_rr', label: 'Relação Risco-Retorno', description: 'Média de TP/SL de todos os trades', icon: 'swap_horiz', value: relacaoRR, unit: 'ratio', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'risco_medio', label: 'Risco Médio por Trade', description: 'Percentagem do capital arriscado por trade', icon: 'crisis_alert', value: riscoMedio, unit: 'percent', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'num_trades', label: 'Trades Executados', description: 'Total de trades fechados este mês', icon: 'swap_calls', value: closedMonth.length, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'violacoes_regras', label: 'Violações de Regras', description: 'Trades classificados como violação de regras', icon: 'gavel', value: violacoes, unit: 'count', isManual: false, chartType: 'none', threshold: thr('violacoes_regras') }),
    makeKpi({ key: 'fora_do_plano', label: 'Trades Fora do Plano', description: 'Trades executados fora do plano definido', icon: 'rule', value: foraDePlano, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'cumprimento_plano', label: 'Cumprimento do Plano', description: 'Percentagem de trades dentro do plano', icon: 'checklist', value: cumprimentoPlano, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('cumprimento_plano') }),
    makeKpi({ key: 'dias_positivos_negativos', label: 'Dias Positivos vs Negativos', description: 'Dias com resultado líquido positivo vs negativo', icon: 'calendar_month', value: diasPositivos, unit: 'count', isManual: false, chartType: 'pie', chartData: [
      { name: 'Positivos', value: diasPositivos, color: '#10b981' },
      { name: 'Negativos', value: diasNegativos, color: '#ef4444' },
    ], threshold: undefined }),
  ];
};

const calcFotografo = async (
  userId: string,
  thresholds: KpiThreshold[],
  manualValues: ManualKpiEntry[]
): Promise<KpiResult[]> => {
  const thr = (key: string) => thresholds.find(t => t.kpi_key === key);

  const [sessoesRes, prevSessoesRes, xpRes] = await Promise.all([
    supabase.from('photo_sessions').select('id, status, price_mt, date, photographer_id').eq('photographer_id', userId).gte('date', monthStart()).lte('date', monthEnd()),
    supabase.from('photo_sessions').select('id, status, price_mt').eq('photographer_id', userId).gte('date', prevMonthStart()).lte('date', prevMonthEnd()),
    supabase.from('xp_history').select('xp_amount').eq('user_id', userId),
  ]);

  const sessoes = sessoesRes.data || [];
  const prevSessoes = prevSessoesRes.data || [];
  const xpData = xpRes.data || [];

  const agendadas = sessoes.filter(s => s.status !== 'Cancelada').length;
  const executadas = sessoes.filter(s => s.status === 'Executada').length;
  const taxaExecucao = agendadas > 0 ? (executadas / agendadas) * 100 : 0;
  const prevExecutadas = prevSessoes.filter(s => s.status === 'Executada').length;
  const prevTaxa = prevSessoes.filter(s => s.status !== 'Cancelada').length > 0
    ? (prevExecutadas / prevSessoes.filter(s => s.status !== 'Cancelada').length) * 100 : undefined;

  const receitaIndividual = sessoes.filter(s => s.status === 'Executada').reduce((s, sess) => s + Number(sess.price_mt || 0) * 0.5, 0);
  const totalXp = xpData.reduce((s, x) => s + x.xp_amount, 0);

  return [
    makeKpi({ key: 'sessoes_agendadas', label: 'Sessões Agendadas', description: 'Sessões marcadas para este mês', icon: 'event', value: agendadas, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'sessoes_executadas', label: 'Sessões Executadas', description: 'Sessões realizadas com sucesso', icon: 'photo_camera', value: executadas, previousValue: prevExecutadas, unit: 'count', isManual: false, chartType: 'none', threshold: thr('sessoes_executadas') }),
    makeKpi({ key: 'taxa_execucao', label: 'Taxa de Execução', description: 'Percentagem de sessões agendadas realizadas', icon: 'percent', value: taxaExecucao, previousValue: prevTaxa, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('taxa_execucao') }),
    makeKpi({ key: 'receita_individual', label: 'Receita Individual Gerada', description: '50% do valor das sessões executadas', icon: 'payments', value: receitaIndividual, unit: 'mt', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'xp_total', label: 'XP Acumulado', description: 'Total de XP ganho desde o início', icon: 'stars', value: totalXp, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
  ];
};

const calcPromoter = async (
  userId: string,
  thresholds: KpiThreshold[],
  manualValues: ManualKpiEntry[]
): Promise<KpiResult[]> => {
  const thr = (key: string) => thresholds.find(t => t.kpi_key === key);
  const curMY = monthYear();

  const [leadsRes, prevLeadsRes, allLeadsRes] = await Promise.all([
    supabase.from('clients').select('id, status, created_at, updated_at, responsible_id').eq('responsible_id', userId).gte('created_at', monthStart()),
    supabase.from('clients').select('id, status').eq('responsible_id', userId).gte('created_at', prevMonthStart()).lte('created_at', prevMonthEnd()),
    supabase.from('clients').select('id, status').eq('responsible_id', userId),
  ]);

  const leads = leadsRes.data || [];
  const prevLeads = prevLeadsRes.data || [];
  const allLeads = allLeadsRes.data || [];

  const contactados = leads.filter(l => l.status !== 'Novo Lead').length;
  const qualificados = leads.filter(l => ['Proposta Enviada', 'Consultoria Marcada', 'Convertido'].includes(l.status)).length;
  const taxaQualificacao = contactados > 0 ? (qualificados / contactados) * 100 : 0;

  const reunioes = leads.filter(l => l.status === 'Consultoria Marcada' || l.status === 'Convertido').length;
  const convertidos = leads.filter(l => l.status === 'Convertido').length;
  const totalLeads = allLeads.length;
  const taxaConversao = totalLeads > 0 ? (allLeads.filter(l => l.status === 'Convertido').length / totalLeads) * 100 : 0;

  const prevContactados = prevLeads.filter(l => l.status !== 'Novo Lead').length;
  const prevQualificados = prevLeads.filter(l => ['Proposta Enviada', 'Consultoria Marcada', 'Convertido'].includes(l.status)).length;
  const prevTaxaQual = prevContactados > 0 ? (prevQualificados / prevContactados) * 100 : undefined;

  const perdidos = leads.filter(l => l.status === 'Perdido').length;

  // Follow-ups (from kpi_manual_values)
  const followupsManual = manualValues.find(m => m.kpi_key === 'followups_realizados' && m.month_year === curMY);
  const followupsTaxa = manualValues.find(m => m.kpi_key === 'taxa_comparecimento' && m.month_year === curMY);

  // Pipeline value - estimado manual
  const pipelineManual = manualValues.find(m => m.kpi_key === 'pipeline_gerado' && m.month_year === curMY);

  return [
    makeKpi({ key: 'leads_contactados', label: 'Leads Contactados', description: 'Leads que saíram do estado "Novo Lead"', icon: 'contacts', value: contactados, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'leads_qualificados', label: 'Leads Qualificados', description: 'Leads que avançaram para Proposta ou além', icon: 'verified', value: qualificados, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'taxa_qualificacao', label: 'Taxa de Qualificação', description: 'Leads qualificados vs contactados', icon: 'filter_list', value: taxaQualificacao, previousValue: prevTaxaQual, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('taxa_qualificacao') }),
    makeKpi({ key: 'reunioes_agendadas', label: 'Reuniões Agendadas', description: 'Leads que atingiram "Consultoria Marcada"', icon: 'event_available', value: reunioes, unit: 'count', isManual: false, chartType: 'none', threshold: thr('reunioes_agendadas') }),
    makeKpi({ key: 'taxa_conversao', label: 'Taxa de Conversão', description: 'Leads convertidos vs total histórico', icon: 'conversion_path', value: taxaConversao, unit: 'percent', isManual: false, chartType: 'none', threshold: thr('taxa_conversao') }),
    makeKpi({ key: 'clientes_convertidos', label: 'Convertidos no Mês', description: 'Leads convertidos em clientes este mês', icon: 'handshake', value: convertidos, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'leads_perdidos', label: 'Leads Perdidos', description: 'Leads marcados como perdidos no mês', icon: 'person_remove', value: perdidos, unit: 'count', isManual: false, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'followups_realizados', label: 'Follow-ups Realizados', description: 'Número de follow-ups feitos no mês (manual)', icon: 'phone_callback', value: followupsManual?.value ?? 0, unit: 'count', isManual: true, chartType: 'none', threshold: thr('followups_realizados') }),
    makeKpi({ key: 'taxa_comparecimento', label: 'Taxa de Comparecimento', description: 'Clientes que compareceram às consultorias (manual)', icon: 'how_to_reg', value: followupsTaxa?.value ?? 0, unit: 'percent', isManual: true, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'pipeline_gerado', label: 'Pipeline Gerado (MT)', description: 'Valor estimado de todos os leads ativos (manual)', icon: 'waterfall_chart', value: pipelineManual?.value ?? 0, unit: 'mt', isManual: true, chartType: 'none', threshold: undefined }),
    makeKpi({ key: 'funil_leads', label: 'Funil de Leads', description: 'Distribuição de leads por estado', icon: 'filter_alt', value: leads.length, unit: 'count', isManual: false, chartType: 'pie', chartData: [
      { name: 'Novo Lead', value: leads.filter(l => l.status === 'Novo Lead').length, color: '#6366f1' },
      { name: 'Em Contacto', value: leads.filter(l => l.status === 'Em Contacto').length, color: '#3b82f6' },
      { name: 'Proposta', value: leads.filter(l => l.status === 'Proposta Enviada').length, color: '#f59e0b' },
      { name: 'Consultoria', value: leads.filter(l => l.status === 'Consultoria Marcada').length, color: '#8b5cf6' },
      { name: 'Convertido', value: leads.filter(l => l.status === 'Convertido').length, color: '#10b981' },
      { name: 'Perdido', value: perdidos, color: '#ef4444' },
    ], threshold: undefined }),
  ];
};

// ─── Main Hook ────────────────────────────────────────────────────────────────

export const useKpis = (userId: string, userRole: UserRole) => {
  const [kpis, setKpis] = useState<KpiResult[]>([]);
  const [thresholds, setThresholds] = useState<KpiThreshold[]>([]);
  const [manualValues, setManualValues] = useState<ManualKpiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThresholds = useCallback(async () => {
    const { data } = await supabase.from('kpi_thresholds').select('*').eq('role', userRole);
    setThresholds((data as KpiThreshold[]) || []);
  }, [userRole]);

  const fetchManualValues = useCallback(async () => {
    const { data } = await supabase.from('kpi_manual_values').select('*').eq('user_id', userId);
    setManualValues((data as ManualKpiEntry[]) || []);
  }, [userId]);

  const calculateKpis = useCallback(async () => {
    if (!userId || !userRole) return;
    setLoading(true);
    setError(null);
    try {
      let results: KpiResult[] = [];
      switch (userRole) {
        case 'Gestor de Projetos': results = await calcGestorProjetos(userId, thresholds, manualValues); break;
        case 'Gestor Técnico': results = await calcGestorTecnico(userId, thresholds, manualValues); break;
        case 'Gestor de Trading': results = await calcGestorTrading(userId, thresholds, manualValues); break;
        case 'Fotógrafo': results = await calcFotografo(userId, thresholds, manualValues); break;
        case 'Promoter de Venda': results = await calcPromoter(userId, thresholds, manualValues); break;
        default: results = [];
      }
      setKpis(results);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar KPIs');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, thresholds, manualValues]);

  useEffect(() => {
    fetchThresholds();
    fetchManualValues();
  }, [fetchThresholds, fetchManualValues]);

  useEffect(() => {
    calculateKpis();
  }, [calculateKpis]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase.channel('kpi_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, calculateKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, calculateKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, calculateKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photo_sessions' }, calculateKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trading_trades' }, calculateKpis)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kpi_manual_values' }, fetchManualValues)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [calculateKpis, fetchManualValues]);

  const updateManualKpi = async (kpiKey: string, value: number, notes?: string): Promise<boolean> => {
    const curMY = monthYear();
    const { error } = await supabase.from('kpi_manual_values').upsert(
      { user_id: userId, kpi_key: kpiKey, value, month_year: curMY, notes, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,kpi_key,month_year' }
    );
    if (!error) { await fetchManualValues(); }
    return !error;
  };

  const updateThreshold = async (kpiKey: string, goodThreshold: number, warningThreshold: number): Promise<{ success: boolean; message?: string }> => {
    const curMY = monthYear();
    const existing = thresholds.find(t => t.kpi_key === kpiKey);
    if (existing?.last_edit_month === curMY) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { success: false, message: `Já editaste este KPI este mês. Poderás editar novamente em ${nextMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.` };
    }
    const { error } = await supabase.from('kpi_thresholds').upsert(
      { role: userRole, kpi_key: kpiKey, good_threshold: goodThreshold, warning_threshold: warningThreshold, updated_by: userId, last_edit_month: curMY, updated_at: new Date().toISOString() },
      { onConflict: 'role,kpi_key' }
    );
    if (!error) { await fetchThresholds(); }
    return { success: !error };
  };

  return { kpis, thresholds, manualValues, loading, error, refetch: calculateKpis, updateManualKpi, updateThreshold };
};
