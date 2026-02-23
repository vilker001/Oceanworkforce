import React, { useState, useMemo } from 'react';
import { CalendarEvent, EventType, Task } from '../../types';

interface CalendarProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  tasks: Task[];
  userRole?: string;
  onDeleteEvent?: (id: string) => Promise<void>;
}

const eventStyles: Record<EventType | 'Deadline', string> = {
  'Reunião': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Feriado': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  'Folga': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  'Geral': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  'Deadline': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 shadow-sm'
};

const eventIcons: Record<EventType | 'Deadline', string> = {
  'Reunião': 'groups',
  'Feriado': 'flag',
  'Folga': 'beach_access',
  'Geral': 'event_available',
  'Deadline': 'assignment_return'
};

export const Calendar: React.FC<CalendarProps> = ({ events, onAddEvent, tasks, userRole, onDeleteEvent }) => {
  // Calendar is now open to all authenticated users
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Default to Jan 2026
  const [filters, setFilters] = useState({ tasks: true, events: true });
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    type: 'Geral' as EventType,
    description: ''
  });

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, month: 'prev', date: new Date(year, month - 1, daysInPrevMonth - i) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: 'current', date: new Date(year, month, i) });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: 'next', date: new Date(year, month + 1, i) });
    }

    return days;
  }, [currentDate]);

  const allItems = useMemo(() => {
    const merged: any[] = [];

    if (filters.events) {
      merged.push(...events.map(e => ({ ...e, isTask: false })));
    }

    if (filters.tasks) {
      merged.push(...tasks.map(t => ({
        id: `task-${t.id}`,
        title: `ENTREGA: ${t.title}`,
        date: t.dueDate,
        type: 'Deadline',
        description: `Projeto: ${t.project} | Resp: ${t.responsible}`,
        isTask: true,
        responsible: t.responsible
      })));
    }

    return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, tasks, filters]);

  const handleDateClick = (dateStr: string) => {
    setNewEvent(prev => ({ ...prev, date: dateStr }));
    setIsModalOpen(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const event: Omit<CalendarEvent, 'id'> = {
      ...newEvent
    };
    try {
      await onAddEvent(event);
      setIsModalOpen(false);
      setNewEvent({ title: '', date: '', type: 'Geral', description: '' });
    } catch (err) {
      alert('Erro ao agendar compromisso.');
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-10 overflow-hidden">
      {/* Header Fixo */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="size-8 rounded-lg bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button onClick={() => changeMonth(1)} className="size-8 rounded-lg bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </h2>
          <p className="text-text-sub text-sm">Eventos corporativos e prazos de projetos sincronizados.</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Filters */}
          <div className="hidden md:flex items-center bg-gray-100/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl gap-2">
            <button
              onClick={() => setFilters(f => ({ ...f, events: !f.events }))}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filters.events ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-text-sub opacity-50'}`}
            >Eventos</button>
            <button
              onClick={() => setFilters(f => ({ ...f, tasks: !f.tasks }))}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filters.tasks ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-text-sub opacity-50'}`}
            >Tarefas</button>
          </div>

          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-sub'}`}>
              <span className="material-symbols-outlined text-sm">calendar_view_month</span>
            </button>
            <button onClick={() => setViewMode('timeline')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'timeline' ? 'bg-primary text-white' : 'text-text-sub'}`}>
              <span className="material-symbols-outlined text-sm">reorder</span>
            </button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg">
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </div>

      {/* Área de Scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {viewMode === 'grid' ? (
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-xl mb-4">
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
              {weekdays.map(day => (
                <div key={day} className="py-4 px-4 text-[10px] font-black text-text-sub uppercase tracking-widest text-center">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarData.map((item, i) => {
                const dateStr = item.date.toISOString().split('T')[0];
                const dayItems = allItems.filter(e => e.date === dateStr);
                const isToday = new Date().toDateString() === item.date.toDateString();
                const isOffMonth = item.month !== 'current';

                return (
                  <div
                    key={i}
                    onClick={() => handleDateClick(dateStr)}
                    className={`border-r border-b border-gray-100 dark:border-zinc-800 p-3 flex flex-col gap-2 min-h-[140px] transition-all cursor-pointer ${isOffMonth ? 'bg-gray-50/20 dark:bg-zinc-800/5 opacity-40' : 'hover:bg-primary/5'}`}
                  >
                    <span className={`text-xs font-black size-7 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-primary text-white shadow-lg rotate-3' : 'text-text-sub'}`}>
                      {item.day}
                    </span>

                    <div className="flex flex-col gap-1.5">
                      {dayItems.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.isTask) {
                              // Find the original task object
                              const taskId = item.id.replace('task-', '');
                              const task = tasks.find(t => t.id === taskId);
                              if (task) {
                                setSelectedTask(task);
                                setIsTaskDetailOpen(true);
                              }
                            } else {
                              // It's an event
                              setSelectedEvent(item);
                              setIsEventDetailOpen(true);
                            }
                          }}
                          className={`px-2 py-1.5 rounded-xl border-l-4 text-[9px] font-black transition-all hover:scale-105 cursor-pointer ${eventStyles[item.type as keyof typeof eventStyles]}`}
                          title={item.description}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[12px]">{eventIcons[item.type as keyof typeof eventStyles]}</span>
                            <span className="truncate">{item.isTask ? item.title.replace('ENTREGA: ', '') : item.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pl-10 relative before:absolute before:left-5 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-100 dark:before:bg-zinc-800">
            {allItems.map((item, idx) => (
              <div key={idx} className="relative group">
                <div className={`absolute -left-[30px] top-1/2 -translate-y-1/2 size-5 rounded-full border-4 border-white dark:border-zinc-950 z-10 transition-all group-hover:scale-125 ${item.type === 'Deadline' ? 'bg-purple-500 animate-pulse' :
                  item.type === 'Reunião' ? 'bg-blue-500' :
                    item.type === 'Feriado' ? 'bg-red-500' : 'bg-emerald-500'
                  }`}></div>

                <div
                  className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all flex justify-between items-center group/card cursor-pointer"
                  onClick={() => {
                    if (item.isTask) {
                      const taskId = item.id.replace('task-', '');
                      const task = tasks.find(t => t.id === taskId);
                      if (task) {
                        setSelectedTask(task);
                        setIsTaskDetailOpen(true);
                      }
                    } else {
                      setSelectedEvent(item);
                      setIsEventDetailOpen(true);
                    }
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                        {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${eventStyles[item.type as keyof typeof eventStyles]}`}>
                        {item.type}
                      </span>
                    </div>
                    <h4 className="text-base font-black group-hover/card:text-primary transition-colors">{item.title}</h4>
                    <p className="text-xs text-text-sub mt-2 font-medium">{item.description}</p>
                    {!item.isTask && item.creatorName && (
                      <p className="text-[10px] text-text-sub mt-2 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">person</span>
                        Por: {item.creatorName}
                      </p>
                    )}
                  </div>
                  {item.isTask && (
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className="text-[9px] font-black text-text-sub uppercase tracking-wider">Responsável</span>
                      <div className="size-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-lg shadow-primary/20 rotate-3 transition-transform group-hover/card:rotate-0">
                        {item.responsible[0]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Novo Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleAddEvent} className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 flex flex-col gap-6">
            <h3 className="text-xl font-black flex items-center gap-2">Agendar Compromisso</h3>
            <div className="space-y-4">
              <input required className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" placeholder="Título" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" value={newEvent.type} onChange={e => setNewEvent({ ...newEvent, type: e.target.value as EventType })}>
                  <option>Reunião</option><option>Feriado</option><option>Folga</option><option>Geral</option>
                </select>
                <input required type="date" className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
              </div>
              <textarea className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" rows={3} placeholder="Descrição (opcional)" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} />
            </div>
            <button type="submit" className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Adicionar</button>
          </form>
        </div>
      )}

      {/* MODAL: Detalhes da Tarefa */}
      {isTaskDetailOpen && selectedTask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsTaskDetailOpen(false)}></div>
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-500">assignment_return</span>
                  {selectedTask.title}
                </h3>
                <p className="text-text-sub text-sm mt-1">Projeto: {selectedTask.project}</p>
              </div>
              <button onClick={() => setIsTaskDetailOpen(false)} className="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">Status</span>
                <p className="text-lg font-bold mt-1">{selectedTask.status}</p>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">Prioridade</span>
                <p className="text-lg font-bold mt-1">{selectedTask.priority}</p>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">Responsável</span>
                <p className="text-lg font-bold mt-1">{selectedTask.responsible}</p>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">Prazo</span>
                <p className="text-lg font-bold mt-1">{new Date(selectedTask.dueDate).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {selectedTask.objectives && selectedTask.objectives.length > 0 && (
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-text-sub mb-3">Objetivos</h4>
                <div className="space-y-2">
                  {selectedTask.objectives.map((obj, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
                      <span className={`material-symbols-outlined text-sm ${obj.completed ? 'text-green-500' : 'text-gray-400'}`}>
                        {obj.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span className={`text-sm ${obj.completed ? 'line-through text-text-sub' : ''}`}>{obj.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTask.completionReport && (
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-text-sub mb-2">Relatório de Conclusão</h4>
                <p className="text-sm bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">{selectedTask.completionReport}</p>
              </div>
            )}

            {selectedTask.managerFeedback && (
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-text-sub mb-2">Feedback do Gestor</h4>
                <p className="text-sm bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">{selectedTask.managerFeedback}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL: Detalhes do Evento */}
      {isEventDetailOpen && selectedEvent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsEventDetailOpen(false)}></div>
          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl p-8 flex flex-col gap-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <span className={`self-start px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${eventStyles[selectedEvent.type as keyof typeof eventStyles]}`}>
                  {selectedEvent.type}
                </span>
                <h3 className="text-2xl font-black">{selectedEvent.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {onDeleteEvent && (userRole === 'Gestor de Projectos' || userRole === 'Admin' || selectedEvent.creatorName === 'Me' || true) && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Tem certeza que deseja excluir este evento?')) {
                        await onDeleteEvent(selectedEvent.id);
                        setIsEventDetailOpen(false);
                      }
                    }}
                    className="size-10 rounded-xl hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors"
                    title="Excluir Evento"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                )}
                <button type="button" onClick={() => setIsEventDetailOpen(false)} className="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-sub block mb-1">Data</p>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined text-primary text-sm">event</span>
                  {new Date(selectedEvent.date).toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-sub block mb-1">Agendado Por</p>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined text-primary text-sm">person</span>
                  {selectedEvent.creatorName || 'Sistema'}
                </div>
              </div>
            </div>

            {selectedEvent.description && (
              <div className="bg-gray-50 dark:bg-zinc-800 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-sub block mb-2">Descrição</p>
                <p className="text-sm leading-relaxed">{selectedEvent.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
