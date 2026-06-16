import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../types';
import { useFinancialSettings } from '../../src/hooks/useFinancialSettings';
import { useSystemSettings } from '../../src/hooks/useSystemSettings';
import { useTrading } from '../../src/hooks/useTrading';

interface FinancialManagementProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdateStatus: (id: string, status: Transaction['status']) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  userRole?: string;
}

export const FinancialManagement: React.FC<FinancialManagementProps> = ({ transactions, onAddTransaction, onUpdateStatus, onDeleteTransaction, userRole }) => {
  if (userRole !== 'Gestor de Projetos') {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800">
        <span className="material-symbols-outlined text-6xl text-red-500">lock_person</span>
        <h2 className="text-2xl font-black italic">Acesso Restrito</h2>
        <p className="text-text-sub max-w-sm">Apenas o Gestor de Projetos tem permissão para visualizar e gerenciar o módulo financeiro.</p>
      </div>
    );
  }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [savingBalance, setSavingBalance] = useState(false);

  // Financial system and settings hooks
  const { settings: financialSettings, updateInitialBalance } = useFinancialSettings();
  const { fixedExpenses, totalFixedExpenses, breakevenSuggestion } = useSystemSettings();
  const { trades, metrics: tradingMetrics } = useTrading();

  // Form State
  const [formData, setFormData] = useState({
    desc: '',
    val: '',
    type: 'income' as Transaction['type'],
    cat: 'Pagamento de Cliente',
    date: new Date().toISOString().split('T')[0]
  });

  // Dynamic Categories based on Type
  const categories = useMemo(() => {
    switch (formData.type) {
      case 'income':
        return ['Pagamento de Cliente', 'Estúdio Fotográfico', 'Cobertura de Evento', 'Prestação de Serviços', 'Withdraw de Trading', 'Investimento de Sócio', 'Venda CRM', 'Outro'];
      case 'investment':
        return ['Software', 'Material de Escritório', 'Hardware', 'Marketing', 'Trading', 'Poupança de Equipamento'];
      case 'expense':
        return ['Infraestrutura', 'Fixos', 'Recursos Humanos', 'Marketing', 'Despesa de Trading', 'Outros'];
      default:
        return [];
    }
  }, [formData.type]);

  // Reset category when type changes to ensure it's always valid
  useEffect(() => {
    if (!categories.includes(formData.cat)) {
      setFormData(prev => ({ ...prev, cat: categories[0] }));
    }
  }, [formData.type, categories]);

  // Calculations
  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income' && t.status === 'Recebido').reduce((acc, t) => acc + t.val, 0);
    const expenses = transactions.filter(t => t.type === 'expense' && t.status === 'Pago').reduce((acc, t) => acc + t.val, 0);
    const investments = transactions.filter(t => t.type === 'investment' && t.status === 'Pago').reduce((acc, t) => acc + t.val, 0);
    const margin = income > 0 ? ((income - expenses) / income) * 100 : 0;
    const initialBalance = financialSettings?.initial_balance ?? 0;
    const currentBalance = initialBalance + income - expenses - investments;

    return { income, expenses, investments, margin, initialBalance, currentBalance };
  }, [transactions, financialSettings]);

  // Trading Fund control:
  // Base Investment (type = investment & cat = Trading)
  // Withdrawals (type = income & cat = Withdraw de Trading)
  // Closed trades profit/loss
  const tradingFundStats = useMemo(() => {
    const baseInvested = transactions
      .filter(t => t.type === 'investment' && t.cat === 'Trading' && t.status === 'Pago')
      .reduce((sum, t) => sum + t.val, 0);

    const baseWithdrawn = transactions
      .filter(t => t.type === 'income' && t.cat === 'Withdraw de Trading' && t.status === 'Recebido')
      .reduce((sum, t) => sum + t.val, 0);

    // Sum realized USD profit/loss converted to MT
    const realizedMt = trades
      .filter(t => t.result)
      .reduce((sum, t) => sum + ((t.realized_usd || 0) * t.exchange_rate), 0);

    const netFundMt = baseInvested - baseWithdrawn + realizedMt;
    
    // Convert current rate (default 68.33)
    const currentExchangeRate = trades[0]?.exchange_rate || 68.33;
    const netFundUsd = netFundMt / currentExchangeRate;

    return { baseInvested, baseWithdrawn, realizedMt, netFundMt, netFundUsd };
  }, [transactions, trades]);

  // Savings / Equipment fund:
  // type = investment & cat = Poupança de Equipamento / Hardware / Software
  const savingsFundStats = useMemo(() => {
    const equipmentSavings = transactions
      .filter(t => t.status === 'Pago' && (t.cat === 'Poupança de Equipamento' || t.cat === 'Hardware'))
      .reduce((sum, t) => sum + t.val, 0);
    return { equipmentSavings };
  }, [transactions]);

  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTransaction: Omit<Transaction, 'id'> = {
      desc: formData.desc,
      date: formData.date,
      cat: formData.cat,
      val: parseFloat(formData.val),
      type: formData.type,
      status: formData.type === 'income' ? 'Recebido' : 'Pago'
    };

    try {
      await onAddTransaction(newTransaction);
      setIsModalOpen(false);
      setFormData({
        desc: '',
        val: '',
        type: 'income',
        cat: 'Pagamento de Cliente',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      alert('Erro ao salvar transação. Tente novamente.');
    }
  };

  const handleSaveBalance = async () => {
    const val = parseFloat(newBalanceInput);
    if (isNaN(val)) return alert('Por favor, insira um valor válido.');
    setSavingBalance(true);
    try {
      await updateInitialBalance(val);
      setIsBalanceModalOpen(false);
      setNewBalanceInput('');
    } catch {
      alert('Erro ao guardar saldo. Tente novamente.');
    } finally {
      setSavingBalance(false);
    }
  };

  const chartData = [
    { name: 'Semana 1', entrada: totals.income * 0.2, saida: (totals.expenses + totals.investments) * 0.3 },
    { name: 'Semana 2', entrada: totals.income * 0.3, saida: (totals.expenses + totals.investments) * 0.2 },
    { name: 'Semana 3', entrada: totals.income * 0.1, saida: (totals.expenses + totals.investments) * 0.4 },
    { name: 'Semana 4', entrada: totals.income * 0.4, saida: (totals.expenses + totals.investments) * 0.1 },
  ];

  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Valor (MT)', 'Tipo', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        t.date,
        `"${t.desc.replace(/"/g, '""')}"`,
        `"${t.cat}"`,
        t.val.toFixed(2),
        t.type === 'income' ? 'Entrada' : t.type === 'expense' ? 'Saída' : 'Investimento',
        t.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black">Gestão Financeira</h2>
          <p className="text-text-sub text-sm">Controle refinado de caixas, despesas operacionais e fundos de investimento.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportToCSV}
            className="bg-white dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span> Exportar CSV
          </button>
          <button
            onClick={() => { setNewBalanceInput(totals.initialBalance.toString()); setIsBalanceModalOpen(true); }}
            className="bg-white dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <span className="material-symbols-outlined text-base">account_balance_wallet</span> Definir Saldo Inicial
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/10"
          >
            <span className="material-symbols-outlined text-base">add</span> Lançamento Manual
          </button>
        </div>
      </div>

      {/* Breakeven automatic warning alert */}
      {totalFixedExpenses > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 items-start">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5 animate-pulse">info</span>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Ponto de Equilíbrio Corporativo (Breakeven)</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Para crescer, a empresa deve faturar pelo menos <strong>MT {breakevenSuggestion.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}</strong> este mês. 
              (MT {totalFixedExpenses.toLocaleString()} em despesas fixas recorrentes × 1.3 margem recomendada).
            </p>
          </div>
        </div>
      )}

      {/* Saldo Principal */}
      <div
        onClick={() => { setNewBalanceInput(totals.initialBalance.toString()); setIsBalanceModalOpen(true); }}
        className={`relative overflow-hidden rounded-3xl p-8 flex items-center justify-between cursor-pointer shadow-xl transition-transform hover:scale-[1.005] ${
          totals.currentBalance >= 0
            ? 'bg-gradient-to-r from-green-600 to-emerald-500 shadow-green-500/10'
            : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-red-500/10'
        }`}
      >
        <div className="absolute -top-10 -right-10 size-52 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-2">💰 Saldo Operacional em Caixa</p>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
            MT {totals.currentBalance.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-white/60 text-xs mt-2 font-medium">
            Saldo inicial configurado: MT {totals.initialBalance.toLocaleString('pt-MZ')} · Clique para editar
          </p>
        </div>
        <div className="relative z-10 text-right hidden sm:block bg-white/10 p-4 rounded-2xl border border-white/10">
          <span className="material-symbols-outlined text-white text-4xl">account_balance</span>
        </div>
      </div>

      {/* Investimentos e Poupanças (Trading & Poupança Equipamento) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trading Fund Control */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-gray-50 dark:border-zinc-800 pb-3">
            <h3 className="text-sm font-black uppercase text-text-sub flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">monitoring</span>
              Fundo de Trading de Investimentos
            </h3>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">USD + MT</span>
          </div>
          <div>
            <p className="text-2xl font-black text-primary">MT {tradingFundStats.netFundMt.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-text-sub mt-0.5">≈ ${tradingFundStats.netFundUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-text-sub border-t border-gray-55 dark:border-zinc-850 pt-3">
            <div>
              <p>Alocado (Transações):</p>
              <p className="font-bold text-text-main dark:text-white">MT {tradingFundStats.baseInvested.toLocaleString()}</p>
            </div>
            <div>
              <p>Resultados (Trades):</p>
              <p className={`font-bold ${tradingFundStats.realizedMt >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {tradingFundStats.realizedMt >= 0 ? '+' : ''}MT {tradingFundStats.realizedMt.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Savings Fund Control */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-gray-50 dark:border-zinc-800 pb-3">
            <h3 className="text-sm font-black uppercase text-text-sub flex items-center gap-1.5">
              <span className="material-symbols-outlined text-green-600 text-base">savings</span>
              Fundo de Poupança de Equipamento
            </h3>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Hardware</span>
          </div>
          <div>
            <p className="text-2xl font-black text-green-600">MT {savingsFundStats.equipmentSavings.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-text-sub mt-0.5">Reservado para aquisição de novas câmaras e servidores</p>
          </div>
          <div className="text-[11px] text-text-sub border-t border-gray-55 dark:border-zinc-850 pt-3">
            <p>Este fundo acumula compras de material catalogadas como Investimento.</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: `MT ${totals.income.toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' },
          { label: 'Despesas Gerais', value: `MT ${totals.expenses.toLocaleString()}`, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20' },
          { label: 'Investimentos Alocados', value: `MT ${totals.investments.toLocaleString()}`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Margem Líquida', value: `${totals.margin.toFixed(1)}%`, color: 'text-primary', bg: 'bg-primary/10' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <p className="text-text-sub text-[10px] font-bold uppercase tracking-widest mb-1">{item.label}</p>
            <h3 className="text-xl font-black mb-2">{item.value}</h3>
            <div className={`${item.bg} ${item.color} text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block`}>Sincronizado</div>
          </div>
        ))}
      </div>

      {/* Chart & Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-widest text-text-sub mb-6">Fluxo de Caixa Consolidado</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0056b3" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#0056b3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="entrada" stroke="#0056b3" fillOpacity={1} fill="url(#colorEntrada)" strokeWidth={3} />
                <Area type="monotone" dataKey="saida" stroke="#f87171" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Resumo por Categoria</h4>
            <div className="space-y-3">
              {Array.from(new Set(transactions.map(t => t.cat)))
                .map(cat => ({ cat, val: transactions.filter(t => t.cat === cat).reduce((acc, t) => acc + t.val, 0) }))
                .sort((a, b) => b.val - a.val)
                .slice(0, 5)
                .map(({ cat, val }) => (
                  <div key={cat} className="flex justify-between items-center text-xs py-1 border-b border-gray-50 dark:border-zinc-850 last:border-0">
                    <span className="text-text-sub font-medium">{cat}</span>
                    <span className="font-bold text-text-main dark:text-white">MT {val.toLocaleString()}</span>
                  </div>
                ))}
              {transactions.length === 0 && (
                <div className="text-xs text-text-sub text-center italic py-2">Nenhuma transação registrada</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Movimentações */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/30 dark:bg-zinc-800/20">
          <h4 className="text-sm font-black">Histórico de Movimentações</h4>
          <div className="flex gap-4">
            <span className="text-[10px] font-bold text-text-sub flex items-center gap-1.5 uppercase tracking-tighter">
              <span className="size-2 bg-green-500 rounded-full"></span> Entrada
            </span>
            <span className="text-[10px] font-bold text-text-sub flex items-center gap-1.5 uppercase tracking-tighter">
              <span className="size-2 bg-red-500 rounded-full"></span> Saída / Investimento
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-zinc-800/40">
          {transactions.map((t) => (
            <div key={t.id} className="px-6 py-4 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-zinc-850/20 transition-all">
              <div>
                <p className="text-xs font-bold text-text-main dark:text-white">{t.desc}</p>
                <p className="text-[10px] text-text-sub mt-0.5">{t.cat} · {new Date(t.date).toLocaleDateString('pt-MZ')}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}MT {t.val.toLocaleString('pt-MZ')}
                </span>
                {userRole === 'Gestor de Projetos' && (
                  <button onClick={() => onDeleteTransaction(t.id)} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950/25 p-1 rounded-lg">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center py-12 text-xs text-text-sub">Nenhuma movimentação registada.</p>
          )}
        </div>
      </div>

      {/* Balance Modal */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-lg mb-4">Ajustar Saldo Inicial</h3>
            <input
              type="number"
              className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 outline-none"
              placeholder="Saldo inicial em Meticais"
              value={newBalanceInput}
              onChange={e => setNewBalanceInput(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsBalanceModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold">Cancelar</button>
              <button onClick={handleSaveBalance} disabled={savingBalance || !newBalanceInput} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-50">
                {savingBalance ? 'A guardar...' : 'Guardar Saldo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lançamento Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-black text-lg mb-4">Novo Lançamento Financeiro</h3>
            <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Descrição *</label>
                <input required className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 outline-none" value={formData.desc} onChange={e => setFormData({ ...formData, desc: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Tipo *</label>
                  <select className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 outline-none" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                    <option value="income">Receita (Crédito)</option>
                    <option value="expense">Despesa (Débito)</option>
                    <option value="investment">Investimento (Ativo)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Valor (MT) *</label>
                  <input type="number" required className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 outline-none" value={formData.val} onChange={e => setFormData({ ...formData, val: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Categoria *</label>
                  <select className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 outline-none" value={formData.cat} onChange={e => setFormData({ ...formData, cat: e.target.value })}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Data *</label>
                  <input type="date" required className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-50 dark:border-zinc-850">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold">Lançar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
