
import React, { useState } from 'react';
import { useSystemSettings } from '../../src/hooks/useSystemSettings';
import { usePhotoSessions } from '../../src/hooks/usePhotoSessions';
import { supabase } from '../../src/lib/supabase';
import { User } from '../../types';

interface SettingsProps {
  currentUser: User;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const { settings, fixedExpenses, totalFixedExpenses, breakevenSuggestion, updateExchangeRate, addFixedExpense, deleteFixedExpense } = useSystemSettings();
  const { catalog, addCatalogItem, deleteCatalogItem } = usePhotoSessions();

  const isProjectManager = currentUser.role === 'Gestor de Projetos';
  const isAnyManager = ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'exchange' | 'expenses' | 'catalog'>('exchange');
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [expenseName, setExpenseName] = useState('');
  const [expenseValue, setExpenseValue] = useState('');

  const [catalogType, setCatalogType] = useState<'BMS Studio' | 'Ocean Group'>('BMS Studio');
  const [catalogName, setCatalogName] = useState('');
  const [catalogDesc, setCatalogDesc] = useState('');
  const [catalogPrice, setCatalogPrice] = useState('');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveExchangeRate = async () => {
    const rate = parseFloat(exchangeRateInput);
    if (isNaN(rate) || rate <= 0) return;
    setSaving(true);
    try {
      await updateExchangeRate(rate);
      showMessage('success', `Taxa atualizada para 1 USD = ${rate.toFixed(2)} MT`);
      setExchangeRateInput('');
    } catch (e: any) {
      showMessage('error', e.message);
    } finally { setSaving(false); }
  };

  const handleAddExpense = async () => {
    if (!expenseName || !expenseValue) return;
    setSaving(true);
    try {
      await addFixedExpense(expenseName, parseFloat(expenseValue));
      showMessage('success', `Despesa "${expenseName}" adicionada`);
      setExpenseName('');
      setExpenseValue('');
    } catch (e: any) {
      showMessage('error', e.message);
    } finally { setSaving(false); }
  };

  const handleAddCatalog = async () => {
    if (!catalogName || !catalogPrice) return;
    setSaving(true);
    try {
      await addCatalogItem({ catalog_type: catalogType, name: catalogName, description: catalogDesc, price_mt: parseFloat(catalogPrice) });
      showMessage('success', `Serviço "${catalogName}" adicionado ao catálogo`);
      setCatalogName('');
      setCatalogDesc('');
      setCatalogPrice('');
    } catch (e: any) {
      showMessage('error', e.message);
    } finally { setSaving(false); }
  };

