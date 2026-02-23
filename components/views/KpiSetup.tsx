
import React, { useState } from 'react';

export const KpiSetup: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [selected, setSelected] = useState(['Taxa de Conversão', 'ROI', 'Tarefas Concluídas']);
  const suggestions = ['Tempo de Resposta', 'Satisfação (CSAT)', 'Custo por Lead', 'NPS', 'Retenção', 'Margem'];

  const toggle = (kpi: string) => {
    setSelected(prev => prev.includes(kpi) ? prev.filter(i => i !== kpi) : [...prev, kpi]);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-end">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Setup Inicial</p>
          <p className="text-text-sub text-sm font-medium">Passo 1 de 3</p>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-1/3 rounded-full relative animate-pulse"></div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-12 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4">Quais são os seus KPIs?</h1>
          <p className="text-text-sub text-lg font-light mb-10">Personalize seu painel selecionando as métricas essenciais. Você pode alterar isso a qualquer momento.</p>

          <div className="mb-10">
            <label className="block text-sm font-bold mb-3">Buscar métrica</label>
            <div className="flex items-center rounded-xl bg-gray-50 dark:bg-zinc-800 px-4 py-1 border border-transparent focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <span className="material-symbols-outlined text-text-sub">search</span>
              <input className="w-full border-none bg-transparent h-12 text-base focus:ring-0" placeholder="Ex: LTV, Churn Rate..." />
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-bold text-text-sub uppercase tracking-widest mb-4">Selecionados ({selected.length})</h3>
              <div className="flex flex-wrap gap-3">
                {selected.map(item => (
                  <div key={item} className="flex items-center gap-2 pl-4 pr-2 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-sm">
                    {item}
                    <button onClick={() => toggle(item)} className="hover:bg-primary/20 rounded-full p-0.5">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-zinc-800"></div>

            <div>
              <h3 className="text-xs font-bold text-text-sub uppercase tracking-widest mb-4">Sugestões Populares</h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.filter(s => !selected.includes(s)).map(item => (
                  <button key={item} onClick={() => toggle(item)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 text-sm font-medium transition-all">
                    <span className="material-symbols-outlined text-lg">add</span>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
            <button className="text-text-sub font-bold hover:text-text-main transition-colors">Pular</button>
            <button onClick={onFinish} className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transform hover:-translate-y-0.5 transition-all">
              Confirmar e Continuar
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
