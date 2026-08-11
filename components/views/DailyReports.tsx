import React, { useState } from 'react';
import { useDailyReports } from '../../src/hooks/useDailyReports';
import { User } from '../../types';

interface DailyReportsProps {
  currentUser: User | null;
}

export const DailyReports: React.FC<DailyReportsProps> = ({ currentUser }) => {
  const { reports, loading, createReport, updateReport, deleteReport } = useDailyReports(currentUser);
  
  const isManager = ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading'].includes(currentUser?.role || '');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    hours_dedicated: '',
    expected_output: ''
  });
  const [saving, setSaving] = useState(false);

  // Manager Feedback State
  const [feedbackModalId, setFeedbackModalId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.description || !formData.hours_dedicated || !formData.expected_output) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    
    setSaving(true);
    try {
      await createReport({
        date: formData.date,
        description: formData.description,
        hours_dedicated: parseFloat(formData.hours_dedicated),
        expected_output: formData.expected_output
      });
      setShowModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        hours_dedicated: '',
        expected_output: ''
      });
    } catch (err) {
      alert("Erro ao submeter o relatório.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!feedbackModalId) return;
    try {
      await updateReport(feedbackModalId, { manager_feedback: feedbackText });
      setFeedbackModalId(null);
      setFeedbackText('');
    } catch (err) {
      alert("Erro ao guardar feedback.");
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-MZ', options);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Relatórios Diários</h2>
          <p className="text-sm text-text-sub mt-1">
            {isManager ? 'Visualiza e gere os relatórios de trabalho da equipa.' : 'Regista as tuas atividades e outputs diários.'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white font-bold px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
        >
          <span className="material-symbols-outlined text-xl">edit_document</span>
          Submeter Relatório
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm overflow-hidden flex-1 min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <span className="material-symbols-outlined text-6xl text-gray-200 dark:text-zinc-800 mb-4">description</span>
            <h3 className="text-lg font-bold text-gray-400 dark:text-zinc-500">Nenhum relatório encontrado</h3>
            <p className="text-sm text-gray-400 dark:text-zinc-500 mt-2">Clica em "Submeter Relatório" para registares o teu primeiro dia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map(report => (
              <div key={report.id} className="bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 rounded-2xl p-5 hover:border-primary/30 transition-all flex flex-col gap-3 group relative">
                
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black">{formatDate(report.date)}</h3>
                    {isManager && <p className="text-xs font-bold text-primary">{report.user_name}</p>}
                  </div>
                  <div className="bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg border border-gray-100 dark:border-zinc-800 flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px] text-text-sub">schedule</span>
                    <span className="text-xs font-bold">{report.hours_dedicated}h</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-text-sub tracking-wider mb-1">O que fiz</p>
                    <p className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">{report.description}</p>
                  </div>
                  <div className="bg-white dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-800/50">
                    <p className="text-[10px] font-black uppercase text-text-sub tracking-wider mb-1">Output Esperado</p>
                    <p className="text-xs text-text-main font-semibold">{report.expected_output}</p>
                  </div>
                </div>

                {/* Manager Feedback */}
                {report.manager_feedback && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mt-2">
                    <p className="text-[10px] font-black uppercase text-primary tracking-wider mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">reviews</span> Feedback do Gestor
                    </p>
                    <p className="text-xs text-text-main font-medium">{report.manager_feedback}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 justify-end mt-2 pt-3 border-t border-gray-100 dark:border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isManager && (
                     <button
                       onClick={() => { setFeedbackModalId(report.id); setFeedbackText(report.manager_feedback || ''); }}
                       className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                     >
                       Dar Feedback
                     </button>
                  )}
                  {report.user_id === currentUser?.id && (
                    <button
                      onClick={async () => {
                        if (confirm('Tem a certeza que deseja eliminar este relatório?')) {
                          await deleteReport(report.id);
                        }
                      }}
                      className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-xl font-black mb-6">Submeter Relatório Diário</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Data *</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Horas Dedicadas *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Ex: 8"
                    value={formData.hours_dedicated}
                    onChange={e => setFormData({ ...formData, hours_dedicated: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">O que fiz no dia *</label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Lista detalhada das tarefas concluídas e em progresso..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Output Esperado *</label>
                <textarea
                  required
                  rows={2}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Qual é o resultado prático do teu trabalho de hoje?"
                  value={formData.expected_output}
                  onChange={e => setFormData({ ...formData, expected_output: e.target.value })}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 font-bold text-sm text-text-sub hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 font-bold text-sm text-white bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-colors disabled:opacity-50">
                  {saving ? 'A Guardar...' : 'Submeter Relatório'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackModalId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <h2 className="text-lg font-black mb-4">Adicionar Feedback</h2>
            <textarea
              rows={4}
              className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 mb-4"
              placeholder="Feedback sobre o relatório..."
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setFeedbackModalId(null)} className="px-4 py-2 font-bold text-sm text-text-sub hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl">Cancelar</button>
              <button onClick={handleSaveFeedback} className="px-4 py-2 font-bold text-sm text-white bg-primary rounded-xl">Guardar Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
