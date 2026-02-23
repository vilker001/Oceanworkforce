
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { getProjectInsights } from '../../services/geminiService';
import { useTasks } from '../../src/hooks/useTasks';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useClients } from '../../src/hooks/useClients';

const COLORS = ['#0056b3', '#078836', '#eab308', '#cf4444', '#6366f1'];

// Mock Data for Tabs
const productivityData = [
  { name: 'Seg', concluidas: 12, pendentes: 4 },
  { name: 'Ter', concluidas: 18, pendentes: 2 },
  { name: 'Qua', concluidas: 15, pendentes: 6 },
  { name: 'Qui', concluidas: 22, pendentes: 3 },
  { name: 'Sex', concluidas: 20, pendentes: 5 },
];

const salesFunnelData = [
  { name: 'Novo Lead', value: 45, fill: '#64748b' },
  { name: 'Contacto', value: 32, fill: '#3b82f6' },
  { name: 'Proposta', value: 18, fill: '#6366f1' },
  { name: 'Consultoria', value: 12, fill: '#a855f7' },
  { name: 'Cliente', value: 8, fill: '#22c55e' },
];

const financeData = [
  { name: 'Jan', receita: 450000, despesa: 320000 },
  { name: 'Fev', receita: 520000, despesa: 310000 },
  { name: 'Mar', receita: 480000, despesa: 340000 },
  { name: 'Abr', receita: 610000, despesa: 380000 },
];

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'productivity' | 'finance' | 'pipeline'>('productivity');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Hooks for Real Data
  const { tasks } = useTasks();
  const { transactions } = useTransactions();
  const { clients } = useClients();

  // 1. Calculate Productivity KPIs
  const productivityStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Done').length;
    const pending = total - completed;
    const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Group by day for chart (Last 5 days)
    const chartData = [];
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];

      const tasksOnDay = tasks.filter(t => t.endDate?.startsWith(dateStr) || t.startDate?.startsWith(dateStr));
      const done = tasksOnDay.filter(t => t.status === 'Done').length;

      chartData.push({
        name: dayName,
        concluidas: done,
        pendentes: tasksOnDay.length - done
      });
    }

    return { total, completed, efficiency, chartData };
  }, [tasks]);

  // 2. Calculate Finance KPIs
  const financeStats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income' && t.status === 'Recebido').reduce((acc, t) => acc + t.val, 0);
    const expense = transactions.filter(t => t.type === 'expense' && t.status === 'Pago').reduce((acc, t) => acc + t.val, 0);
    const margin = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

    // Mock monthly data based on current totals (spread over 4 months for demo feel if only 1 month data exists)
    // In production this would group by actual transaction dates
    const chartData = [
      { name: 'Out', receita: income * 0.7, despesa: expense * 0.8 },
      { name: 'Nov', receita: income * 0.8, despesa: expense * 0.7 },
      { name: 'Dez', receita: income * 0.5, despesa: expense * 0.6 },
      { name: 'Jan', receita: income, despesa: expense },
    ];

    return { income, expense, margin, chartData };
  }, [transactions]);

  // 3. Calculate Pipeline KPIs
  const pipelineStats = useMemo(() => {
    const total = clients.length;
    const converted = clients.filter(c => c.status === 'Convertido').length;
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0';
    const openValue = 0; // If clients had value field, sum it here

    const funnelMap: Record<string, number> = {};
    clients.forEach(c => {
      funnelMap[c.status] = (funnelMap[c.status] || 0) + 1;
    });

    const chartData = [
      { name: 'Novo Lead', value: funnelMap['Novo Lead'] || 0, fill: '#64748b' },
      { name: 'Contacto', value: funnelMap['Em Contacto'] || 0, fill: '#3b82f6' },
      { name: 'Proposta', value: funnelMap['Proposta Enviada'] || 0, fill: '#6366f1' },
      { name: 'Consultoria', value: funnelMap['Consultoria Marcada'] || 0, fill: '#a855f7' },
      { name: 'Cliente', value: funnelMap['Convertido'] || 0, fill: '#22c55e' },
    ].filter(item => item.value > 0); // Only show active stages

    return { total, conversionRate, openValue, chartData };
  }, [clients]);


  const fetchInsights = async () => {
    setLoadingAi(true);
    const context = activeTab === 'productivity' ? 'produtividade da equipe e tarefas' :
      activeTab === 'finance' ? 'saúde financeira e margens' : 'pipeline de vendas e conversão';
    const insight = await getProjectInsights({ tab: activeTab, context });
    setAiInsight(insight);
    setLoadingAi(false);
  };

  useEffect(() => {
    fetchInsights();
  }, [activeTab]);

  const renderKPIs = () => {
    switch (activeTab) {
      case 'productivity':
        return [
          { label: 'Eficiência Global', value: `${productivityStats.efficiency}%`, trend: '+4%', icon: 'bolt', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Tarefas Concluídas', value: productivityStats.completed.toString(), trend: '+12', icon: 'task_alt', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Tarefas Totais', value: productivityStats.total.toString(), trend: 'Estável', icon: 'list', color: 'text-primary', bg: 'bg-primary-light' },
          { label: 'Membros Ativos', value: 'N/A', trend: 'Estável', icon: 'group', color: 'text-purple-600', bg: 'bg-purple-50' },
        ];
      case 'finance':
        return [
          { label: 'Receita Bruta', value: `MT ${(financeStats.income / 1000).toFixed(1)}k`, trend: '+15%', icon: 'payments', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Despesas', value: `MT ${(financeStats.expense / 1000).toFixed(1)}k`, trend: '-5%', icon: 'trending_down', color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Margem Líquida', value: `${financeStats.margin}%`, trend: '+2%', icon: 'pie_chart', color: 'text-amber-600', bg: 'bg-amber-50' },
        ];
      case 'pipeline':
        return [
          { label: 'Leads Totais', value: pipelineStats.total.toString(), trend: '+12', icon: 'person_search', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Taxa de Conversão', value: `${pipelineStats.conversionRate}%`, trend: '+4%', icon: 'bolt', color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Novos Leads', value: (pipelineStats.chartData.find(d => d.name === 'Novo Lead')?.value || 0).toString(), trend: '+1', icon: 'fiber_new', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Ciclo de Venda', value: '14 dias', trend: '-2 dias', icon: 'reprography', color: 'text-orange-600', bg: 'bg-orange-50' },
        ];
    }
  };

  return (
    <div className="flex flex-col gap-6 lg:gap-8 pb-10">
      {/* Tab Navigation */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-100 dark:border-zinc-800/50 pb-4">
        <div className="flex overflow-x-auto w-full xl:w-auto no-scrollbar bg-gray-100/50 dark:bg-zinc-900/50 p-1 rounded-2xl">
          {[
            { id: 'productivity', label: 'Produtividade', icon: 'analytics' },
            { id: 'finance', label: 'Financeiro', icon: 'monetization_on' },
            { id: 'pipeline', label: 'Pipeline', icon: 'filter_alt' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 lg:px-6 py-2.5 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id
                ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm'
                : 'text-text-sub hover:text-text-main'
                }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-bold text-text-sub uppercase tracking-widest px-2">Sincronizado: Agora mesmo</p>
      </div>

      {/* Dynamic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {renderKPIs().map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/50 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 size-24 bg-current opacity-[0.03] -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-text-sub text-[10px] font-black uppercase tracking-widest">{kpi.label}</span>
              <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                <span className="material-symbols-outlined text-lg">{kpi.icon}</span>
              </div>
            </div>
            <h3 className="text-2xl lg:text-3xl font-black relative z-10">{kpi.value}</h3>
            <p className={`${kpi.color} text-[10px] font-black mt-1 uppercase relative z-10`}>
              {kpi.trend} <span className="text-text-sub font-medium ml-1">vs anterior</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Primary Chart Area */}
        <div className="xl:col-span-8 bg-white dark:bg-zinc-900 p-6 lg:p-8 rounded-3xl border border-gray-100 dark:border-zinc-800/50 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h4 className="font-black text-xs uppercase tracking-widest text-text-sub flex items-center gap-2">
                <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                Análise Evolutiva
              </h4>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="size-2.5 bg-primary rounded-sm"></span>
                <span className="text-[10px] font-bold text-text-sub uppercase">Atual</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2.5 bg-gray-300 dark:bg-zinc-700 rounded-sm"></span>
                <span className="text-[10px] font-bold text-text-sub uppercase">Projetado</span>
              </div>
            </div>
          </div>

          <div className="h-64 lg:h-80 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'productivity' ? (
                <BarChart data={productivityStats.chartData}>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} strokeOpacity={0.1} stroke="#94a3b8" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dx={-10} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', opacity: 0.4 }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Bar dataKey="concluidas" fill="#0056b3" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="pendentes" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              ) : activeTab === 'finance' ? (
                <AreaChart data={financeStats.chartData}>
                  <defs>
                    <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#078836" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#078836" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" vertical={false} strokeOpacity={0.1} stroke="#94a3b8" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={10} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="receita" stroke="#078836" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
                  <Area type="monotone" dataKey="despesa" stroke="#cf4444" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              ) : (
                <BarChart data={pipelineStats.chartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="6 6" horizontal={true} vertical={false} strokeOpacity={0.1} stroke="#94a3b8" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} fontSize={9} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {pipelineStats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side AI Context Panel */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-primary text-white p-6 lg:p-8 rounded-3xl shadow-xl shadow-primary/20 flex flex-col justify-between relative overflow-hidden min-h-[320px]">
            <div className="absolute -top-10 -right-10 size-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined filled text-xl">psychology</span>
                <h4 className="font-black uppercase tracking-widest text-[10px]">IA Predictor Insight</h4>
              </div>

              {loadingAi ? (
                <div className="space-y-4">
                  <div className="h-3 bg-white/20 rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-white/20 rounded w-[90%] animate-pulse delay-75"></div>
                  <div className="h-3 bg-white/20 rounded w-[70%] animate-pulse delay-150"></div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <p className="text-sm lg:text-base leading-relaxed text-white/90 italic font-medium">
                    "{aiInsight || "Processando análise de tendência..."}"
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Confiabilidade: 94.2%</p>
                </div>
              )}
            </div>

            <button
              onClick={fetchInsights}
              disabled={loadingAi}
              className="mt-8 bg-white/10 hover:bg-white/20 disabled:opacity-50 border border-white/20 text-white font-black text-[10px] py-4 px-4 rounded-2xl transition-all uppercase tracking-widest relative z-10 flex items-center justify-center gap-2"
            >
              {loadingAi ? (
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-sm">refresh</span>
              )}
              Otimizar Visão
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800/50 shadow-sm flex-1">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-text-sub mb-6">Benchmarks do Setor</h4>
            <div className="space-y-6">
              <div className="flex items-center gap-4 group cursor-help">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-xl">stars</span>
                </div>
                <div>
                  <p className="text-xs font-black">Performance Elite</p>
                  <p className="text-[10px] text-text-sub font-medium leading-tight">Você superou 18% dos benchmarks globais de ROI este mês.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group cursor-help">
                <div className="size-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-xl">speed</span>
                </div>
                <div>
                  <p className="text-xs font-black">Velocidade de Execução</p>
                  <p className="text-[10px] text-text-sub font-medium leading-tight">O ciclo médio de tarefas está 14% mais rápido que o setorial.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