  const tabs = [
    { id: 'exchange', label: 'Taxa de Câmbio', icon: 'currency_exchange', show: isAnyManager },
    { id: 'expenses', label: 'Despesas Fixas', icon: 'receipt_long', show: isProjectManager },
    { id: 'catalog', label: 'Catálogo de Serviços', icon: 'menu_book', show: isProjectManager },
  ].filter(t => t.show);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black">Definições do Sistema</h2>
        <p className="text-sm text-text-sub">Configure parâmetros operacionais e financeiros</p>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="material-symbols-outlined text-base">{message.type === 'success' ? 'check_circle' : 'error'}</span>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 dark:bg-zinc-800 text-text-sub hover:text-text-main'}`}>
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Exchange Rate Tab */}
      {activeTab === 'exchange' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-sub mb-4">Taxa de Câmbio Atual</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-primary">currency_exchange</span>
              </div>
              <div>
                <p className="text-4xl font-black text-primary">{settings?.exchange_rate?.toFixed(2) ?? '68.33'}</p>
                <p className="text-sm text-text-sub">Meticais por 1 USD</p>
              </div>
            </div>
            <p className="text-xs text-text-sub mb-4">Esta taxa é usada automaticamente ao registar trades em USD. O histórico de trades mantém a taxa da data de criação.</p>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.01"
                value={exchangeRateInput}
                onChange={e => setExchangeRateInput(e.target.value)}
                placeholder={`Atual: ${settings?.exchange_rate?.toFixed(2) ?? '68.33'}`}
                className="flex-1 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <button
                onClick={handleSaveExchangeRate}
                disabled={saving || !exchangeRateInput}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-primary/90 transition-all"
              >
                {saving ? 'A guardar...' : 'Atualizar Taxa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="flex flex-col gap-4">
          {/* Breakeven Alert */}
          {totalFixedExpenses > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 mt-0.5">lightbulb</span>
                <div>
                  <p className="font-black text-sm text-amber-800 dark:text-amber-300">Ponto de Equilíbrio (Breakeven)</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                    Para crescer, a empresa deve faturar pelo menos <strong>MT {breakevenSuggestion.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}</strong> este mês.
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Despesas fixas: MT {totalFixedExpenses.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })} × 1.3 = MT {breakevenSuggestion.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-text-sub">Despesas Fixas Mensais</h3>
              <p className="font-black text-primary">Total: MT {totalFixedExpenses.toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}</p>
            </div>

            {fixedExpenses.length === 0 ? (
              <p className="text-sm text-text-sub text-center py-4">Nenhuma despesa fixa registada</p>
            ) : (
              <div className="flex flex-col gap-2 mb-6">
                {fixedExpenses.map(expense => (
                  <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                    <p className="text-sm font-medium">{expense.name}</p>
                    <div className="flex items-center gap-3">
                      <p className="font-black text-sm">MT {expense.value_mt.toLocaleString('pt-MZ')}</p>
                      <button onClick={() => deleteFixedExpense(expense.id)} className="text-red-400 hover:bg-red-50 p-1 rounded-lg">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <p className="text-xs font-bold text-text-sub uppercase mb-3">Adicionar Despesa Fixa</p>
              <div className="flex gap-3">
                <input type="text" value={expenseName} onChange={e => setExpenseName(e.target.value)}
                  placeholder="Ex: Renda do escritório" className="flex-1 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                <input type="number" value={expenseValue} onChange={e => setExpenseValue(e.target.value)}
                  placeholder="Valor MT" className="w-32 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                <button onClick={handleAddExpense} disabled={saving || !expenseName || !expenseValue}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-primary/90">
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-text-sub mb-4">Catálogo de Serviços</h3>

            {['BMS Studio', 'Ocean Group'].map(type => (
              <div key={type} className="mb-6">
                <p className="text-xs font-black text-text-sub uppercase mb-3 border-b border-gray-100 dark:border-zinc-800 pb-2">{type}</p>
                {catalog.filter(i => i.catalog_type === type).length === 0 ? (
                  <p className="text-sm text-text-sub">Nenhum serviço configurado</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {catalog.filter(i => i.catalog_type === type).map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                        <div>
                          <p className="text-sm font-bold">{item.name}</p>
                          {item.description && <p className="text-xs text-text-sub">{item.description}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-black text-sm">MT {item.price_mt.toLocaleString('pt-MZ')}</p>
                          <button onClick={() => deleteCatalogItem(item.id)} className="text-red-400 hover:bg-red-50 p-1 rounded-lg">
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-gray-100 dark:border-zinc-800 pt-4">
              <p className="text-xs font-bold text-text-sub uppercase mb-3">Adicionar Novo Serviço</p>
              <div className="space-y-3">
                <select value={catalogType} onChange={e => setCatalogType(e.target.value as any)}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option>BMS Studio</option>
                  <option>Ocean Group</option>
                </select>
                <input type="text" value={catalogName} onChange={e => setCatalogName(e.target.value)}
                  placeholder="Nome do serviço" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                <input type="text" value={catalogDesc} onChange={e => setCatalogDesc(e.target.value)}
                  placeholder="Descrição (opcional)" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                <input type="number" value={catalogPrice} onChange={e => setCatalogPrice(e.target.value)}
                  placeholder="Preço em MT" className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                <button onClick={handleAddCatalog} disabled={saving || !catalogName || !catalogPrice}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-primary/90">
                  {saving ? 'A guardar...' : 'Adicionar ao Catálogo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
