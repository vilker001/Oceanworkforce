import React, { useState, useMemo, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarEvent, EventType, Task, TeamMember } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';

interface CalendarProps {
  events: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  tasks: Task[];
  userRole?: string;
  onDeleteEvent?: (id: string) => Promise<void>;
  team?: TeamMember[];
}

const eventStyles: Record<EventType | 'Deadline', string> = {
  'Reunião': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'Feriado': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  'Folga': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  'Geral': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  'Deadline': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 shadow-sm',
  'Etapa de Projeto': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  'Sessão de Foto': 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  'Tarefa': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800'
};

const MOZ_HOLIDAYS = [
  { month: 0, day: 1, title: 'Dia da Fraternidade Universal' },
  { month: 1, day: 3, title: 'Dia dos Heróis Moçambicanos' },
  { month: 3, day: 7, title: 'Dia da Mulher Moçambicana' },
  { month: 4, day: 1, title: 'Dia Internacional do Trabalhador' },
  { month: 5, day: 25, title: 'Dia da Independência Nacional' },
  { month: 8, day: 7, title: 'Dia da Vitória' },
  { month: 8, day: 25, title: 'Dia das Forças Armadas' },
  { month: 9, day: 4, title: 'Dia da Paz e Reconciliação' },
  { month: 11, day: 25, title: 'Dia da Família' }
];

const generateHolidays = (startYear: number, endYear: number): CalendarEvent[] => {
  const holidays: CalendarEvent[] = [];
  for (let year = startYear; year <= endYear; year++) {
    MOZ_HOLIDAYS.forEach(h => {
      const d = new Date(year, h.month, h.day);
      const isoDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      holidays.push({
        id: `feriado-${year}-${h.month}-${h.day}`,
        title: h.title,
        date: isoDate,
        type: 'Feriado',
        description: 'Feriado Nacional de Moçambique',
        creatorName: 'Sistema'
      });
    });
  }
  return holidays;
};

