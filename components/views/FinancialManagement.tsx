
import React, { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '../../types';

interface FinancialManagementProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdateStatus: (id: string, status: Transaction['status']) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  userRole?: string;
}

export const FinancialManagement: React.FC<FinancialManagementProps> = ({ transactions, onAddTransaction, onUpdateStatus, onDeleteTransaction, userRole }) => {
  if (userRole !== 'Gestor de Projectos') {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center gap-4 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800">
        <span className="material-symbols-outlined text-6xl text-red-500">lock_person</span>
        <h2 className="text-2xl font-black italic">Acesso Restrito</h2>
        <p className="text-text-sub max-w-sm">Apenas o Gestor de Projectos tem permissão para visualizar e gerenciar o módulo financeiro.</p>
      </div>
    );
  }
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        return ['Pagamento de Cliente', 'Investimento de Sócio', 'Outro'];
      case 'investment':
        return ['Software', 'Material de Escritório', 'Hardware', 'Marketing', 'Trading'];
      case 'expense':
        return ['Infraestrutura', 'Fixos', 'Recursos Humanos', 'Marketing', 'Outros'];
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

  const totals = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.val, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.val, 0);
    const investments = transactions.filter(t => t.type === 'investment').reduce((acc, t) => acc + t.val, 0);
    const margin = income > 0 ? ((income - expenses) / income) * 100 : 0;

    return { income, expenses, investments, margin };
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
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

  const chartData = [
    { name: 'Semana 1', entrada: totals.income * 0.2, saida: (totals.expenses + totals.investments) * 0.3 },
    { name: 'Semana 2', entrada: totals.income * 0.3, saida: (totals.expenses + totals.investments) * 0.2 },
    { name: 'Semana 3', entrada: totals.income * 0.1, saida: (totals.expenses + totals.investments) * 0.4 },
    { name: 'Semana 4', entrada: totals.income * 0.4, saida: (totals.expenses + totals.investments) * 0.1 },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Gestão Financeira</h2>
          <p className="text-text-sub">Controle refinado de entradas, despesas operacionais e alocação de investimentos.</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
            <span className="material-symbols-outlined text-lg">download</span> Exportar
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span> Novo Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Receita Total', value: `MT ${totals.income.toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
          { label: 'Despesas', value: `MT ${totals.expenses.toLocaleString()}`, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' },
          { label: 'Investimentos', value: `MT ${totals.investments.toLocaleString()}`, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' },
          { label: 'Margem Líquida', value: `${totals.margin.toFixed(1)}%`, color: 'text-primary', bg: 'bg-primary-light dark:bg-primary/10' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <p className="text-text-sub text-[10px] font-bold uppercase tracking-widest mb-1">{item.label}</p>
            <h3 className="text-2xl font-black mb-2">{item.value}</h3>
            <div className={`${item.bg} ${item.color} text-[10px] font-bold px-2 py-0.5 rounded-full inline-block`}>Atualizado agora</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <h4 className="font-bold mb-8">Fluxo de Caixa Consolidado</h4>
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

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-primary text-white p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined filled">insights</span>
              <h4 className="font-bold">Análise de Alocação</h4>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              Seus investimentos estão concentrados em {Math.round((totals.investments / (totals.income || 1)) * 100)}% da sua receita.
              Investimentos em <strong>Trading</strong> e <strong>Marketing</strong> devem ser monitorados semanalmente para ROI positivo.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 flex-1">
            <h4 className="font-bold mb-4">Resumo por Categoria</h4>
            <div className="space-y-3">
              {['Pagamento de Cliente', 'Trading', 'Hardware', 'Fixos'].map((cat) => {
                const val = transactions.filter(t => t.cat === cat).reduce((acc, t) => acc + t.val, 0);
                return (
                  <div key={cat} className="flex justify-between items-center text-xs">
                    <span className="text-text-sub font-medium">{cat}</span>
                    <span className="font-bold">MT {val.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/30 dark:bg-zinc-800/20">
            <h4 className="font-bold">Histórico de Movimentações</h4>
            <div className="flex gap-4">
              <span className="text-[10px] font-bold text-text-sub flex items-center gap-1.5 uppercase tracking-tighter">
                <span className="size-2 bg-green-500 rounded-full"></span> Entrada
              </span>
              <span className="text-[10px] font-bold text-text-sub flex items-center gap-1.5 uppercase tracking-tighter">
                <span className="size-2 bg-red-500 rounded-full"></span> Despesa
              </span>
              <span className="text-[10px] font-bold text-text-sub flex items-center gap-1.5 uppercase tracking-tighter">
                <span className="size-2 bg-amber-500 rounded-full"></span> Investimento
              </span>
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-text-sub bg-gray-50/50 dark:bg-zinc-800/30 border-b border-gray-100 dark:border-zinc-800">
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
              {transactions.map((t) => (
                <tr key={t.id} className="text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-2.5 rounded-full ${t.type === 'income' ? 'bg-green-500' :
                        t.type === 'expense' ? 'bg-red-500' : 'bg-amber-500'
                        }`}></div>
                      <span className="font-bold">{t.desc}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-sub font-medium">{t.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'income' ? 'bg-green-100 text-green-700' :
                      t.type === 'investment' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300'
                      }`}>
                      {t.cat}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-black ${t.type === 'income' ? 'text-green-600' : 'text-text-main dark:text-gray-200'}`}>
                    {t.type === 'income' ? '+' : '-'} MT {t.val.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDeleteTransaction(t.id)}
                        disabled={userRole !== 'Gestor de Projectos'}
                        className="p-2 text-text-sub hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remover lançamento"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                      <button
                        disabled={t.status === 'Pago' || t.status === 'Recebido'}
                        onClick={() => onUpdateStatus(t.id, t.type === 'income' ? 'Recebido' : 'Pago')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 group ${t.status === 'Pago' || t.status === 'Recebido'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default'
                          : 'bg-amber-100 text-amber-700 hover:bg-primary hover:text-white dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-primary dark:hover:text-white shadow-sm active:scale-95'
                          }`}
                      >
                        <span className={`material-symbols-outlined text-xs ${t.status === 'Pendente' ? 'animate-pulse' : ''}`}>
                          {t.status === 'Pago' || t.status === 'Recebido' ? 'check_circle' : 'pending_actions'}
                        </span>
                        {t.status}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE LANÇAMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form
            onSubmit={handleAddTransaction}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-8 flex flex-col gap-6 overflow-hidden"
          >
            {/* Header decor */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${formData.type === 'income' ? 'bg-green-500' :
              formData.type === 'expense' ? 'bg-red-500' : 'bg-amber-500'
              }`}></div>

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Lançamento Financeiro</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="material-symbols-outlined text-text-sub hover:text-red-500 transition-colors">close</button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['income', 'expense', 'investment'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border-2 transition-all ${formData.type === type
                    ? (type === 'income' ? 'border-green-500 bg-green-50 text-green-700' :
                      type === 'expense' ? 'border-red-500 bg-red-50 text-red-700' :
                        'border-amber-500 bg-amber-50 text-amber-700')
                    : 'border-transparent bg-gray-50 dark:bg-zinc-800 text-text-sub'
                    }`}
                >
                  {type === 'income' ? 'Entrada' : type === 'expense' ? 'Despesa' : 'Investimento'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-sub">Descrição</label>
              <input
                required
                className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                placeholder="Ex: Faturamento Sprint 01"
                value={formData.desc}
                onChange={e => setFormData({ ...formData, desc: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text-sub">Valor (MT)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                  placeholder="0.00"
                  value={formData.val}
                  onChange={e => setFormData({ ...formData, val: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text-sub">Data</label>
                <input
                  required
                  type="date"
                  className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-sub">Categoria de {formData.type === 'income' ? 'Entrada' : formData.type === 'expense' ? 'Despesa' : 'Investimento'}</label>
              <select
                className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                value={formData.cat}
                onChange={e => setFormData({ ...formData, cat: e.target.value })}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              type="submit"
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 mt-2 ${formData.type === 'income' ? 'bg-green-600 shadow-green-200 dark:shadow-none hover:bg-green-700' :
                formData.type === 'expense' ? 'bg-red-500 shadow-red-200 dark:shadow-none hover:bg-red-600' :
                  'bg-amber-600 shadow-amber-200 dark:shadow-none hover:bg-amber-700'
                }`}
            >
              Confirmar Lançamento
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
