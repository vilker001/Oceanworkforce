import React, { useState, useEffect } from 'react';
import { useProjects } from '../../src/hooks/useProjects';
import { useClients } from '../../src/hooks/useClients';
import { supabase } from '../../src/lib/supabase';
import { User, Project, ProjectStage, ProjectObjective } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';

interface ProjectsProps {
  currentUser: User;
}

export const Projects: React.FC<ProjectsProps> = ({ currentUser }) => {
  const { projects, loading, createProject, updateProject, deleteProject, createStage, updateStage, deleteStage } = useProjects();
  const { clients } = useClients();
  const { confirm } = useConfirm();

  const roleStr = (currentUser?.role || '').toLowerCase();
  const isGP = roleStr.includes('projeto') || roleStr.includes('projecto');
  const isGT = roleStr.includes('técnico') || roleStr.includes('tecnico');
  const canManage = isGP || isGT;

  const [activeTab, setActiveTab] = useState<'ativos' | 'concluidos'>('ativos');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Project Modal States
  const [showProjModal, setShowProjModal] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projType, setProjType] = useState<'interno' | 'externo'>('interno');
  const [projClientId, setProjClientId] = useState('');
  const [savingProj, setSavingProj] = useState(false);

  // Stage Modal States
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageName, setStageName] = useState('');
  const [stageDesc, setStageDesc] = useState('');
  const [stageStart, setStageStart] = useState('');
  const [stageDue, setStageDue] = useState('');
  const [stageRelevance, setStageRelevance] = useState('3');
  const [stageObjectivesInput, setStageObjectivesInput] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSummary, setReportSummary] = useState('');
  const [reportObjectives, setReportObjectives] = useState<{ text: string; completed: boolean; stageName: string }[]>([]);
  const [savingReport, setSavingReport] = useState(false);

  // Auto-load project detail if the list updates
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }, [projects]);

  // Check and apply 48h penalty for missing completion reports
  // Runs client-side when viewing projects
  useEffect(() => {
    const checkPenalties = async () => {
      if (!projects || projects.length === 0) return;
      const now = new Date();
      for (const p of projects) {
        if (p.status === 'Concluido' && p.completed_at && !p.completion_report) {
          const completedDate = new Date(p.completed_at);
          const diffHours = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60);
          
          if (diffHours >= 48) {
            // Apply -50 XP penalty once
            try {
              // Update completion report placeholder to prevent double penalty
              const placeholderReport = {
                submitted_at: null,
                summary: 'RELATÓRIO NÃO ENVIADO NO PRAZO DE 48H.',
                late_penalty: -50,
                penalty_applied: true,
                objectives_not_met: 0
              };
              
              await updateProject(p.id, {
                completion_report: placeholderReport
              });

              // Add penalty to XP history
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase.from('xp_history').insert({
                  user_id: user.id,
                  xp_amount: -50,
                  reason: `Penalização: Atraso de 48h no relatório de conclusão do projeto: ${p.name}`
                });
              }
            } catch (e) {
              console.error('Erro ao aplicar penalização de 48h:', e);
            }
          }
        }
      }
    };
    checkPenalties();
  }, [projects]);

  const handleCreateProject = async () => {
    if (!projName) return;
    setSavingProj(true);
    try {
      await createProject({
        name: projName,
        description: projDesc || undefined,
        type: projType,
        client_id: projType === 'externo' ? projClientId : undefined,
        status: 'Ativo'
      });
      setShowProjModal(false);
      setProjName('');
      setProjDesc('');
      setProjType('interno');
      setProjClientId('');
    } catch (e) {
      console.error(e);
      alert('Erro ao criar projeto.');
    } finally {
      setSavingProj(false);
    }
  };

  const handleCreateStage = async () => {
    if (!selectedProject || !stageName || !stageStart || !stageDue) return;
    setSavingStage(true);
    try {
      const objectivesList: ProjectObjective[] = stageObjectivesInput
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(text => ({ text, completed: false }));

      await createStage({
        project_id: selectedProject.id,
        name: stageName,
        description: stageDesc || undefined,
        start_date: stageStart,
        due_date: stageDue,
        status: 'A Fazer',
        relevance: parseInt(stageRelevance),
        objectives: objectivesList
      });

      setShowStageModal(false);
      setStageName('');
      setStageDesc('');
      setStageStart('');
      setStageDue('');
      setStageRelevance('3');
      setStageObjectivesInput('');
    } catch (e) {
      console.error(e);
      alert('Erro ao criar etapa.');
    } finally {
      setSavingStage(false);
    }
  };

  const handleToggleStageObjective = async (stage: ProjectStage, objIndex: number) => {
    const updatedObjs = [...stage.objectives];
    updatedObjs[objIndex].completed = !updatedObjs[objIndex].completed;
    try {
      await updateStage(stage.id, { objectives: updatedObjs });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteStage = async (stage: ProjectStage) => {
    const ok = await confirm({ title: 'Concluir Etapa', message: `Deseja concluir a etapa "${stage.name}"?\nIsso concederá +${stage.relevance * 20} XP.`, confirmText: 'Concluir' });
    if (!ok) return;
    try {
      await updateStage(stage.id, {
        status: 'Concluido',
        completed_at: new Date().toISOString()
      });

      // Award XP
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('xp_history').insert({
          user_id: user.id,
          xp_amount: stage.relevance * 20,
          reason: `Etapa concluída: ${stage.name} (Projeto: ${selectedProject?.name})`
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenReportModal = () => {
    if (!selectedProject) return;
    // Gather all objectives from all stages
    const allObjs: typeof reportObjectives = [];
    (selectedProject.stages || []).forEach(stage => {
      stage.objectives.forEach(obj => {
        allObjs.push({
          text: obj.text,
          completed: obj.completed,
          stageName: stage.name
        });
      });
    });
    setReportObjectives(allObjs);
    setReportSummary('');
    setShowReportModal(true);
  };

  const handleToggleReportObjective = (index: number) => {
    setReportObjectives(prev => prev.map((o, i) => i === index ? { ...o, completed: !o.completed } : o));
  };

  const handleSubmitReport = async () => {
    if (!selectedProject) return;
    setSavingReport(true);
    try {
      const now = new Date();
      const completedAtStr = new Date().toISOString();
      const unmetCount = reportObjectives.filter(o => !o.completed).length;
      
      const xpDeduction = unmetCount * 20;

      const completionReport = {
        submitted_at: now.toISOString(),
        summary: reportSummary,
        objectives_not_met: unmetCount,
        xp_deducted: xpDeduction,
        late_penalty: 0
      };

      await updateProject(selectedProject.id, {
        status: 'Concluido',
        completed_at: completedAtStr,
        completion_report: completionReport
      });

      // Deduct XP for unmet objectives
      if (xpDeduction > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('xp_history').insert({
            user_id: user.id,
            xp_amount: -xpDeduction,
            reason: `Dedução: ${unmetCount} objetivos não atingidos no projeto: ${selectedProject.name}`
          });
        }
      }

      setShowReportModal(false);
      alert(`Projeto concluído com sucesso! Dedução aplicada: -${xpDeduction} XP por objetivos não atingidos.`);
    } catch (e) {
      console.error(e);
      alert('Erro ao enviar relatório de conclusão.');
    } finally {
      setSavingReport(false);
    }
  };

  const filteredProjects = projects.filter(p => activeTab === 'ativos' ? p.status === 'Ativo' : p.status === 'Concluido');

  // Format date helper
  const formatDate = (dStr: string) => {
    if (!dStr) return '';
    return new Date(dStr).toLocaleDateString('pt-MZ');
  };

  // Warning calculations for active selection
  const getReportWarning = (proj: Project) => {
    if (proj.status !== 'Concluido' || !proj.completed_at || proj.completion_report?.submitted_at) return null;
    if (proj.completion_report?.penalty_applied) {
      return { type: 'error', text: 'Penalização aplicada: -50 XP por não preencher o relatório em 48h!' };
    }
    const completedDate = new Date(proj.completed_at);
    const diffHours = (new Date().getTime() - completedDate.getTime()) / (1000 * 60 * 60);
    if (diffHours >= 24) {
      return { type: 'warning', text: 'Aviso: Tens menos de 24h para preencher o relatório sob pena de -50 XP!' };
    }
    return { type: 'info', text: 'Preenche o relatório de conclusão em 48h para evitar a perda de 50 XP.' };
  };

  const warning = selectedProject ? getReportWarning(selectedProject) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left panel: projects list */}
      <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-5 flex flex-col gap-4 shadow-sm h-[80vh] transition-colors duration-300">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black">Projetos</h2>
          {canManage && (
            <button onClick={() => setShowProjModal(true)} className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all">
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
          {['ativos', 'concluidos'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-text-sub'}`}>
              {tab === 'ativos' ? 'Ativos' : 'Concluídos'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <p className="text-center text-xs text-text-sub py-8">A carregar...</p>
          ) : filteredProjects.length === 0 ? (
            <p className="text-center text-xs text-text-sub py-8">Nenhum projeto encontrado</p>
          ) : (
            filteredProjects.map(proj => (
              <div key={proj.id} onClick={() => setSelectedProject(proj)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedProject?.id === proj.id ? 'bg-primary/5 border-primary/20 shadow-sm' : 'border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-850'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black line-clamp-1">{proj.name}</h3>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 uppercase ${proj.type === 'interno' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350' : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'}`}>
                      {proj.type === 'interno' ? 'Interno' : `Cliente: ${proj.client_name || 'Externo'}`}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${proj.status === 'Ativo' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300' : 'bg-gray-100 text-gray-700'}`}>{proj.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Middle/Right panel: selected project detail */}
      <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm h-[80vh] flex flex-col transition-colors duration-300">
        {selectedProject ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Project Header */}
            <div className="border-b border-gray-100 dark:border-zinc-800 pb-4 shrink-0">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-black">{selectedProject.name}</h2>
                  <p className="text-xs text-text-sub mt-1">{selectedProject.description || 'Sem descrição'}</p>
                </div>
                {canManage && (
                  <button onClick={async () => {
                    const ok = await confirm({ title: 'Excluir Projeto', message: 'Tem a certeza que deseja excluir este projeto?', isDanger: true, confirmText: 'Excluir' });
                    if (ok) {
                      await deleteProject(selectedProject.id);
                      setSelectedProject(null);
                    }
                  }} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 p-2 rounded-xl">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                )}
              </div>

              {/* Status / Warnings */}
              {warning && (
                <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  warning.type === 'error' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50' : 
                  warning.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50' :
                  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50'
                }`}>
                  <span className="material-symbols-outlined text-base">warning</span>
                  {warning.text}
                </div>
              )}
            </div>

            {/* Stages & Report Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 custom-scrollbar pr-1">
              {/* Report display if completed */}
              {selectedProject.completion_report?.submitted_at && (
                <div className="bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/30 p-4 rounded-2xl">
                  <h3 className="text-xs font-black uppercase text-green-700 dark:text-green-400 mb-2">Relatório de Conclusão</h3>
                  <p className="text-xs font-bold text-green-800 dark:text-green-300">Enviado em: {formatDate(selectedProject.completion_report.submitted_at)}</p>
                  <p className="text-xs mt-1 text-zinc-600 dark:text-zinc-400">{selectedProject.completion_report.summary}</p>
                  {selectedProject.completion_report.xp_deducted > 0 && (
                    <p className="text-[10px] font-bold text-red-500 mt-2">Dedução aplicada: -{selectedProject.completion_report.xp_deducted} XP por objetivos não cumpridos.</p>
                  )}
                </div>
              )}

              {/* Incomplete project but finished - GP/GT need to fill the report */}
              {selectedProject.status === 'Ativo' && canManage && (
                <div className="flex justify-end pt-2">
                  <button onClick={handleOpenReportModal} className="flex items-center gap-2 bg-green-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-green-700 transition-all shadow-sm">
                    <span className="material-symbols-outlined text-base">checklist</span> Concluir Projeto e Enviar Relatório
                  </button>
                </div>
              )}

              {/* Stages List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black uppercase text-text-sub tracking-wider">Etapas do Projeto</h3>
                  {canManage && selectedProject.status === 'Ativo' && (
                    <button onClick={() => setShowStageModal(true)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 transition-all">
                      <span className="material-symbols-outlined text-base">add</span> Nova Etapa
                    </button>
                  )}
                </div>

                {(!selectedProject.stages || selectedProject.stages.length === 0) ? (
                  <p className="text-xs text-text-sub text-center py-6">Nenhuma etapa cadastrada.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedProject.stages.map((stage) => (
                      <div key={stage.id} className="bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800/50 p-4 rounded-2xl relative transition-all">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <div>
                            <h4 className="text-sm font-black">{stage.name}</h4>
                            {stage.description && <p className="text-xs text-text-sub mt-0.5">{stage.description}</p>}
                            <p className="text-[10px] text-text-sub mt-1">Prazo: {formatDate(stage.start_date)} a {formatDate(stage.due_date)} · Relevância: {stage.relevance}/5</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${stage.status === 'Concluido' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'}`}>
                              {stage.status}
                            </span>
                            {canManage && stage.status !== 'Concluido' && selectedProject.status === 'Ativo' && (
                              <button onClick={() => handleCompleteStage(stage)} className="text-[10px] font-bold text-green-600 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-all">
                                Concluir
                              </button>
                            )}
                            {canManage && selectedProject.status === 'Ativo' && (
                              <button onClick={() => deleteStage(stage.id)} className="text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded-md">
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Objectives checklist */}
                        {stage.objectives && stage.objectives.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800/60">
                            <p className="text-[10px] font-bold text-text-sub uppercase mb-2">Checklist de Objetivos</p>
                            <div className="space-y-1.5">
                              {stage.objectives.map((obj, oIdx) => (
                                <label key={oIdx} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={obj.completed}
                                    disabled={stage.status === 'Concluido' || selectedProject.status !== 'Ativo'}
                                    onChange={() => handleToggleStageObjective(stage, oIdx)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary/20 size-3.5"
                                  />
                                  <span className={obj.completed ? 'line-through text-text-sub' : ''}>{obj.text}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-text-sub">folder</span>
            <p className="text-text-sub mt-2 text-sm font-medium">Selecione um projeto para ver os detalhes.</p>
          </div>
        )}
      </div>

      {/* Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-lg">Criar Novo Projeto</h3>
              <button onClick={() => setShowProjModal(false)}><span className="material-symbols-outlined text-text-sub">close</span></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Nome do Projeto *</label>
                <input type="text" value={projName} onChange={e => setProjName(e.target.value)} placeholder="Ex: Website Ocean Group"
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Descrição</label>
                <textarea value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Breve resumo do projeto..." rows={3}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Tipo *</label>
                <select value={projType} onChange={e => setProjType(e.target.value as any)}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="interno">Interno</option>
                  <option value="externo">Externo (CRM)</option>
                </select>
              </div>

              {projType === 'externo' && (
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Cliente CRM *</label>
                  <select value={projClientId} onChange={e => setProjClientId(e.target.value)}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                    <option value="">Selecionar Cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.companyName || 'Sem Empresa'})</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4 justify-end">
                <button onClick={() => setShowProjModal(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold">Cancelar</button>
                <button onClick={handleCreateProject} disabled={savingProj || !projName || (projType === 'externo' && !projClientId)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  Criar Projeto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-lg">Nova Etapa</h3>
              <button onClick={() => setShowStageModal(false)}><span className="material-symbols-outlined text-text-sub">close</span></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Nome da Etapa *</label>
                <input type="text" value={stageName} onChange={e => setStageName(e.target.value)} placeholder="Ex: Design UI/UX"
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Descrição</label>
                <textarea value={stageDesc} onChange={e => setStageDesc(e.target.value)} placeholder="Descrição dos entregáveis..." rows={2}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Início *</label>
                  <input type="date" value={stageStart} onChange={e => setStageStart(e.target.value)}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Entrega *</label>
                  <input type="date" value={stageDue} onChange={e => setStageDue(e.target.value)}
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Relevância (1 a 5) *</label>
                <select value={stageRelevance} onChange={e => setStageRelevance(e.target.value)}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <p className="text-[10px] text-text-sub mt-1">Define os pontos de XP da etapa (Relevância × 20 XP).</p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Objetivos (Um por linha)</label>
                <textarea value={stageObjectivesInput} onChange={e => setStageObjectivesInput(e.target.value)} placeholder="Criar wireframes&#10;Aprovar layout com cliente&#10;Exportar assets" rows={3}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>

              <div className="flex gap-3 pt-4 justify-end">
                <button onClick={() => setShowStageModal(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold">Cancelar</button>
                <button onClick={handleCreateStage} disabled={savingStage || !stageName || !stageStart || !stageDue} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  Criar Etapa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Report / Conclude Project Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-lg">Relatório de Conclusão do Projeto</h3>
              <button onClick={() => setShowReportModal(false)}><span className="material-symbols-outlined text-text-sub">close</span></button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-3 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  Por favor, reveja os objetivos abaixo. Cada objetivo marcado como &quot;Não Atingido&quot; (desmarcado) resultará numa dedução de <strong>-20 XP</strong>.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Resumo da Conclusão *</label>
                <textarea value={reportSummary} onChange={e => setReportSummary(e.target.value)} placeholder="Descreva os resultados, o que correu bem e o que pode melhorar..." rows={3}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-2 block font-black">Estado de Sucesso dos Objetivos</label>
                {reportObjectives.length === 0 ? (
                  <p className="text-xs text-text-sub">Nenhum objetivo para rever.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 border border-gray-100 dark:border-zinc-800 rounded-xl p-3">
                    {reportObjectives.map((obj, index) => (
                      <div key={index} className="flex items-start gap-2 justify-between py-1 border-b border-gray-50 dark:border-zinc-850 last:border-0">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-bold truncate">{obj.text}</p>
                          <p className="text-[9px] text-text-sub">{obj.stageName}</p>
                        </div>
                        <button type="button" onClick={() => handleToggleReportObjective(index)}
                          className={`text-[10px] font-black px-2 py-1 rounded-md uppercase shrink-0 transition-all ${obj.completed ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                          {obj.completed ? 'Atingido' : 'Não Atingido'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-text-sub">Dedução estimada:</span>
                <span className="font-black text-red-500">-{reportObjectives.filter(o => !o.completed).length * 20} XP</span>
              </div>

              <div className="flex gap-3 pt-4 justify-end">
                <button onClick={() => setShowReportModal(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold">Cancelar</button>
                <button onClick={handleSubmitReport} disabled={savingReport || !reportSummary} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-green-700 transition-all">
                  Submeter Relatório
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