export const Calendar: React.FC<CalendarProps> = ({ events, onAddEvent, tasks, userRole, onDeleteEvent, team }) => {
  const { confirm } = useConfirm();
  const calendarRef = useRef<FullCalendar>(null);
  
  const MIN_DATE = new Date(2026, 2, 1);
  const MAX_DATE = new Date(2030, 11, 1);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTitle, setCurrentTitle] = useState('');
  const [filters, setFilters] = useState({ tasks: true, events: true });
  const [viewMode, setViewMode] = useState<'dayGridMonth' | 'multiMonthYear'>('dayGridMonth');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);

  const [newEvent, setNewEvent] = useState<Omit<CalendarEvent, 'id'>>({
    title: '',
    date: '',
    type: 'Folga',
    description: ''
  });
  const [selectedConvocados, setSelectedConvocados] = useState<string[]>([]);

  const holidays = useMemo(() => generateHolidays(MIN_DATE.getFullYear(), MAX_DATE.getFullYear()), [MIN_DATE, MAX_DATE]);

  const allItems = useMemo(() => {
    const merged: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filters.events) {
      merged.push(...events.map(e => ({ ...e, isTask: false })));
      merged.push(...holidays.map(e => ({ ...e, isTask: false })));
    }
    if (filters.tasks) {
      merged.push(...tasks.filter(t => {
        if (!t.dueDate) return false;
        if (t.status === 'Done') return false; // don't show completed tasks
        const due = new Date(t.dueDate);
        due.setHours(23, 59, 59, 999);
        return due >= today; // only future or today deadlines
      }).map(t => ({
        id: `task-${t.id}`,
        title: `ENTREGA: ${t.title}`,
        date: t.dueDate,
        type: 'Deadline',
        description: `Projeto: ${t.project} | Resp: ${t.responsible}`,
        isTask: true,
        taskData: t
      })));
    }
    return merged;
  }, [events, tasks, holidays, filters]);

  // FullCalendar format
  const fcEvents = useMemo(() => {
    return allItems.map(item => ({
      id: item.id,
      title: item.title,
      start: item.date,
      allDay: true,
      extendedProps: { ...item }
    }));
  }, [allItems]);

  // Update title initially and on view change
  useEffect(() => {
    if (calendarRef.current) {
      setCurrentTitle(calendarRef.current.getApi().view.title);
    }
  }, [viewMode]);

  const handleDateClick = (info: any) => {
    setNewEvent(prev => ({ ...prev, date: info.dateStr }));
    setIsModalOpen(true);
  };

  const handleEventClick = (info: any) => {
    const props = info.event.extendedProps;
    if (props.isTask) {
      setSelectedTask(props.taskData);
      setIsTaskDetailOpen(true);
    } else {
      setSelectedEvent(props as CalendarEvent);
      setIsEventDetailOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEvent.title && newEvent.date) {
      try {
        let finalDescription = newEvent.description || '';
        if (selectedConvocados.length > 0) {
          const convocadosText = `\n\nConvocados:\n- ${selectedConvocados.join('\n- ')}`;
          finalDescription += convocadosText;
        }
        await onAddEvent({ ...newEvent, description: finalDescription.trim() });
        setIsModalOpen(false);
        setNewEvent({ title: '', date: '', type: 'Folga', description: '' });
        setSelectedConvocados([]);
      } catch (err) {
        alert('Erro ao agendar compromisso.');
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (onDeleteEvent) {
      const ok = await confirm('Apagar Evento', 'Tem a certeza que deseja apagar este evento?');
      if (ok) {
        await onDeleteEvent(id);
        setIsEventDetailOpen(false);
      }
    }
  };

  const handlePrev = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.prev();
      setCurrentTitle(api.view.title);
    }
  };

  const handleNext = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.next();
      setCurrentTitle(api.view.title);
    }
  };

  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.today();
      setCurrentTitle(api.view.title);
    }
  };

  const changeViewMode = (mode: 'dayGridMonth' | 'multiMonthYear') => {
    setViewMode(mode);
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(mode);
      setCurrentTitle(api.view.title);
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const type = eventInfo.event.extendedProps.type as EventType | 'Deadline';
    const styleClass = eventStyles[type] || 'bg-gray-100 text-gray-700';
    return (
      <div className={`w-full overflow-hidden truncate px-1.5 py-1 rounded-md text-[10px] font-bold ${styleClass}`} title={eventInfo.event.title}>
        {eventInfo.event.title}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-10 overflow-hidden">
      {/* Header Fixo */}
      <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-4 capitalize">
            {currentTitle || "Calendário"}
            <div className="flex gap-1 ml-2">
              <button onClick={handlePrev} className="size-8 rounded-lg bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center hover:bg-gray-50 transition-all">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button onClick={handleToday} className="px-3 rounded-lg bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center hover:bg-gray-50 transition-all text-xs font-bold text-text-sub">
                Hoje
              </button>
              <button onClick={handleNext} className="size-8 rounded-lg bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center hover:bg-gray-50 transition-all">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </h2>
          <p className="text-text-sub text-sm">Eventos corporativos e prazos de projetos sincronizados.</p>
        </div>

        <div className="flex items-center gap-4">
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
            <button onClick={() => changeViewMode('dayGridMonth')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'dayGridMonth' ? 'bg-primary text-white' : 'text-text-sub'}`}>
              Mês
            </button>
            <button onClick={() => changeViewMode('multiMonthYear')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'multiMonthYear' ? 'bg-primary text-white' : 'text-text-sub'}`}>
              Ano Inteiro
            </button>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg">
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>
      </div>

      {/* Calendário FullCalendar */}
      <div className="flex-1 overflow-auto bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-6 shadow-xl relative fullcalendar-wrapper">
        {/* Usamos CSS global ou inline para remover os botões default do fullcalendar */}
        <style>{`
          .fc-header-toolbar { display: none !important; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: #f3f4f6; }
          .dark .fc-theme-standard td, .dark .fc-theme-standard th { border-color: #27272a; }
          .fc .fc-daygrid-day-number { color: #6b7280; font-size: 0.8rem; font-weight: bold; }
          .fc .fc-col-header-cell-cushion { color: #9ca3af; text-transform: uppercase; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.05em; padding: 12px 0; }
          .fc .fc-day-today { background-color: rgba(59, 130, 246, 0.05) !important; }
          .fc-event { border: none !important; background: transparent !important; margin: 1px 2px !important; }
          .fc-multimonth-month { margin-bottom: 2rem !important; padding: 0 1rem; }
          .fc-multimonth-title { font-size: 1.1rem; font-weight: 900; color: #1f2937; margin-bottom: 0.5rem; text-transform: capitalize; }
          .dark .fc-multimonth-title { color: #e5e7eb; }
        `}</style>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView={viewMode}
          events={fcEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          locale="pt-br"
          height="auto"
          contentHeight="auto"
          dayMaxEvents={3}
        />
      </div>

      {/* Modais */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Novo Evento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Título</label>
                <input type="text" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Data</label>
                  <input type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Tipo</label>
                  <select value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as EventType})} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none">
                    <option value="Reunião">Reunião</option>
                    <option value="Folga">Folga</option>
                    <option value="Etapa de Projeto">Etapa de Projeto</option>
                    <option value="Sessão de Foto">Sessão de Foto</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-sub uppercase mb-1 block">Descrição (Opcional)</label>
                <textarea rows={3} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"></textarea>
              </div>
              
              {team && team.length > 0 && (
                <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 mt-2">
                  <label className="text-[10px] font-bold text-text-sub uppercase mb-2 block">Convocados (Opcional)</label>
                  <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                    {team.map(member => (
                      <label key={member.id} className="flex items-center gap-2 text-xs p-1 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-primary focus:ring-primary/20"
                          checked={selectedConvocados.includes(member.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedConvocados(prev => [...prev, member.name]);
                            } else {
                              setSelectedConvocados(prev => prev.filter(n => n !== member.name));
                            }
                          }}
                        />
                        <span className="font-semibold">{member.name}</span>
                        <span className="text-[9px] text-text-sub bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{member.role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100 dark:border-zinc-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-text-sub hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-primary text-white text-sm font-black uppercase rounded-xl shadow-lg hover:scale-105 transition-transform">Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEventDetailOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setIsEventDetailOpen(false)} className="absolute top-6 right-6 size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-text-sub hover:text-red-500 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl ${eventStyles[selectedEvent.type] || 'bg-gray-100 text-gray-700'}`}>
                <span className="material-symbols-outlined">event</span>
              </div>
              <div>
                <h3 className="text-xl font-black">{selectedEvent.title}</h3>
                <span className="text-xs font-bold text-text-sub uppercase">{selectedEvent.type}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-text-sub bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                <span className="material-symbols-outlined text-lg text-primary">calendar_month</span>
                <span className="font-bold">{new Date(selectedEvent.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              {selectedEvent.description && (
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.creatorName && (
                <div className="text-xs text-text-sub text-right">Criado por: {selectedEvent.creatorName}</div>
              )}
              {selectedEvent.type !== 'Feriado' && onDeleteEvent && (
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                  <button onClick={() => handleDeleteEvent(selectedEvent.id)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span> Apagar Evento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isTaskDetailOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setIsTaskDetailOpen(false)} className="absolute top-6 right-6 size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-text-sub hover:text-red-500 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-purple-100 text-purple-700">
                <span className="material-symbols-outlined">assignment_return</span>
              </div>
              <div>
                <h3 className="text-xl font-black line-clamp-1">{selectedTask.title}</h3>
                <span className="text-xs font-bold text-text-sub uppercase">Deadline de Tarefa</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-text-sub bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                <span className="material-symbols-outlined text-lg text-primary">domain</span>
                <span className="font-bold">{selectedTask.project}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-sub bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
                <span className="material-symbols-outlined text-lg text-primary">person</span>
                <span className="font-bold">{selectedTask.responsible}</span>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
                <button onClick={() => setIsTaskDetailOpen(false)} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
