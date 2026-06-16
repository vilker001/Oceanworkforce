import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';
import { Client, ClientStatus, User, FollowUp } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';

const availableServices = [
  'Gestão de mídia',
  'Website',
  'E-commerce',
  'Automação de redes sociais',
  'Produção de conteúdo'
];

const provenanceOptions = [
  'Redes Sociais',
  'Google',
  'Andando pela cidade',
  'Recomendação',
  'Outro'
];

const statusConfig: Record<ClientStatus, { color: string, bg: string }> = {
  'Novo Lead': { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-zinc-800' },
  'Em Contacto': { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  'Proposta Enviada': { color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  'Consultoria Marcada': { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  'Convertido': { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' },
  'Repescagem': { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  'Perdido': { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40' }
};

interface ClientsProps {
  user: User,
  team: any[],
  clients: Client[],
  onAddClient: (client: Omit<Client, 'id'>) => Promise<void>;
  onUpdateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  error?: string | null;
}

export const Clients: React.FC<ClientsProps> = ({ user, team, clients, onAddClient, onUpdateClient, onDeleteClient, error }) => {
  const allTeamMembers = Array.from(new Map([...team, { name: user.name, avatar: user.avatar }].map(m => [m.name, m])).values());
  const { confirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'Todos' | 'Pendentes'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyPhone: '',
    companyName: '',
    businessValue: '',
    nextFollowUpDate: '',
    internalContact: '',
    internalContactPhone: '',
    internalContactRole: '',
    responsible: '',
    services: [] as string[],
    location: 'Maputo Cidade' as Client['location'],
    provenance: 'Outro' as Client['provenance']
  });

  // Follow Ups States
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [newFollowUpNotes, setNewFollowUpNotes] = useState('');
  const [newFollowUpStage, setNewFollowUpStage] = useState<ClientStatus>('Novo Lead');
  const [newFollowUpNextDate, setNewFollowUpNextDate] = useState('');
  const [newFollowUpAdvances, setNewFollowUpAdvances] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const fetchFollowUps = async (clientId: string) => {
    setLoadingFollowUps(true);
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setFollowUps(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFollowUps(false);
    }
  };

  useEffect(() => {
    if (isDetailModalOpen && selectedClient) {
      fetchFollowUps(selectedClient.id);
      setNewFollowUpStage(selectedClient.status);
      setNewFollowUpNotes('');
      setNewFollowUpNextDate('');
      setNewFollowUpAdvances(false);
    }
  }, [isDetailModalOpen, selectedClient]);

  const filteredClients = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return clients.filter(c => {
      let matchStatus = false;
      if (filterStatus === 'Todos') matchStatus = true;
      else if (filterStatus === 'Pendentes') {
        matchStatus = !!c.nextFollowUpDate && c.nextFollowUpDate <= today && c.status !== 'Convertido' && c.status !== 'Perdido';
      } else {
        matchStatus = c.status === filterStatus;
      }

      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.companyName || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [clients, filterStatus, searchQuery]);

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const updateClientStatus = async (clientId: string, newStatus: ClientStatus) => {
    const client = clients.find(c => c.id === clientId);
    const isManager = ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading'].includes(user.role);
    const canUpdate = isManager || client?.responsible === user.name;

    if (!canUpdate) {
      alert("Apenas o responsável pelo Lead ou os Gestores podem alterar o estado.");
      return;
    }
    try {
      // Auto-schedule follow-up when status changes
      const addBusinessDays = (date: Date, days: number): Date => {
        let result = new Date(date);
        let added = 0;
        while (added < days) {
          result.setDate(result.getDate() + 1);
          const day = result.getDay();
          if (day !== 0 && day !== 6) added++;
        }
        return result;
      };

      // Days to next follow-up by status
      const followUpDays: Partial<Record<ClientStatus, number>> = {
        'Em Contacto': 2,
        'Proposta Enviada': 3,
        'Consultoria Marcada': 1,
        'Repescagem': 7,
      };

      const daysToAdd = followUpDays[newStatus];
      const nextFollowUpDate = daysToAdd
        ? addBusinessDays(new Date(), daysToAdd).toISOString().split('T')[0]
        : client?.nextFollowUpDate;

      await onUpdateClient(clientId, {
        status: newStatus,
        lastActivity: `Estado alterado para ${newStatus}`,
        ...(nextFollowUpDate ? { nextFollowUpDate } : {})
      });

      // Insert auto follow-up record if status advances
      if (daysToAdd && client) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await supabase.from('follow_ups').insert({
          client_id: clientId,
          notes: `Estado alterado automaticamente para "${newStatus}". Follow-up agendado.`,
          current_stage: newStatus,
          advances_funnel: true,
          next_follow_up_date: nextFollowUpDate,
          created_by: authUser?.id
        } as any);
      }
    } catch (err) {
      alert('Erro ao atualizar estado.');
    }
  };

  const handleClaimLead = async (clientId: string) => {
    try {
      await onUpdateClient(clientId, { responsible: user.name, lastActivity: 'Assumiu o lead' });
    } catch (err) {
      alert('Erro ao assumir lead.');
    }
  };

  const handleOpenDetails = (client: Client) => {
    const isManager = ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading'].includes(user.role);
    const isResponsible = client.responsible === user.name;

    if (!isManager && !isResponsible && client.responsible) {
      alert('Apenas gestores ou o responsável pelo lead podem ver os detalhes completos.');
      return;
    }

    setSelectedClient(client);
    setIsDetailModalOpen(true);
  };

  const handleDeleteLead = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const isManager = ['Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading'].includes(user.role);
    const isResponsible = client?.responsible === user.name;

    if (!isManager && !isResponsible) {
      alert('Apenas gestores ou o responsável podem eliminar este lead.');
      return;
    }

    const ok = await confirm({ title: 'Eliminar Lead', message: `Tem a certeza que deseja eliminar o lead "${client?.name}"? Esta ação não pode ser desfeita.`, isDanger: true, confirmText: 'Eliminar' });
    if (ok) {
      try {
        await onDeleteClient(clientId);
        setIsDetailModalOpen(false);
      } catch (err) {
        alert('Erro ao eliminar lead.');
      }
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: 'Apagar Leads Selecionados',
      message: `Tens a certeza que desejas apagar ${selectedIds.size} lead(s) selecionado(s)? Esta ação é irreversível.`,
      isDanger: true,
      confirmText: `Apagar ${selectedIds.size} Lead(s)`
    });
    if (!ok) return;
    for (const id of Array.from(selectedIds)) {
      try { await onDeleteClient(id); } catch (e) { console.error(e); }
    }
    setSelectedIds(new Set());
    setIsBulkMode(false);
  };

  // Toggle single selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Toggle select all visible
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const leadsToExport = selectedIds.size > 0
      ? filteredClients.filter(c => selectedIds.has(c.id))
      : filteredClients;

    const headers = ['Nome do Decisor', 'Empresa', 'Email', 'Telef. Pessoal', 'Telef. Empresa', 'Estado', 'Valor (MT)', 'Responsável', 'Próximo Follow-Up', 'Serviços', 'Localização', 'Proveniente'];
    const rows = leadsToExport.map(c => [
      c.name,
      c.companyName || '',
      c.email,
      c.phone || '',
      c.companyPhone || '',
      c.status,
      c.businessValue?.toString() || '',
      c.responsible || '',
      c.nextFollowUpDate || '',
      (c.services || []).join('; '),
      c.location || '',
      c.provenance || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline_ocean_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Omit<Client, 'id'> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      companyPhone: formData.companyPhone || undefined,
      companyName: formData.companyName || undefined,
      businessValue: formData.businessValue ? parseFloat(formData.businessValue) : undefined,
      nextFollowUpDate: formData.nextFollowUpDate || undefined,
      status: 'Novo Lead',
      responsible: formData.responsible || '',
      lastActivity: 'Lead Registrado',
      initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      services: formData.services,
      location: formData.location,
      provenance: formData.provenance
    };

    try {
      await onAddClient(newClient);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      alert('Erro ao cadastrar lead.');
    }
  };

  const handleAddFollowUp = async () => {
    if (!selectedClient || !newFollowUpNotes) return;
    setSavingFollowUp(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      let nextDate = newFollowUpNextDate;
      if (!nextDate) {
        const addBusinessDays = (date: Date, days: number): Date => {
          let result = new Date(date);
          let added = 0;
          while (added < days) {
            result.setDate(result.getDate() + 1);
            const day = result.getDay();
            if (day !== 0 && day !== 6) {
              added++;
            }
          }
          return result;
        };
        nextDate = addBusinessDays(new Date(), 3).toISOString().split('T')[0];
      }

      const { error: insertErr } = await supabase
        .from('follow_ups')
        .insert({
          client_id: selectedClient.id,
          notes: newFollowUpNotes,
          current_stage: newFollowUpStage,
          advances_funnel: newFollowUpAdvances,
          next_follow_up_date: nextDate,
          created_by: authUser?.id
        } as any);

      if (insertErr) throw insertErr;

      await onUpdateClient(selectedClient.id, {
        status: newFollowUpStage,
        nextFollowUpDate: nextDate,
        lastActivity: newFollowUpNotes
      });

      await fetchFollowUps(selectedClient.id);
      setSelectedClient(prev => prev ? {
        ...prev,
        status: newFollowUpStage,
        nextFollowUpDate: nextDate,
        lastActivity: newFollowUpNotes
      } : null);
      
      setNewFollowUpNotes('');
      setNewFollowUpNextDate('');
      setNewFollowUpAdvances(false);
      alert('Follow-up registado com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao registar follow-up.');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      companyPhone: '',
      companyName: '',
      businessValue: '',
      nextFollowUpDate: '',
      internalContact: '',
      internalContactPhone: '',
      internalContactRole: '',
      responsible: '',
      services: [],
      location: 'Maputo Cidade',
      provenance: 'Outro'
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">CRM & Pipeline Comercial</h2>
          <p className="text-text-sub text-sm">Gestão de leads e clientes regionais em Maputo.</p>
          {error && <div className="mt-2 bg-red-100 text-red-600 p-2 text-xs font-bold rounded">ERRO NA BASE DE DADOS: {error}</div>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk action bar */}
          {isBulkMode && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-red-500/20 transition-all"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Apagar {selectedIds.size} Selecionado(s)
            </button>
          )}
          <button
            onClick={() => { setIsBulkMode(p => !p); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
              isBulkMode
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-text-sub hover:border-primary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-base">checklist</span>
            {isBulkMode ? 'Cancelar Seleção' : 'Selecionar'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all"
            title={selectedIds.size > 0 ? `Exportar ${selectedIds.size} selecionado(s)` : 'Exportar todos os leads visíveis'}
          >
            <span className="material-symbols-outlined text-base">download</span>
            {selectedIds.size > 0 ? `Exportar ${selectedIds.size}` : 'Exportar CSV'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-base">person_add</span> Novo Lead
          </button>
        </div>
      </div>

      {/* Funil de Status (Filtros Rápidos) */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar items-center">
        <button
          onClick={() => setFilterStatus('Pendentes')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border-2 flex items-center gap-1 ${filterStatus === 'Pendentes'
            ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:border-amber-400'
            }`}
        >
          <span className="material-symbols-outlined text-[14px]">notifications_active</span>
          Follow-ups Pendentes
          <span className="ml-2 bg-white/30 px-1.5 rounded text-[10px]">
            {clients.filter(c => !!c.nextFollowUpDate && c.nextFollowUpDate <= new Date().toISOString().split('T')[0] && c.status !== 'Convertido' && c.status !== 'Perdido').length}
          </span>
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1 shrink-0"></div>

        {(['Todos', 'Novo Lead', 'Em Contacto', 'Proposta Enviada', 'Consultoria Marcada', 'Convertido', 'Repescagem', 'Perdido'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border-2 ${filterStatus === status
              ? 'bg-primary border-primary text-white shadow-md'
              : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-text-sub hover:border-gray-200'
              }`}
          >
            {status}
            {status !== 'Todos' && <span className="ml-2 opacity-60">{clients.filter(c => c.status === status).length}</span>}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-800/20">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sub text-lg">search</span>
            <input
              type="text"
              placeholder="Procurar por nome, empresa ou email..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
              <tr className="text-[10px] uppercase font-bold text-text-sub tracking-widest">
                {isBulkMode && (
                  <th className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="size-4 rounded accent-primary cursor-pointer"
                      checked={selectedIds.size === filteredClients.length && filteredClients.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th className="px-6 py-4">Empresa / Contactos</th>
                <th className="px-6 py-4">Valor (MT)</th>
                <th className="px-6 py-4">Estado Funil</th>
                <th className="px-6 py-4">Seguimento (Follow-Up)</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className={`hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group ${
                    selectedIds.has(client.id) ? 'bg-primary/5 dark:bg-primary/10' : ''
                  }`}
                >
                  {isBulkMode && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="size-4 rounded accent-primary cursor-pointer"
                        checked={selectedIds.has(client.id)}
                        onChange={() => toggleSelect(client.id)}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs relative">
                        {client.initials}
                        {client.status === 'Convertido' && (
                          <span className="absolute -top-1 -right-1 size-4 bg-green-500 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[10px] text-white filled">check</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-bold">{client.name}</p>
                        {client.companyName && <p className="text-xs text-text-sub font-semibold">{client.companyName}</p>}
                        <p className="text-[10px] text-text-sub font-medium">{client.email} {client.phone ? `· ${client.phone}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-sm text-text-main dark:text-gray-200">
                    {client.businessValue ? `MT ${client.businessValue.toLocaleString('pt-MZ')}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block group/status">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusConfig[client.status].bg} ${statusConfig[client.status].color}`}>
                        {client.status}
                      </span>
                      {/* Quick Change Dropdown on Hover */}
                      <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-20">
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[160px]">
                          {(Object.keys(statusConfig) as ClientStatus[]).map(st => (
                            <button
                              key={st}
                              onClick={() => updateClientStatus(client.id, st)}
                              className={`text-[10px] font-bold text-left px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 ${client.status === st ? 'text-primary' : 'text-text-sub'}`}
                            >
                              Mudar para {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-text-sub">
                    {client.nextFollowUpDate ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-base">event</span>
                        {new Date(client.nextFollowUpDate).toLocaleDateString('pt-MZ')}
                      </span>
                    ) : 'Sem follow-up agendado'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {client.responsible ? (
                        <>
                          <div className="size-6 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[8px] font-bold">
                            {client.responsible[0]}
                          </div>
                          <span className="text-[11px] font-medium">{client.responsible}</span>
                        </>
                      ) : (
                        <button
                          onClick={() => handleClaimLead(client.id)}
                          className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">person_add</span> Assumir
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenDetails(client)}
                      className="text-primary hover:text-primary-dark font-black text-[11px] uppercase transition-colors inline-flex items-center gap-1"
                    >
                      Ver Detalhes <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClients.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
              <p className="text-sm font-bold text-text-sub">Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVO CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <form
            onSubmit={handleSubmit}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">Novo Prospecto comercial</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="material-symbols-outlined text-text-sub hover:text-red-500 transition-colors">close</button>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Identificação do Lead</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Nome Completo *</label>
                  <input required className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Carlos Matola" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Nome da Empresa (Opcional)</label>
                  <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Hotel Polana" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Email de Contacto *</label>
                  <input required type="email" className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="contacto@empresa.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">WhatsApp / Telefone</label>
                  <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="+258 84 XXX XXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase font-black">Valor Estimado do Negócio (MT)</label>
                  <input type="number" className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Valor em Meticais" value={formData.businessValue} onChange={e => setFormData({ ...formData, businessValue: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Primeiro Follow-Up (Opcional)</label>
                  <input type="date" className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" value={formData.nextFollowUpDate} onChange={e => setFormData({ ...formData, nextFollowUpDate: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Serviços e Distribuição</h4>
              <div className="flex flex-wrap gap-2">
                {availableServices.map(service => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border-2 ${formData.services.includes(service)
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'bg-gray-50 dark:bg-zinc-800 border-transparent text-text-sub'
                      }`}
                  >
                    {service}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Localização</label>
                  <select className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value as any })}>
                    <option>Maputo Cidade</option>
                    <option>Maputo Província</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Canal de Origem</label>
                  <select className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" value={formData.provenance} onChange={e => setFormData({ ...formData, provenance: e.target.value as any })}>
                    {provenanceOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Responsável Comercial</label>
                <select className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-bold" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })}>
                  <option value="">Sem Responsável (Aberto)</option>
                  {allTeamMembers.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.01] transition-all">
              Guardar Lead no Pipeline
            </button>
          </form>
        </div>
      )}

      {/* MODAL DETALHES DO LEAD & HISTÓRICO DE FOLLOW-UP */}
      {isDetailModalOpen && selectedClient && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setIsDetailModalOpen(false)}></div>

          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Details */}
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl">
                    {selectedClient.initials}
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{selectedClient.name}</h2>
                    {selectedClient.companyName && <p className="text-sm text-text-sub font-semibold">{selectedClient.companyName}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase ${statusConfig[selectedClient.status].color} ${statusConfig[selectedClient.status].bg}`}>
                  <span className="size-1.5 rounded-full bg-current animate-pulse"></span>
                  {selectedClient.status}
                </span>
                {selectedClient.businessValue && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
                    MT {selectedClient.businessValue.toLocaleString('pt-MZ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100/50 dark:border-zinc-800/30">
                  <p className="text-[10px] font-bold text-text-sub uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">mail</span> Email Principal</p>
                  <p className="text-xs font-bold truncate">{selectedClient.email}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100/50 dark:border-zinc-800/30">
                  <p className="text-[10px] font-bold text-text-sub uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">phone</span> Telefone</p>
                  <p className="text-xs font-bold">{selectedClient.phone || 'Não registado'}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100/50 dark:border-zinc-800/30">
                  <p className="text-[10px] font-bold text-text-sub uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span> Região</p>
                  <p className="text-xs font-bold">{selectedClient.location}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100/50 dark:border-zinc-800/30">
                  <p className="text-[10px] font-bold text-text-sub uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">share</span> Origem do Lead</p>
                  <p className="text-xs font-bold">{selectedClient.provenance}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-gray-100/50 dark:border-zinc-800/30">
                <p className="text-[10px] font-bold text-text-sub uppercase mb-2">Serviços de Interesse</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedClient.services.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase">{s}</span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLead(selectedClient.id)}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/10"
                >
                  <span className="material-symbols-outlined text-base">delete</span> Eliminar Lead
                </button>
              </div>
            </div>

            {/* Right Column: Follow-ups History & Form */}
            <div className="border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-zinc-800 pt-6 lg:pt-0 lg:pl-8 flex flex-col gap-6">
              <h3 className="font-black text-lg flex items-center gap-2 border-b border-gray-100 dark:border-zinc-850 pb-2">
                <span className="material-symbols-outlined text-primary">forum</span>
                Relatórios de Acompanhamento
              </h3>

              {/* Form to add a new follow up */}
              <div className="bg-gray-50 dark:bg-zinc-850 p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-text-sub">Registar Nova Atividade</p>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-text-sub uppercase">Notas do Relatório</label>
                  <textarea
                    rows={2}
                    className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-750 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Resumo do contacto (ex: Enviou email pedindo orçamento, agendou reunião...)"
                    value={newFollowUpNotes}
                    onChange={e => setNewFollowUpNotes(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-text-sub uppercase">Novo Estado</label>
                    <select
                      className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-750 rounded-xl p-2 text-xs outline-none"
                      value={newFollowUpStage}
                      onChange={e => setNewFollowUpStage(e.target.value as ClientStatus)}
                    >
                      {Object.keys(statusConfig).map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-text-sub uppercase">Próximo Contacto</label>
                    <input
                      type="date"
                      className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-750 rounded-xl p-2 text-xs outline-none"
                      value={newFollowUpNextDate}
                      onChange={e => setNewFollowUpNextDate(e.target.value)}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newFollowUpAdvances}
                    onChange={e => setNewFollowUpAdvances(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary/20 size-4"
                  />
                  <span>Este follow-up avança o cliente no funil?</span>
                </label>

                <button
                  type="button"
                  onClick={handleAddFollowUp}
                  disabled={savingFollowUp || !newFollowUpNotes}
                  className="w-full py-2.5 bg-primary text-white font-bold text-xs uppercase rounded-xl hover:scale-[1.01] transition-all disabled:opacity-50"
                >
                  {savingFollowUp ? 'A guardar...' : 'Registar Follow-Up'}
                </button>
              </div>

              {/* Follow ups history list */}
              <div className="flex-1 flex flex-col overflow-hidden max-h-[300px]">
                <p className="text-[10px] font-black uppercase text-text-sub mb-3">Histórico de Atividades</p>
                {loadingFollowUps ? (
                  <p className="text-xs text-text-sub">A carregar atividades...</p>
                ) : followUps.length === 0 ? (
                  <p className="text-xs text-text-sub italic">Sem atividades registadas para este lead.</p>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {followUps.map(fu => (
                      <div key={fu.id} className="p-3 bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-850 rounded-2xl flex flex-col gap-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {fu.current_stage}
                          </span>
                          <span className="text-[9px] text-text-sub">
                            {new Date(fu.created_at).toLocaleDateString('pt-MZ')}
                          </span>
                        </div>
                        <p className="text-xs text-text-main dark:text-gray-300 mt-1">{fu.notes}</p>
                        {fu.next_follow_up_date && (
                          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-1 uppercase flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">event</span>
                            Seguinte: {new Date(fu.next_follow_up_date).toLocaleDateString('pt-MZ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
