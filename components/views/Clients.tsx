import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../src/lib/supabase';
import { Client, ClientStatus, User, FollowUp, ServiceCatalogItem } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';
import { usePhotoSessions } from '../../src/hooks/usePhotoSessions';



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
  const { catalog: serviceCatalog } = usePhotoSessions();

  // Only Ocean Group services from catalog
  const catalogServices = useMemo(() => 
    serviceCatalog.filter(i => i.catalog_type === 'Ocean Group'),
    [serviceCatalog]
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'Todos' | 'Pendentes'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Status dropdown state — tracks which client's dropdown is open and its screen position
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const handleStatusBadgeClick = useCallback((e: React.MouseEvent, clientId: string) => {
    if (openStatusId === clientId) {
      setOpenStatusId(null);
      setDropdownPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dropdownHeight = 280; // approximate
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight ? rect.bottom + 6 : rect.top - dropdownHeight - 6;
    setDropdownPos({ top, left: rect.left });
    setOpenStatusId(clientId);
  }, [openStatusId]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    if (!openStatusId) return;
    const closeDropdown = (e: Event) => {
      // For mousedown: only close if click is outside the dropdown panel
      if (e.type === 'mousedown') {
        if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
          setOpenStatusId(null);
          setDropdownPos(null);
        }
      } else {
        // For scroll: always close so the panel doesn't drift
        setOpenStatusId(null);
        setDropdownPos(null);
      }
    };
    document.addEventListener('mousedown', closeDropdown);
    window.addEventListener('scroll', closeDropdown, true); // capture=true catches all scroll events
    return () => {
      document.removeEventListener('mousedown', closeDropdown);
      window.removeEventListener('scroll', closeDropdown, true);
    };
  }, [openStatusId]);

  // Form State — businessValue removed: now auto-calculated from selected services
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyPhone: '',
    companyName: '',
    nuit: '',
    nextFollowUpDate: '',
    internalContact: '',
    internalContactPhone: '',
    internalContactRole: '',
    responsible: '',
    selectedCatalogItems: [] as ServiceCatalogItem[], // replaces plain string services
    location: 'Maputo Cidade' as Client['location'],
    provenance: 'Outro' as Client['provenance']
  });

  // Auto-calculated business value from selected catalog items
  const calculatedBusinessValue = useMemo(() =>
    formData.selectedCatalogItems.reduce((sum, item) => sum + item.price_mt, 0),
    [formData.selectedCatalogItems]
  );

  const [formError, setFormError] = useState('');
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);


  // Follow Ups States
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [newFollowUpNotes, setNewFollowUpNotes] = useState('');
  const [newFollowUpStage, setNewFollowUpStage] = useState<ClientStatus>('Novo Lead');
  const [newFollowUpNextDate, setNewFollowUpNextDate] = useState('');
  const [newFollowUpAdvances, setNewFollowUpAdvances] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null);
  const [editFollowUpNotes, setEditFollowUpNotes] = useState('');
  const [editFollowUpNextDate, setEditFollowUpNextDate] = useState('');

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

  const toggleCatalogService = (item: ServiceCatalogItem) => {
    setFormData(prev => ({
      ...prev,
      selectedCatalogItems: prev.selectedCatalogItems.some(s => s.id === item.id)
        ? prev.selectedCatalogItems.filter(s => s.id !== item.id)
        : [...prev.selectedCatalogItems, item]
    }));
  };

  const updateClientStatus = async (clientId: string, newStatus: ClientStatus) => {
    const client = clients.find(c => c.id === clientId);
    const isManager = ['Gestor de Projetos', 'Gestor de Trading'].includes(user.role);
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
    setSelectedClient(client);
    setIsDetailModalOpen(true);
  };

  const handleEditLead = () => {
    if (!selectedClient) return;
    
    // Formata a data para yyyy-MM-ddThh:mm para o input datetime-local
    let formattedDate = selectedClient.nextFollowUpDate || '';
    if (formattedDate) {
      try {
        const d = new Date(formattedDate);
        if (!isNaN(d.getTime())) {
          const offset = d.getTimezoneOffset() * 60000;
          formattedDate = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
        }
      } catch (e) {}
    }

    setFormData({
      name: selectedClient.name,
      email: selectedClient.email,
      phone: selectedClient.phone || '',
      companyPhone: selectedClient.companyPhone || '',
      companyName: selectedClient.companyName || '',
      nuit: selectedClient.nuit || '',
      nextFollowUpDate: formattedDate,
      internalContact: selectedClient.internalContact || '',
      internalContactPhone: selectedClient.internalContactPhone || '',
      internalContactRole: selectedClient.internalContactRole || '',
      responsible: selectedClient.responsible || '',
      selectedCatalogItems: catalogServices.filter(c => selectedClient.services.includes(c.name)),
      location: selectedClient.location,
      provenance: selectedClient.provenance
    });
    setEditingLeadId(selectedClient.id);
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteLead = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const isManager = ['Gestor de Projetos', 'Gestor de Trading'].includes(user.role);
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
    setFormError('');

    // Validate: at least one service required
    if (formData.selectedCatalogItems.length === 0) {
      setFormError('Seleccione pelo menos um serviço do catálogo.');
      return;
    }

    // Duplicate check: same email or same phone (ignoring the lead currently being edited)
    if (formData.email.trim()) {
      const emailExists = clients.some(c => c.id !== editingLeadId && c.email.toLowerCase() === formData.email.toLowerCase().trim());
      if (emailExists) {
        setFormError(`Já existe um lead com o email "${formData.email}". Verifique o pipeline.`);
        return;
      }
    }
    
    if (formData.phone.trim()) {
      const phoneExists = clients.some(c => c.id !== editingLeadId && c.phone && c.phone.replace(/\s/g, '') === formData.phone.replace(/\s/g, ''));
      if (phoneExists) {
        setFormError(`Já existe um lead com o telefone "${formData.phone}". Verifique o pipeline.`);
        return;
      }
    }

    const newClient: Omit<Client, 'id'> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      companyPhone: formData.companyPhone || undefined,
      companyName: formData.companyName || undefined,
      nuit: formData.nuit || undefined,
      businessValue: calculatedBusinessValue > 0 ? calculatedBusinessValue : undefined,
      nextFollowUpDate: formData.nextFollowUpDate || undefined,
      status: 'Novo Lead',
      responsible: formData.responsible || '',
      lastActivity: 'Lead Registrado',
      initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      services: formData.selectedCatalogItems.map(i => i.name),
      location: formData.location,
      provenance: formData.provenance
    };

    try {
      if (editingLeadId) {
        await onUpdateClient(editingLeadId, newClient);
      } else {
        await onAddClient(newClient);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError('Erro ao guardar lead. Tente novamente.');
    }
  };


  const handleAddFollowUp = async () => {
    if (!selectedClient || !newFollowUpNotes) return;
    const isManager = ['Gestor de Projetos', 'Gestor de Trading'].includes(user.role);
    const isResponsible = selectedClient.responsible === user.name;
    
    if (!isManager && !isResponsible) {
      alert('Apenas o gestor ou o responsável pelo lead podem adicionar follow-ups.');
      return;
    }

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
      } else if (nextDate.includes('T') && !nextDate.includes('+') && !nextDate.includes('Z')) {
        // datetime-local gives "YYYY-MM-DDTHH:mm" without timezone.
        // Convert to local ISO string to avoid Supabase treating it as UTC (which would shift +2h on display).
        const localDate = new Date(nextDate);
        const tzOffset = -localDate.getTimezoneOffset(); // in minutes
        const sign = tzOffset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
        const offsetStr = `${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(Math.abs(tzOffset) % 60)}`;
        nextDate = nextDate + offsetStr; // e.g. "2026-07-25T14:30+02:00"
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

  const handleEditFollowUpClick = (fu: FollowUp) => {
    setEditingFollowUpId(fu.id);
    setEditFollowUpNotes(fu.notes);
    setEditFollowUpNextDate(fu.next_follow_up_date ? fu.next_follow_up_date.slice(0, 16) : ''); // format to local datetime-local
  };

  const handleSaveFollowUpEdit = async () => {
    if (!editingFollowUpId || !editFollowUpNotes) return;
    try {
      let nextDate = editFollowUpNextDate;
      if (nextDate && nextDate.includes('T') && !nextDate.includes('+') && !nextDate.includes('Z')) {
        const localDate = new Date(nextDate);
        const tzOffset = -localDate.getTimezoneOffset();
        const sign = tzOffset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
        const offsetStr = `${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(Math.abs(tzOffset) % 60)}`;
        nextDate = nextDate + offsetStr;
      }
      
      const { error: updateErr } = await supabase
        .from('follow_ups')
        .update({
          notes: editFollowUpNotes,
          next_follow_up_date: nextDate || null,
        } as any)
        .eq('id', editingFollowUpId);
      if (updateErr) throw updateErr;

      setFollowUps(prev => prev.map(fu => fu.id === editingFollowUpId ? { ...fu, notes: editFollowUpNotes, next_follow_up_date: nextDate || '' } : fu));
      setEditingFollowUpId(null);
    } catch (e) {
      alert('Erro ao atualizar follow-up');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      companyPhone: '',
      companyName: '',
      nuit: '',
      nextFollowUpDate: '',
      internalContact: '',
      internalContactPhone: '',
      internalContactRole: '',
      responsible: '',
      selectedCatalogItems: [],
      location: 'Maputo Cidade',
      provenance: 'Outro'
    });
    setFormError('');
    setEditingLeadId(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Status dropdown rendered into document.body via portal — escapes all overflow/stacking contexts */}
      {openStatusId && dropdownPos && ReactDOM.createPortal(
        <div
          ref={statusDropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999 }}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-0.5 min-w-[190px]"
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-text-sub px-3 py-1.5 border-b border-gray-100 dark:border-zinc-800 mb-1">Mudar Estado</p>
          {(Object.keys(statusConfig) as ClientStatus[]).map(st => {
            const isCurrent = clients.find(c => c.id === openStatusId)?.status === st;
            const cfg = statusConfig[st];
            return (
              <button
                key={st}
                onClick={() => {
                  if (!isCurrent) updateClientStatus(openStatusId, st);
                  setOpenStatusId(null);
                  setDropdownPos(null);
                }}
                className={`text-[11px] font-bold text-left px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 ${
                  isCurrent ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-text-sub'
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.bg.split(' ')[0]}`} />
                {st}
                {isCurrent && <span className="material-symbols-outlined text-[12px] ml-auto">check</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">CRM &amp; Pipeline Comercial</h2>
            <p className="text-text-sub text-sm">Gestão de leads e clientes regionais em Maputo.</p>
            {error && <div className="mt-2 bg-red-100 text-red-600 p-2 text-xs font-bold rounded">ERRO NA BASE DE DADOS: {error}</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span className="hidden sm:inline">Novo Lead</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* Secondary action bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {isBulkMode && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md shadow-red-500/20 transition-all"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Apagar {selectedIds.size}
            </button>
          )}
          <button
            onClick={() => { setIsBulkMode(p => !p); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border-2 transition-all ${
              isBulkMode
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-text-sub hover:border-primary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">checklist</span>
            {isBulkMode ? 'Cancelar' : 'Selecionar'}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
            title={selectedIds.size > 0 ? `Exportar ${selectedIds.size} selecionado(s)` : 'Exportar todos os leads visíveis'}
          >
            <span className="material-symbols-outlined text-sm">download</span>
            {selectedIds.size > 0 ? `Exportar ${selectedIds.size}` : 'CSV'}
          </button>
        </div>
      </div>

      {/* Funil de Status (Filtros Rápidos) */}
      <div className="sticky top-0 z-40 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-2 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar items-center">
          <button
            onClick={() => setFilterStatus('Pendentes')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
              filterStatus === 'Pendentes'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">notifications_active</span>
            <span className="hidden sm:inline">Follow-ups Pendentes</span>
            <span className="sm:hidden">Pendentes</span>
            <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black ${
              filterStatus === 'Pendentes' ? 'bg-white/25 text-white' : 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300'
            }`}>
              {clients.filter(c => !!c.nextFollowUpDate && c.nextFollowUpDate <= new Date().toISOString().split('T')[0] && c.status !== 'Convertido' && c.status !== 'Perdido').length}
            </span>
          </button>

          <div className="w-px h-5 bg-gray-200 dark:bg-zinc-700 mx-0.5 shrink-0"></div>

          {(['Todos', 'Novo Lead', 'Em Contacto', 'Proposta Enviada', 'Consultoria Marcada', 'Convertido', 'Repescagem', 'Perdido'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                filterStatus === status
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-text-sub hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              {status}
              {status !== 'Todos' && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                  filterStatus === status ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-text-sub'
                }`}>
                  {clients.filter(c => c.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
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
                        <p className="text-sm font-bold">{client.companyName || client.name}</p>
                        {client.companyName && <p className="text-xs text-text-sub font-semibold">{client.name}</p>}
                        <p className="text-[10px] text-text-sub font-medium">{client.email} {client.phone ? `· ${client.phone}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-black text-sm text-text-main dark:text-gray-200">
                    {client.businessValue ? `MT ${client.businessValue.toLocaleString('pt-MZ')}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {(['Gestor de Projetos', 'Gestor de Trading'].includes(user.role) || client.responsible === user.name) ? (
                      <button
                        onClick={(e) => handleStatusBadgeClick(e, client.id)}
                        title="Clique para mudar o estado"
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all hover:opacity-80 hover:ring-2 hover:ring-offset-1 hover:ring-primary/30 active:scale-95 ${
                          statusConfig[client.status].bg
                        } ${statusConfig[client.status].color} ${openStatusId === client.id ? 'ring-2 ring-primary/50 ring-offset-1' : ''}`}
                      >
                        {client.status}
                        <span className="material-symbols-outlined text-[10px] ml-1 opacity-60">unfold_more</span>
                      </button>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusConfig[client.status].bg} ${statusConfig[client.status].color}`}>
                        {client.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-text-sub">
                    {client.nextFollowUpDate ? (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-base">event</span>
                        {new Date(client.nextFollowUpDate).toLocaleString('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).replace(',', ' às')}
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => { setIsModalOpen(false); resetForm(); }}></div>
          <form
            onSubmit={handleSubmit}
            className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">{editingLeadId ? 'Editar Lead' : 'Novo Prospecto comercial'}</h3>
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="material-symbols-outlined text-text-sub hover:text-red-500 transition-colors">close</button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {formError}
              </div>
            )}

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

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">NUIT (Opcional)</label>
                <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: 400123456" value={formData.nuit} onChange={e => setFormData({ ...formData, nuit: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Email de Contacto (Opcional)</label>
                  <input type="email" className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="contacto@empresa.com" value={formData.email} onChange={e => { setFormData({ ...formData, email: e.target.value }); setFormError(''); }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">WhatsApp / Telefone</label>
                  <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="84 123 4567" value={formData.phone} onChange={e => { 
                    const val = e.target.value.replace(/[^\d\s+]/g, '');
                    setFormData({ ...formData, phone: val }); 
                    setFormError(''); 
                  }} onBlur={() => {
                    const clean = formData.phone.replace(/[^\d]/g, '');
                    if (clean && !/^(82|83|84|85|86|87|88)/.test(clean) && !/^258(82|83|84|85|86|87|88)/.test(clean)) {
                      setFormError("O telefone deve começar com 82 a 88 (redes móveis de Moçambique).");
                    }
                  }} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Primeiro Follow-Up (Opcional)</label>
                <input type="datetime-local" className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" value={formData.nextFollowUpDate} onChange={e => setFormData({ ...formData, nextFollowUpDate: e.target.value })} />
              </div>
            </div>

            {/* SERVIÇOS DO CATÁLOGO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Serviços de Interesse *</h4>
                <span className="text-[10px] text-text-sub">Seleccione os serviços pretendidos</span>
              </div>

              {catalogServices.length === 0 ? (
                <div className="text-xs text-text-sub italic bg-gray-50 dark:bg-zinc-800 rounded-xl p-3">
                  Catálogo vazio. O Gestor de Projetos deve adicionar serviços primeiro.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {catalogServices.map(item => {
                    const isSelected = formData.selectedCatalogItems.some(s => s.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { toggleCatalogService(item); setFormError(''); }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-gray-50 dark:bg-zinc-800 border-transparent hover:border-gray-200 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-zinc-600'
                          }`}>
                            {isSelected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{item.name}</p>
                            {item.description && <p className="text-[10px] text-text-sub">{item.description}</p>}
                          </div>
                        </div>
                        <span className={`text-sm font-black whitespace-nowrap ml-4 ${
                          isSelected ? 'text-primary' : 'text-text-sub'
                        }`}>
                          MT {item.price_mt.toLocaleString('pt-MZ')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Valor total calculado */}
              {formData.selectedCatalogItems.length > 0 && (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-sm">calculate</span>
                    <span className="text-xs font-bold text-green-700 dark:text-green-400">
                      Valor Estimado Total ({formData.selectedCatalogItems.length} serviço{formData.selectedCatalogItems.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <span className="text-lg font-black text-green-700 dark:text-green-400">
                    MT {calculatedBusinessValue.toLocaleString('pt-MZ')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Localização e Origem</h4>
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

            <button
              type="submit"
              disabled={formData.selectedCatalogItems.length === 0}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {formData.selectedCatalogItems.length === 0
                ? 'Seleccione pelo menos 1 serviço'
                : `${editingLeadId ? 'Atualizar' : 'Guardar'} Lead — MT ${calculatedBusinessValue.toLocaleString('pt-MZ')}`
              }
            </button>
          </form>
        </div>
      )}

      {/* MODAL DETALHES DO LEAD & HISTÓRICO DE FOLLOW-UP */}
      {isDetailModalOpen && selectedClient && (() => {
        const canEditCurrentClient = ['Gestor de Projetos', 'Gestor de Trading'].includes(user.role) || selectedClient.responsible === user.name;
        
        return (
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
                    {selectedClient.companyName ? (
                      <>
                        <h2 className="text-2xl font-black text-primary">{selectedClient.companyName}</h2>
                        <p className="text-sm font-semibold text-text-sub">Contacto: {selectedClient.name}</p>
                      </>
                    ) : (
                      <h2 className="text-xl font-black">{selectedClient.name}</h2>
                    )}
                  </div>
                </div>
              </div>

              {!canEditCurrentClient && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Modo de Visualização - Apenas o responsável pode editar.
                </div>
              )}

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
                  <p className="text-[10px] font-bold text-text-sub uppercase mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">badge</span> NUIT</p>
                  <p className="text-xs font-bold">{selectedClient.nuit || 'Não registado'}</p>
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
                {canEditCurrentClient && (
                  <>
                    <button
                      type="button"
                      onClick={handleEditLead}
                      className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">edit</span> Editar Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLead(selectedClient.id)}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/10"
                    >
                      <span className="material-symbols-outlined text-base">delete</span> Eliminar Lead
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Follow-ups History & Form */}
            <div className="border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-zinc-800 pt-6 lg:pt-0 lg:pl-8 flex flex-col gap-6">
              <h3 className="font-black text-lg flex items-center gap-2 border-b border-gray-100 dark:border-zinc-850 pb-2">
                <span className="material-symbols-outlined text-primary">forum</span>
                Relatórios de Acompanhamento
              </h3>

              {/* Form to add a new follow up */}
              {canEditCurrentClient && (
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
                      type="datetime-local"
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
              )}

              {/* Follow-ups List */}
              <div className="flex-1 flex flex-col overflow-hidden max-h-[300px]">
                <p className="text-[10px] font-black uppercase text-text-sub mb-3">Histórico de Atividades</p>
                {loadingFollowUps ? (
                  <p className="text-xs text-text-sub">A carregar atividades...</p>
                ) : followUps.length === 0 ? (
                  <p className="text-xs text-text-sub italic">Sem atividades registadas para este lead.</p>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {followUps.map(fu => (
                      <div key={fu.id} className="p-3 bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-850 rounded-2xl flex flex-col gap-2">
                        {editingFollowUpId === fu.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-750 rounded-xl p-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                              rows={2}
                              value={editFollowUpNotes}
                              onChange={e => setEditFollowUpNotes(e.target.value)}
                            />
                            <input
                              type="datetime-local"
                              className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-750 rounded-xl p-2 text-xs outline-none"
                              value={editFollowUpNextDate}
                              onChange={e => setEditFollowUpNextDate(e.target.value)}
                            />
                            <div className="flex justify-end gap-2 mt-1">
                              <button onClick={() => setEditingFollowUpId(null)} className="px-2 py-1 text-[10px] font-bold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancelar</button>
                              <button onClick={handleSaveFollowUpEdit} className="px-2 py-1 text-[10px] font-bold bg-primary text-white rounded-lg hover:bg-primary/90">Guardar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-baseline">
                              <span className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {fu.current_stage}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-text-sub">
                                  {new Date(fu.created_at).toLocaleDateString('pt-MZ')}
                                </span>
                                {canEditCurrentClient && (
                                  <button onClick={() => handleEditFollowUpClick(fu)} className="text-text-sub hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-[12px]">edit</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-text-main dark:text-gray-300 mt-1">{fu.notes}</p>
                            {fu.next_follow_up_date && (
                              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-1 uppercase flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">event</span>
                                Seguinte: {new Date(fu.next_follow_up_date).toLocaleString('pt-MZ', { dateStyle: 'short', timeStyle: 'short' }).replace(',', ' às')}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

