import React, { useState } from 'react';
import { Task } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';

interface KanbanProps {
  tasks: Task[];
  onTaskCreate: (task: Omit<Task, 'id'>) => Promise<void>;
  onTaskUpdate: (id: string, updates: Partial<Task>) => Promise<void>;
  onTaskDelete: (id: string) => Promise<void>;
  userRole?: string;
  currentUser: { name: string, avatar: string };
  team: any[];
}

export const Kanban: React.FC<KanbanProps> = ({ tasks, onTaskCreate, onTaskUpdate, onTaskDelete, userRole, currentUser, team }) => {
  const allTeamMembers = Array.from(new Map([...team, currentUser].map(m => [m.name, m])).values());

  const isAnyManager = [
    'Gestor de Projectos',
    'Gestor Criativo',
    'Gestor de Parceiros e Clientes',
    'Gestor de Trading e Negociação'
  ].includes(userRole || '');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    title: '',
    project: '',
    priority: 'MÉDIA' as Task['priority'],
    responsible: currentUser.name,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    objectives: [''] // Inicia com um campo vazio
  });

  const columns: Task['status'][] = ['Backlog', 'ToDo', 'InProgress', 'Review', 'Done'];

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const validObjectives = newTask.objectives
      .filter(o => o.trim() !== '')
      .map(o => ({ text: o, completed: false }));

    const task: Omit<Task, 'id'> = {
      title: newTask.title,
      project: newTask.project,
      status: 'Backlog',
      priority: newTask.priority,
      responsible: newTask.responsible,
      startDate: newTask.startDate,
      dueDate: newTask.dueDate,
      objectives: validObjectives
    };

    await onTaskCreate(task);
    setIsModalOpen(false);
    setNewTask({
      title: '',
      project: '',
      priority: 'MÉDIA',
      responsible: allTeamMembers[0].name,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      objectives: ['']
    });
  };

  const addObjectiveField = () => {
    setNewTask(prev => ({ ...prev, objectives: [...prev.objectives, ''] }));
  };

  const removeObjectiveField = (index: number) => {
    setNewTask(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };

  const updateObjectiveValue = (index: number, value: string) => {
    const updated = [...newTask.objectives];
    updated[index] = value;
    setNewTask(prev => ({ ...prev, objectives: updated }));
  };

  const priorityColors = {
    'BAIXA': 'bg-gray-100 text-gray-600',
    'MÉDIA': 'bg-blue-50 text-blue-600',
    'ALTA': 'bg-orange-50 text-orange-600',
    'CRÍTICA': 'bg-red-50 text-red-600'
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Fluxo de Trabalho Operacional</h2>
          <p className="text-text-sub text-sm">Controle de qualidade e delegação de objetivos.</p>
        </div>
        <button
          onClick={() => isAnyManager ? setIsModalOpen(true) : alert("penas Gestores podem delegar e criar novas tarefas.")}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${isAnyManager ? 'bg-primary text-white shadow-primary/20 hover:scale-105' : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-60'}`}
        >
          <span className="material-symbols-outlined text-lg">{isAnyManager ? 'add_circle' : 'lock'}</span> Nova Tarefa
        </button>
      </div>

      <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-6 -mx-4 lg:-mx-8 px-4 lg:px-8 no-scrollbar h-full min-h-[500px] lg:min-h-[600px] items-start">
        {columns.map(col => (
          <div key={col} className="flex flex-col gap-4 min-w-[280px] w-[280px] lg:min-w-[320px] lg:w-[320px] shrink-0">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-text-sub flex items-center gap-2">
                <span className={`size-2 rounded-full shadow-sm ${col === 'Done' ? 'bg-green-500 shadow-green-500/20' :
                  col === 'InProgress' ? 'bg-primary shadow-primary/20' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}></span>
                {col}
              </h3>
              <span className="bg-gray-100 dark:bg-zinc-800/50 text-text-sub px-2.5 py-1 rounded-full text-[10px] font-black">
                {tasks.filter(t => t.status === col).length}
              </span>
            </div>
            <div className="flex-1 bg-gray-50/50 dark:bg-zinc-900/10 p-2.5 rounded-[2rem] flex flex-col gap-3 min-h-[400px] border border-gray-100 dark:border-zinc-800/30">
              {tasks.filter(t => t.status === col).map(task => (
                <div
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
                  className="bg-white dark:bg-zinc-900/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${task.priority === 'CRÍTICA' ? 'bg-red-500' :
                    task.priority === 'ALTA' ? 'bg-orange-500' :
                      task.priority === 'MÉDIA' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>

                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-bold text-text-sub">#{task.id}</span>
                  </div>

                  <h4 className="text-sm font-black mb-1 leading-snug group-hover:text-primary transition-colors">{task.title}</h4>
                  <p className="text-[10px] text-text-sub uppercase font-black tracking-widest mb-4 opacity-70">{task.project}</p>

                  <div className="flex items-center gap-2 mb-4 bg-gray-50/50 dark:bg-zinc-800/30 p-2 rounded-xl border border-gray-100/50 dark:border-zinc-800/20">
                    <span className="material-symbols-outlined text-sm text-text-sub">event</span>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-text-sub uppercase tracking-tighter">Início: {formatDate(task.startDate)}</span>
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Deadline: {formatDate(task.dueDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <img src={allTeamMembers.find(m => m.name === task.responsible)?.avatar || DEFAULT_AVATAR} className="size-6 rounded-lg object-cover" alt="" />
                      <span className="text-[10px] font-bold truncate max-w-[80px]">{task.responsible}</span>
                    </div>
                    {task.objectives.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                        <span className="material-symbols-outlined text-xs text-primary filled">check_circle</span>
                        <span className="text-[10px] font-black text-text-sub">
                          {task.objectives.filter(o => o.completed).length}/{task.objectives.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.status === col).length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                  <span className="material-symbols-outlined text-3xl mb-1">inventory_2</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Vazio</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleCreateTask} className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black">Nova Entrega Estratégica</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Título da Tarefa</label>
                <input required className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="Ex: Campanha de Tráfego Pago" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Projeto / Cliente</label>
                <input required className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="Ex: Ocean Corp" value={newTask.project} onChange={e => setNewTask({ ...newTask, project: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Data de Início</label>
                <input type="date" required className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider text-red-500">Prazo de Entrega (Deadline)</label>
                <input type="date" required className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary font-bold text-red-600 dark:text-red-400" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Prioridade</label>
                <select className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}>
                  <option>BAIXA</option><option>MÉDIA</option><option>ALTA</option><option>CRÍTICA</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Responsável Direto</label>
                <select className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" value={newTask.responsible} onChange={e => setNewTask({ ...newTask, responsible: e.target.value })}>
                  {allTeamMembers.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {/* Seção de Objetivos Reintroduzida */}
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-2">
                <label className="text-[10px] font-bold text-text-sub uppercase tracking-wider">Objetivos e Critérios de Aceitação</label>
                <button type="button" onClick={addObjectiveField} className="text-primary flex items-center gap-1 text-[10px] font-black hover:underline uppercase">
                  <span className="material-symbols-outlined text-xs">add</span> Adicionar Item
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {newTask.objectives.map((obj, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="flex-1 bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary"
                      placeholder={`Objetivo #${index + 1}`}
                      value={obj}
                      onChange={e => updateObjectiveValue(index, e.target.value)}
                    />
                    {newTask.objectives.length > 1 && (
                      <button type="button" onClick={() => removeObjectiveField(index)} className="text-text-sub hover:text-red-500 px-2 transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all mt-4">
              Ativar Fluxo de Trabalho
            </button>
          </form>
        </div>
      )}
      {/* Modal Detalhes da Tarefa */}
      {isDetailOpen && selectedTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDetailOpen(false)}></div>
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-8 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black">{selectedTask.title}</h3>
                <p className="text-xs text-text-sub font-bold uppercase tracking-widest">{selectedTask.project}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Botão de Excluir (Apenas GP ou Criador deveria ter acesso, mas por enquanto validamos se é Gerente) */}
                {isAnyManager && (
                  <button
                    onClick={async () => {
                      if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                        await onTaskDelete(selectedTask.id);
                        setIsDetailOpen(false);
                      }
                    }}
                    className="size-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors"
                    title="Excluir Tarefa"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                )}
                <button onClick={() => setIsDetailOpen(false)} className="size-8 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-100 dark:border-zinc-800">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Responsável</label>
                <div className="flex items-center gap-2">
                  <img src={allTeamMembers.find(m => m.name === selectedTask.responsible)?.avatar || DEFAULT_AVATAR} className="size-6 rounded-lg object-cover" alt="" />
                  <span className="text-xs font-bold">{selectedTask.responsible}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Prazo Final</label>
                <div className="flex items-center gap-2 text-red-500">
                  <span className="material-symbols-outlined text-sm">event</span>
                  <span className="text-xs font-black">{formatDate(selectedTask.dueDate)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold text-text-sub uppercase">Alterar Status do Fluxo</label>
              <div className="grid grid-cols-5 gap-1">
                {columns.map(status => {
                  const isCurrent = selectedTask.status === status;
                  const canChange = userRole === 'Gestor de Projectos' || selectedTask.responsible === currentUser.name;

                  return (
                    <button
                      key={status}
                      disabled={!canChange}
                      onClick={async () => {
                        await onTaskUpdate(selectedTask.id, { status });
                        setSelectedTask({ ...selectedTask, status });
                      }}
                      className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all border ${isCurrent
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-gray-50 dark:bg-zinc-800 border-transparent text-text-sub hover:border-primary/30'
                        } ${!canChange && 'opacity-30 cursor-not-allowed'}`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
              {!(userRole === 'Gestor de Projectos' || selectedTask.responsible === currentUser.name) && (
                <p className="text-[9px] text-red-500 font-bold italic">* Apenas o GP ou o responsável podem mudar o status.</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-text-sub uppercase">Objetivos da Entrega</label>
              <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                {selectedTask.objectives.map((obj, idx) => (
                  <div key={idx}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-800/20 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                    onClick={async () => {
                      if (selectedTask.responsible === currentUser.name || isAnyManager) {
                        const newObjectives = [...selectedTask.objectives];
                        newObjectives[idx] = { ...obj, completed: !obj.completed };
                        await onTaskUpdate(selectedTask.id, { objectives: newObjectives });
                        setSelectedTask({ ...selectedTask, objectives: newObjectives });
                      }
                    }}
                  >
                    <span className={`material-symbols-outlined text-sm ${obj.completed ? 'text-green-500' : 'text-gray-300'}`}>
                      {obj.completed ? 'check_circle' : 'circle'}
                    </span>
                    <span className={`text-[11px] font-medium ${obj.completed ? 'line-through opacity-50' : ''}`}>{obj.text}</span>
                  </div>
                ))}
              </div>
              {(selectedTask.responsible === currentUser.name || isAnyManager) && (
                <p className="text-[9px] text-text-sub italic text-right">Clique no objetivo para marcar como concluído.</p>
              )}
            </div>

            {/* SEÇÃO DE FEEDBACK E RELATÓRIO */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              {/* Relatório de Conclusão (Preenchido pelo Responsável) */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-text-sub uppercase">Relatório de Conclusão (Opcional)</label>
                <textarea
                  className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-xs w-full"
                  rows={2}
                  placeholder="Descreva brevemente o que foi feito..."
                  value={selectedTask.completionReport || ''}
                  disabled={selectedTask.responsible !== currentUser.name}
                  onBlur={async (e) => {
                    if (selectedTask.responsible === currentUser.name) {
                      await onTaskUpdate(selectedTask.id, { completionReport: e.target.value });
                    }
                  }}
                  onChange={(e) => setSelectedTask({ ...selectedTask, completionReport: e.target.value })}
                />
              </div>

              {/* Feedback do Gestor (Apenas Gestores) */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-text-sub uppercase flex items-center gap-2">
                  Feedback do Gestor
                  <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-[8px]">Gestores</span>
                </label>
                <textarea
                  className="bg-purple-50 dark:bg-purple-900/10 border-none rounded-xl p-3 text-xs w-full text-purple-900 dark:text-purple-100"
                  rows={2}
                  placeholder="Feedback e aprovação do gestor..."
                  value={selectedTask.managerFeedback || ''}
                  disabled={!isAnyManager}
                  onBlur={async (e) => {
                    if (isAnyManager) {
                      await onTaskUpdate(selectedTask.id, { managerFeedback: e.target.value });
                    }
                  }}
                  onChange={(e) => setSelectedTask({ ...selectedTask, managerFeedback: e.target.value })}
                />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
