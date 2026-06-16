import React, { useState, useMemo } from 'react';
import { TradingTrade } from '../../types';
import { useTrading } from '../../src/hooks/useTrading';
import { useSystemSettings } from '../../src/hooks/useSystemSettings';
import { useConfirm } from '../ui/ConfirmDialog';

const classificationConfig: Record<string, { color: string; bg: string; label: string }> = {
  'dentro do plano': { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-950/50', label: 'Dentro do Plano' },
  'fora do plano': { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-950/50', label: 'Fora do Plano' },
  'violação de regras': { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-950/50', label: 'Violação de Regras' },
};

const ASSETS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'US30', 'NAS100', 'USDJPY', 'BTCUSD', 'Outro'];

type TradeForm = {
  asset: string;
  customAsset: string;
  lot: string;
  stop_loss_usd: string;
  take_profit_usd: string;
  open_date: string;
  pre_trade_notes: string;
  result: '' | 'positivo' | 'negativo';
  realized_usd: string;
  observation: string;
  classification: '' | 'dentro do plano' | 'fora do plano' | 'violação de regras';
  close_date: string;
};

const emptyForm: TradeForm = {
  asset: 'XAUUSD',
  customAsset: '',
  lot: '',
  stop_loss_usd: '',
  take_profit_usd: '',
  open_date: '',
  pre_trade_notes: '',
  result: '',
  realized_usd: '',
  observation: '',
  classification: '',
  close_date: '',
};

export const Trading: React.FC = () => {
  const { confirm } = useConfirm();
  const { trades, loading, metrics, createTrade, updateTrade, deleteTrade } = useTrading();
  const { settings } = useSystemSettings();
  const exchangeRate = settings?.exchange_rate ?? 68.33;

  const [showModal, setShowModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradingTrade | null>(null);
  const [form, setForm] = useState<TradeForm>(emptyForm);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades'>('dashboard');
  const [saving, setSaving] = useState(false);
  const [filterResult, setFilterResult] = useState<string>('Todos');

  const openNew = () => {
    const now = new Date();
    // Format to local timezone YYYY-MM-DDTHH:MM
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzoffset)).toISOString().slice(0, 16);
    setForm({ ...emptyForm, open_date: localISOTime });
    setEditingTrade(null);
    setShowModal(true);
  };

  const openEdit = (t: TradingTrade) => {
    setEditingTrade(t);
    const isCustomAsset = !ASSETS.includes(t.asset);
    setForm({
      asset: isCustomAsset ? 'Outro' : t.asset,
      customAsset: isCustomAsset ? t.asset : '',
      lot: String(t.lot),
      stop_loss_usd: String(t.stop_loss_usd),
      take_profit_usd: String(t.take_profit_usd),
      open_date: t.open_date ? t.open_date.slice(0, 16) : '',
      pre_trade_notes: t.pre_trade_notes || '',
      result: t.result || '',
      realized_usd: t.realized_usd !== undefined ? String(t.realized_usd) : '',
      observation: t.observation || '',
      classification: t.classification || '',
      close_date: t.close_date ? t.close_date.slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const finalAsset = form.asset === 'Outro' ? form.customAsset : form.asset;
    if (!finalAsset || !form.lot || !form.stop_loss_usd || !form.take_profit_usd || !form.open_date) {
      alert('Por favor preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        asset: finalAsset,
        lot: parseFloat(form.lot),
        stop_loss_usd: parseFloat(form.stop_loss_usd),
        take_profit_usd: parseFloat(form.take_profit_usd),
        open_date: new Date(form.open_date).toISOString(),
        pre_trade_notes: form.pre_trade_notes || undefined,
        result: form.result || undefined,
        realized_usd: form.realized_usd !== '' ? parseFloat(form.realized_usd) : undefined,
        observation: form.observation || undefined,
        classification: form.classification || undefined,
        close_date: form.close_date ? new Date(form.close_date).toISOString() : undefined,
        exchange_rate: editingTrade ? editingTrade.exchange_rate : exchangeRate,
      };
      
      if (editingTrade) {
        await updateTrade(editingTrade.id, payload);
      } else {
        await createTrade(payload as any);
      }
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao guardar trade.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Eliminar Trade', message: 'Tem a certeza que deseja eliminar este trade?', isDanger: true, confirmText: 'Eliminar' });
    if (ok) {
      try {
        await deleteTrade(id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredTrades = useMemo(() => {
    if (filterResult === 'Todos') return trades;
    if (filterResult === 'Abertas') return trades.filter(t => !t.result);
    return trades.filter(t => t.result === filterResult);
  }, [trades, filterResult]);

  const MetricCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
      <p className="text-[10px] font-black uppercase tracking-widest text-text-sub mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-text-sub mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black">Área de Trading</h2>
          <p className="text-sm text-text-sub mt-0.5">Taxa de Câmbio Atual: <span className="font-bold text-primary">1 USD = {exchangeRate.toFixed(2)} MT</span></p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
          <span className="material-symbols-outlined text-lg">add</span> Novo Trade
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
        {['dashboard', 'trades'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-text-sub hover:text-text-main'}`}>
            {tab === 'dashboard' ? 'Dashboard' : 'Histórico de Trades'}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} sub={`${metrics.winners} Vitórias / ${metrics.losers} Derrotas`} color={metrics.winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
            <MetricCard label="Profit Factor" value={isFinite(metrics.profitFactor) ? metrics.profitFactor.toFixed(2) : 'N/A'} sub="Relação Lucro / Perda" color={metrics.profitFactor >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
            <MetricCard label="Expectância (USD)" value={`$${metrics.expectancy.toFixed(2)}`} sub={`≈ MT ${(metrics.expectancy * exchangeRate).toFixed(0)}`} color={metrics.expectancy >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
            <MetricCard label="Disciplina" value={`${metrics.disciplineRate.toFixed(0)}%`} sub="Operações dentro do plano" color={metrics.disciplineRate >= 80 ? 'text-green-600 dark:text-green-400' : metrics.disciplineRate >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricCard label="Lucro Total Acumulado" value={`$${metrics.totalProfitUsd.toFixed(2)}`} sub={`MT ${(metrics.totalProfitUsd * exchangeRate).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="text-green-600 dark:text-green-400" />
            <MetricCard label="Perda Total Acumulada" value={`$${metrics.totalLossUsd.toFixed(2)}`} sub={`MT ${(metrics.totalLossUsd * exchangeRate).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="text-red-600 dark:text-red-400" />
          </div>

          {/* Discipline breakdown */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 transition-colors duration-300">
            <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Análise de Disciplina</h3>
            <div className="flex flex-col gap-3">
              {Object.entries(classificationConfig).map(([key, cfg]) => {
                const count = trades.filter(t => t.classification === key).length;
                const pct = trades.length > 0 ? (count / trades.length) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold">{cfg.label}</span>
                      <span className="text-text-sub">{count} trades ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${key === 'dentro do plano' ? 'bg-green-500' : key === 'fora do plano' ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="flex flex-col gap-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {['Todos', 'Abertas', 'positivo', 'negativo'].map(f => (
              <button key={f} onClick={() => setFilterResult(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterResult === f ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 dark:bg-zinc-800 text-text-sub hover:text-text-main'
                }`}>
                {f === 'positivo' ? 'Positivos' : f === 'negativo' ? 'Negativos' : f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-text-sub">A carregar trades...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-text-sub">candlestick_chart</span>
              <p className="text-text-sub mt-2">Nenhum trade registado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTrades.map(trade => (
                <div key={trade.id} className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary">candlestick_chart</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-sm">{trade.asset}</p>
                          {trade.classification && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${classificationConfig[trade.classification]?.bg} ${classificationConfig[trade.classification]?.color}`}>
                              {classificationConfig[trade.classification]?.label}
                            </span>
                          )}
                          {trade.result && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trade.result === 'positivo' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'}`}>
                              {trade.result === 'positivo' ? '▲ Positivo' : '▼ Negativo'}
                            </span>
                          )}
                          {!trade.result && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Aberto</span>}
                        </div>
                        <p className="text-xs text-text-sub mt-0.5">Lote: {trade.lot} · SL: ${trade.stop_loss_usd} · TP: ${trade.take_profit_usd}</p>
                        <p className="text-[10px] text-text-sub">Aberto em: {new Date(trade.open_date).toLocaleString('pt-MZ')}</p>
                        {trade.close_date && <p className="text-[10px] text-text-sub">Fechado em: {new Date(trade.close_date).toLocaleString('pt-MZ')}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {trade.realized_usd !== undefined && (
                        <div className="text-right mr-2">
                          <p className={`font-black text-sm ${trade.result === 'positivo' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trade.result === 'positivo' ? '+' : '-'}${Math.abs(trade.realized_usd).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-text-sub">MT {Math.abs(trade.realized_usd * trade.exchange_rate).toLocaleString('pt-MZ', { maximumFractionDigits: 0 })}</p>
                        </div>
                      )}
                      <button onClick={() => openEdit(trade)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-lg text-text-sub">edit</span>
                      </button>
                      <button onClick={() => handleDelete(trade.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-lg text-red-400">delete</span>
                      </button>
                    </div>
                  </div>
                  {trade.pre_trade_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                      <p className="text-xs font-bold text-text-sub uppercase mb-1">Notas Pré-Trade</p>
                      <p className="text-xs text-text-sub">{trade.pre_trade_notes}</p>
                    </div>
                  )}
                  {trade.observation && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-text-sub uppercase mb-1">Observações</p>
                      <p className="text-xs text-text-sub">{trade.observation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg">{editingTrade ? 'Editar Trade' : 'Novo Trade'}</h3>
              <button onClick={() => setShowModal(false)} className="text-text-sub hover:text-text-main">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Ativo *</label>
                  <select value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                    {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Lote *</label>
                  <input type="number" step="0.01" value={form.lot} onChange={e => setForm({ ...form, lot: e.target.value })} placeholder="Ex: 0.10"
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>

              {form.asset === 'Outro' && (
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Especificar Ativo *</label>
                  <input type="text" value={form.customAsset} onChange={e => setForm({ ...form, customAsset: e.target.value })} placeholder="Ex: SOLUSD"
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Stop Loss (USD) *</label>
                  <input type="number" step="0.01" value={form.stop_loss_usd} onChange={e => setForm({ ...form, stop_loss_usd: e.target.value })} placeholder="SL em USD"
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Take Profit (USD) *</label>
                  <input type="number" step="0.01" value={form.take_profit_usd} onChange={e => setForm({ ...form, take_profit_usd: e.target.value })} placeholder="TP em USD"
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Data e Hora de Abertura *</label>
                  <input type="datetime-local" value={form.open_date} onChange={e => setForm({ ...form, open_date: e.target.value })}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Notas Pré-Trade</label>
                <textarea value={form.pre_trade_notes} onChange={e => setForm({ ...form, pre_trade_notes: e.target.value })} placeholder="Motivo da entrada, setup..." rows={2}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>

              <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 mt-2">
                <p className="text-xs font-black uppercase text-text-sub mb-3">Fecho da Operação (Opcional)</p>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Resultado</label>
                    <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value as any })}
                      className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                      <option value="">Aberto</option>
                      <option value="positivo">Ganho (Positivo)</option>
                      <option value="negativo">Perda (Negativo)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Resultado Realizado (USD)</label>
                    <input type="number" step="0.01" value={form.realized_usd} onChange={e => setForm({ ...form, realized_usd: e.target.value })} placeholder="Lucro/Perda USD"
                      className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                    {form.realized_usd && (
                      <p className="text-[10px] text-text-sub mt-1">
                        ≈ MT {(parseFloat(form.realized_usd) * (editingTrade ? editingTrade.exchange_rate : exchangeRate)).toLocaleString('pt-MZ', { maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Classificação</label>
                    <select value={form.classification} onChange={e => setForm({ ...form, classification: e.target.value as any })}
                      className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                      <option value="">Sem Classificação</option>
                      <option value="dentro do plano">No Plano</option>
                      <option value="fora do plano">Fora do Plano</option>
                      <option value="violação de regras">Violação de Regras</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Data e Hora de Fecho</label>
                    <input type="datetime-local" value={form.close_date} onChange={e => setForm({ ...form, close_date: e.target.value })}
                      className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Observações do Fecho</label>
                  <textarea value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} placeholder="Lições aprendidas, nota emocional..." rows={2}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-bold hover:bg-gray-50 dark:hover:bg-zinc-800">Cancelar</button>
                <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 hover:bg-primary/90">
                  {saving ? 'A guardar...' : 'Guardar Trade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
