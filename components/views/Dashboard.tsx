import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useTasks } from '../../src/hooks/useTasks';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useClients } from '../../src/hooks/useClients';
import { useTeam } from '../../src/hooks/useTeam';
import { usePhotoSessions } from '../../src/hooks/usePhotoSessions';
import { useTrading } from '../../src/hooks/useTrading';
import { useProjects } from '../../src/hooks/useProjects';
import { useGamification } from '../../src/hooks/useGamification';
import { User } from '../../types';

interface DashboardProps {
  currentUser: User;
}

const COLORS = ['#0056b3', '#078836', '#eab308', '#cf4444', '#6366f1'];

export const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  // Hook Data
  const { tasks, loading: tasksLoading } = useTasks();
  const { transactions, loading: transLoading } = useTransactions();
  const { clients, loading: clientsLoading } = useClients();
  const { team, loading: teamLoading } = useTeam();
  const { sessions, loading: sessionsLoading } = usePhotoSessions();
  const { trades, metrics: tradingMetrics, loading: tradingLoading } = useTrading();
  const { projects, loading: projectsLoading } = useProjects();
  const { teamGoals, xpHistory, loading: gamificationLoading } = useGamification();

  const loading = tasksLoading || transLoading || clientsLoading || teamLoading || sessionsLoading || tradingLoading || projectsLoading || gamificationLoading;

  // dynamic greeting based on hour
  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return 'Bom dia';
    if (hr >= 12 && hr < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // 1. GESTOR DE PROJETOS metrics & dashboard
  const gpStats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'Ativo').length;
    const completedTasks = tasks.filter(t => t.status === 'Done').length;
    const totalTasks = tasks.length;
    const xpEfficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Revenue vs Expenses in MT
    const revenue = transactions.filter(t => t.type === 'income' && t.status === 'Recebido').reduce((sum, t) => sum + t.val, 0);
    const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'Pago').reduce((sum, t) => sum + t.val, 0);
    const profit = revenue - expenses;

    // Check for team members with low KPIs (< 60% quality or speed score)
    const lowPerformanceAlerts = team.filter(m => 
      m.metrics.kpis.some(k => k.score < 60)
    ).map(m => {
      const lowKpis = m.metrics.kpis.filter(k => k.score < 60).map(k => `${k.name} (${k.score}%)`);
      return `${m.name}: Baixo desempenho em ${lowKpis.join(', ')}`;
    });

    const conversionRate = clients.length > 0 ? ((clients.filter(c => c.status === 'Convertido').length / clients.length) * 100).toFixed(1) : '0.0';

    return { activeProjects, xpEfficiency, revenue, expenses, profit, lowPerformanceAlerts, conversionRate };
  }, [projects, tasks, transactions, team, clients]);

  // 2. GESTOR TÉCNICO metrics
  const gtStats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'Ativo').length;
    const totalStages = projects.reduce((sum, p) => sum + (p.stages?.length || 0), 0);
    const completedStages = projects.reduce((sum, p) => sum + (p.stages?.filter(s => s.status === 'Concluido').length || 0), 0);
    const stagesProgress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
    
    // Internal vs External
    const internalCount = projects.filter(p => p.type === 'interno').length;
    const externalCount = projects.filter(p => p.type === 'externo').length;

    return { activeProjects, totalStages, completedStages, stagesProgress, internalCount, externalCount };
  }, [projects]);

  // 3. FOTÓGRAFO metrics
  const photographerStats = useMemo(() => {
    const mySessions = sessions.filter(s => s.photographer_id === currentUser.id);
    const scheduled = mySessions.filter(s => s.status === 'Agendada').length;
    const executed = mySessions.filter(s => s.status === 'Executada').length;
    
    // Revenue split: 50% for photographer, 50% for company
    const individualRevenue = mySessions.filter(s => s.status === 'Executada').reduce((sum, s) => sum + (s.price_mt * 0.5), 0);
    const companyRevenue = mySessions.filter(s => s.status === 'Executada').reduce((sum, s) => sum + (s.price_mt * 0.5), 0);

    return { scheduled, executed, individualRevenue, companyRevenue, list: mySessions.filter(s => s.status === 'Agendada').slice(0, 3) };
  }, [sessions, currentUser.id]);

  // 4. PROMOTER DE VENDA (SDR) metrics
  const sdrStats = useMemo(() => {
    const myLeads = clients.filter(c => c.responsible === currentUser.name || !c.responsible);
    const totalLeads = myLeads.length;
    const converted = myLeads.filter(c => c.status === 'Convertido').length;
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0.0';
    
    // Pipeline value in MT (sum of businessValue of SDR's leads)
    const pipelineValue = myLeads.reduce((sum, c) => sum + (c.businessValue || 0), 0);

    const provenanceMap: Record<string, number> = {};
    myLeads.forEach(c => {
      provenanceMap[c.provenance] = (provenanceMap[c.provenance] || 0) + 1;
    });

    const provenanceChart = Object.entries(provenanceMap).map(([name, value]) => ({ name, value }));

    return { totalLeads, converted, conversionRate, pipelineValue, provenanceChart };
  }, [clients, currentUser.name]);

  // 5. COLABORADOR / DEFAULT metrics
  const defaultStats = useMemo(() => {
    const myTasks = tasks.filter(t => t.responsible_id === currentUser.id);
    const total = myTasks.length;
    const completed = myTasks.filter(t => t.status === 'Done').length;
    const pending = total - completed;

    // Get level & XP from team hook or compute
    const memberObj = team.find(m => m.id === currentUser.id);
    const level = memberObj?.level ?? 1;
    const xp = memberObj?.xp ?? 0;
    const badges = memberObj?.badges ?? ['Colaborador'];
    const kpis = memberObj?.metrics.kpis ?? [];

    return { total, completed, pending, level, xp, badges, kpis, myTasks: myTasks.filter(t => t.status !== 'Done').slice(0, 3) };
  }, [tasks, currentUser.id, team]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-24 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
          <div className="h-24 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
          <div className="h-24 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
          <div className="h-24 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* 1. Dynamic Welcome Greeting Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-primary-dark text-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-primary/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black">{getGreeting()}, {currentUser.name}!</h1>
            <p className="text-xs lg:text-sm text-white/80 mt-1 font-medium">Bem-vindo ao seu painel de controle. Tens a função de <span className="font-bold uppercase tracking-wider text-white bg-white/20 px-2 py-0.5 rounded">{currentUser.role}</span>.</p>
          </div>
          {['Gestor de Projetos', 'Colaborador'].includes(currentUser.role) && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20">
              <span className="material-symbols-outlined text-amber-300 filled animate-bounce">emoji_events</span>
              <div>
                <p className="text-[10px] text-white/60 font-black uppercase leading-none">Meta Mensal</p>
                <p className="text-sm font-black mt-0.5">
                  {teamGoals.find(g => g.month === currentMonthStr)?.target_xp 
                    ? `${teamGoals.find(g => g.month === currentMonthStr)?.target_xp} XP Target` 
                    : (currentUser.role === 'Gestor de Projetos' ? 'Configura a Meta!' : 'Meta não definida')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. ROLE-SPECIFIC VIEWS */}

      {/* A. GESTOR DE PROJETOS DASHBOARD */}
      {currentUser.role === 'Gestor de Projetos' && (
        <div className="flex flex-col gap-6">
          {/* Alerta de Colaboradores com baixos KPIs */}
          {gpStats.lowPerformanceAlerts.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex gap-3 items-start">
              <span className="material-symbols-outlined text-red-500 mt-0.5">warning</span>
              <div>
                <p className="text-sm font-bold text-red-800 dark:text-red-300">Alerta de Desempenho da Equipa</p>
                <div className="mt-1 space-y-1">
                  {gpStats.lowPerformanceAlerts.map((alertText, idx) => (
                    <p key={idx} className="text-xs text-red-700 dark:text-red-400">{alertText}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Projetos Ativos</p>
              <p className="text-2xl font-black text-primary mt-1">{gpStats.activeProjects}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Eficiência de XP</p>
              <p className="text-2xl font-black text-amber-500 mt-1">{gpStats.xpEfficiency}%</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Rentabilidade Líquida</p>
              <p className={`text-2xl font-black mt-1 ${gpStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>MT {gpStats.profit.toLocaleString('pt-MZ')}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Taxa Conversão Leads</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{gpStats.conversionRate}%</p>
            </div>
          </div>

          {/* Finance details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-sub mb-4">Fluxo de Caixa Mensal</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Entradas', valor: gpStats.revenue },
                    { name: 'Saídas', valor: gpStats.expenses }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="valor" fill="#0056b3" stroke="#0056b3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-text-sub mb-4 font-bold">Resumo Financeiro</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-xs text-text-sub">Total Faturado:</span>
                    <span className="text-xs font-black text-green-600">MT {gpStats.revenue.toLocaleString('pt-MZ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-text-sub">Total Despesas:</span>
                    <span className="text-xs font-black text-red-600">MT {gpStats.expenses.toLocaleString('pt-MZ')}</span>
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-zinc-800"></div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold">Saldo:</span>
                    <span className={`text-xs font-black ${gpStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>MT {gpStats.profit.toLocaleString('pt-MZ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B. GESTOR TÉCNICO DASHBOARD */}
      {currentUser.role === 'Gestor Técnico' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Projetos Ativos</p>
              <p className="text-2xl font-black text-primary mt-1">{gtStats.activeProjects}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Total Etapas</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{gtStats.totalStages}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Etapas Concluídas</p>
              <p className="text-2xl font-black text-green-600 mt-1">{gtStats.completedStages}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Conclusão de Etapas</p>
              <p className="text-2xl font-black text-amber-500 mt-1">{gtStats.stagesProgress}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-sub mb-4">Classificação de Projetos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Internos', value: gtStats.internalCount },
                      { name: 'Externos', value: gtStats.externalCount }
                    ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                      <Cell fill="#0056b3" />
                      <Cell fill="#6366f1" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 justify-center text-xs">
                <div className="flex items-center gap-1"><span className="size-3 bg-primary rounded-sm"></span> Internos ({gtStats.internalCount})</div>
                <div className="flex items-center gap-1"><span className="size-3 bg-indigo-500 rounded-sm"></span> Externos ({gtStats.externalCount})</div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Etapas Recentes</h3>
              <div className="space-y-3">
                {projects.flatMap(p => (p.stages || []).map(s => ({ ...s, projName: p.name }))).slice(0, 4).map((stage, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-xl">
                    <div>
                      <p className="text-xs font-black">{stage.name}</p>
                      <p className="text-[10px] text-text-sub">{stage.projName}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${stage.status === 'Concluido' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {stage.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C. GESTOR DE TRADING DASHBOARD */}
      {currentUser.role === 'Gestor de Trading' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Win Rate</p>
              <p className="text-2xl font-black text-green-600 mt-1">{tradingMetrics.winRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Profit Factor</p>
              <p className="text-2xl font-black text-primary mt-1">{isFinite(tradingMetrics.profitFactor) ? tradingMetrics.profitFactor.toFixed(2) : 'N/A'}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Expectância (USD)</p>
              <p className="text-2xl font-black text-amber-500 mt-1">${tradingMetrics.expectancy.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Disciplina</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{tradingMetrics.disciplineRate.toFixed(0)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-sub mb-4">Distribuição de Resultados</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Vitórias', valor: tradingMetrics.winners, fill: '#078836' },
                    { name: 'Derrotas', valor: tradingMetrics.losers, fill: '#cf4444' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#078836" radius={[4, 4, 0, 0]} barSize={40}>
                      <Cell fill="#078836" />
                      <Cell fill="#cf4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Histórico Recente</h3>
              <div className="space-y-3">
                {trades.slice(0, 4).map((trade) => (
                  <div key={trade.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-xl">
                    <div>
                      <p className="text-xs font-black">{trade.asset}</p>
                      <p className="text-[10px] text-text-sub">Lote: {trade.lot} · SL: ${trade.stop_loss_usd} · TP: ${trade.take_profit_usd}</p>
                    </div>
                    {trade.realized_usd !== undefined && (
                      <span className={`text-xs font-black ${trade.result === 'positivo' ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.result === 'positivo' ? '+' : '-'}${Math.abs(trade.realized_usd).toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. FOTÓGRAFO DASHBOARD */}
      {currentUser.role === 'Fotógrafo' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Sessões Agendadas</p>
              <p className="text-2xl font-black text-primary mt-1">{photographerStats.scheduled}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Sessões Executadas</p>
              <p className="text-2xl font-black text-green-600 mt-1">{photographerStats.executed}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Os Meus Ganhos (50%)</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">MT {photographerStats.individualRevenue.toLocaleString('pt-MZ')}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Empresa (50%)</p>
              <p className="text-2xl font-black text-purple-600 mt-1">MT {photographerStats.companyRevenue.toLocaleString('pt-MZ')}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Agenda em Destaque (Próximas Sessões)</h3>
            {photographerStats.list.length === 0 ? (
              <p className="text-xs text-text-sub text-center py-6">Nenhuma sessão agendada.</p>
            ) : (
              <div className="space-y-3">
                {photographerStats.list.map((session) => (
                  <div key={session.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl">
                    <div>
                      <p className="text-xs font-black">{session.service_type}</p>
                      <p className="text-[10px] text-text-sub">{session.client_name} · {session.date} às {session.time}</p>
                    </div>
                    <span className="text-xs font-black text-primary">MT {session.price_mt.toLocaleString('pt-MZ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* E. PROMOTER DE VENDA (SDR) DASHBOARD */}
      {currentUser.role === 'Promotor de Venda' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Leads Totais</p>
              <p className="text-2xl font-black text-primary mt-1">{sdrStats.totalLeads}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Convertidos</p>
              <p className="text-2xl font-black text-green-600 mt-1">{sdrStats.converted}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Taxa de Conversão</p>
              <p className="text-2xl font-black text-amber-500 mt-1">{sdrStats.conversionRate}%</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Valor do Pipeline</p>
              <p className="text-2xl font-black text-purple-600 mt-1">MT {sdrStats.pipelineValue.toLocaleString('pt-MZ')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-sub mb-4">Leads por Canal de Origem</h3>
              {sdrStats.provenanceChart.length === 0 ? (
                <p className="text-xs text-text-sub text-center py-10">Sem leads cadastrados.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sdrStats.provenanceChart} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {sdrStats.provenanceChart.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Próximos Acompanhamentos (Follow-ups)</h3>
              <div className="space-y-3">
                {clients.filter(c => {
                  if (!c.nextFollowUpDate) return false;
                  const followDate = new Date(c.nextFollowUpDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return followDate >= today;
                }).sort((a, b) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime()).slice(0, 4).map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-xl">
                    <div>
                      <p className="text-xs font-black">{c.name}</p>
                      <p className="text-[10px] text-text-sub">{c.companyName || 'Sem Empresa'} · Tel: {c.phone || '—'}</p>
                    </div>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                      {new Date(c.nextFollowUpDate!).toLocaleDateString('pt-MZ')}
                    </span>
                  </div>
                ))}
                {clients.filter(c => {
                  if (!c.nextFollowUpDate) return false;
                  const today = new Date(); today.setHours(0,0,0,0);
                  return new Date(c.nextFollowUpDate) >= today;
                }).length === 0 && (
                  <p className="text-xs text-text-sub italic">Nenhum follow-up agendado para os próximos dias.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* F. COLABORADOR / DEFAULT DASHBOARD */}
      {currentUser.role === 'Colaborador' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Total de Tarefas</p>
              <p className="text-2xl font-black text-primary mt-1">{defaultStats.total}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Concluídas</p>
              <p className="text-2xl font-black text-green-600 mt-1">{defaultStats.completed}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Pendentes</p>
              <p className="text-2xl font-black text-amber-500 mt-1">{defaultStats.pending}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Nível / XP</p>
              <p className="text-2xl font-black text-purple-600 mt-1">Lvl {defaultStats.level} ({defaultStats.xp} XP)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">As Minhas Tarefas Pendentes</h3>
              {defaultStats.myTasks.length === 0 ? (
                <p className="text-xs text-text-sub text-center py-6">Parabéns! Não tens nenhuma tarefa pendente.</p>
              ) : (
                <div className="space-y-3">
                  {defaultStats.myTasks.map((t) => (
                    <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-xl">
                      <div>
                        <p className="text-xs font-black">{t.title}</p>
                        <p className="text-[10px] text-text-sub">Prioridade: <span className="font-bold text-red-500">{t.priority}</span> · Prazo: {new Date(t.dueDate).toLocaleDateString('pt-MZ')}</p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Os Meus KPIs de Desempenho</h3>
              {defaultStats.kpis.length === 0 ? (
                <p className="text-xs text-text-sub text-center py-6">Nenhum KPI alocado ainda.</p>
              ) : (
                <div className="space-y-4">
                  {defaultStats.kpis.map(kpi => (
                    <div key={kpi.name}>
                      <div className="flex justify-between text-xs mb-1 uppercase font-bold text-text-sub">
                        <span>{kpi.name}</span>
                        <span className="text-primary font-black">{kpi.score}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${kpi.score}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
