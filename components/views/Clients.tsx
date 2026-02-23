
import React, { useState, useMemo } from 'react';
import { Client, ClientStatus, User } from '../../types';
import { generateClientAvatar } from '../../services/geminiService';

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
  'Novo Lead': { color: 'text-gray-600', bg: 'bg-gray-100' },
  'Em Contacto': { color: 'text-blue-600', bg: 'bg-blue-50' },
  'Proposta Enviada': { color: 'text-indigo-600', bg: 'bg-indigo-50' },
  'Consultoria Marcada': { color: 'text-purple-600', bg: 'bg-purple-50' },
  'Convertido': { color: 'text-green-600', bg: 'bg-green-50' },
  'Repescagem': { color: 'text-orange-600', bg: 'bg-orange-50' },
  'Perdido': { color: 'text-red-600', bg: 'bg-red-50' }
};

// TEAM_MEMBERS constant removed, using team prop from App.tsx

export const Clients: React.FC<{
  user: User,
  team: any[],
  clients: Client[],
  onAddClient: (client: Omit<Client, 'id'>) => Promise<void>,
  onUpdateClient: (id: string, updates: Partial<Client>) => Promise<void>,
  onDeleteClient: (id: string) => Promise<void>
}> = ({ user, team, clients, onAddClient, onUpdateClient, onDeleteClient }) => {
  const allTeamMembers = Array.from(new Map([...team, { name: user.name, avatar: user.avatar }].map(m => [m.name, m])).values());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'Todos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyPhone: '',
    internalContact: '',
    internalContactPhone: '',
    internalContactRole: '',
    responsible: '',
    services: [] as string[],
    location: 'Maputo Cidade' as Client['location'],
    provenance: 'Outro' as Client['provenance']
  });

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchStatus = filterStatus === 'Todos' || c.status === filterStatus;
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
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
    const canUpdate = user.role === 'Gestor de Projectos' || client?.responsible === user.name;

    if (!canUpdate) {
      alert("Apenas o responsável pelo Lead ou o Gestor de Projectos podem alterar o estado.");
      return;
    }
    try {
      await onUpdateClient(clientId, { status: newStatus, lastActivity: 'Estado alterado' });
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
    const isManager = ['Gestor de Projectos', 'Gestor Criativo', 'Gestor de Parceiros e Clientes', 'Gestor de Trading e Negociação'].includes(user.role);
    const isResponsible = client.responsible === user.name;

    if (!isManager && !isResponsible) {
      alert('Apenas gestores ou o responsável pelo lead podem ver os detalhes completos.');
      return;
    }

    setSelectedClient(client);
    setIsDetailModalOpen(true);
  };

  const handleDeleteLead = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    const isManager = ['Gestor de Projectos', 'Gestor Criativo', 'Gestor de Parceiros e Clientes', 'Gestor de Trading e Negociação'].includes(user.role);
    const isResponsible = client?.responsible === user.name;

    if (!isManager && !isResponsible) {
      alert('Apenas gestores ou o responsável podem deletar este lead.');
      return;
    }

    if (confirm(`Tem certeza que deseja deletar o lead "${client?.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await onDeleteClient(clientId);
        setIsDetailModalOpen(false);
      } catch (err) {
        alert('Erro ao deletar lead.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: Omit<Client, 'id'> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      companyPhone: formData.companyPhone,
      internalContact: formData.internalContact,
      internalContactPhone: formData.internalContactPhone,
      internalContactRole: formData.internalContactRole,
      status: 'Novo Lead',
      responsible: formData.responsible || '', // Use delegated responsible if set
      lastActivity: 'Lead Registrado',
      initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2),
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

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      companyPhone: '',
      internalContact: '',
      internalContactPhone: '',
      internalContactRole: '',
      responsible: '',
      services: [],
      location: 'Maputo Cidade',
      provenance: 'Outro'
    });
  };

  const handleGenerateBrand = async (client: Client) => {
    setGeneratingFor(client.id);
    const avatar = await generateClientAvatar(client.name);
    if (avatar) {
      alert("Marca gerada via IA e associada ao perfil do cliente!");
    }
    setGeneratingFor(null);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">CRM & Pipeline Comercial</h2>
          <p className="text-text-sub text-sm">Gestão de leads e clientes regionais em Maputo.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transform hover:scale-105 transition-all"
          >
            <span className="material-symbols-outlined text-lg">person_add</span> Novo Lead
          </button>
        </div>
      </div>

      {/* Funil de Status (Filtros Rápidos) */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
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

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-800/20">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sub text-lg">search</span>
            <input
              type="text"
              placeholder="Procurar por nome ou email..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
              <tr className="text-[10px] uppercase font-bold text-text-sub tracking-widest">
                <th className="px-6 py-4">Empresa / Contactos</th>
                <th className="px-6 py-4">Estado Funil</th>
                <th className="px-6 py-4">Serviços / Local</th>
                <th className="px-6 py-4">Origem Lead</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs relative">
                        {client.initials}
                        {client.status === 'Convertido' && (
                          <span className="absolute -top-1 -right-1 size-4 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[10px] text-white filled">check</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-bold">{client.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-text-sub font-medium">{client.email}</p>
                          {client.phone && <span className="text-[10px] text-primary font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">call</span> {client.phone}
                          </span>}
                        </div>
                        {client.internalContact && (
                          <p className="text-[9px] text-text-sub flex items-center gap-1 mt-1 bg-gray-50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-lg w-fit">
                            <span className="material-symbols-outlined text-[12px]">person</span>
                            <span className="font-bold">{client.internalContact}</span> ({client.internalContactRole}) • {client.internalContactPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block group/status">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${statusConfig[client.status].bg} ${statusConfig[client.status].color}`}>
                        {client.status}
                      </span>
                      {/* Quick Change Dropdown on Hover */}
                      <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-20">
                        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 min-w-[160px]">
                          {Object.keys(statusConfig).map(st => (
                            <button
                              key={st}
                              onClick={() => updateClientStatus(client.id, st as ClientStatus)}
                              className={`text-[10px] font-bold text-left px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 ${client.status === st ? 'text-primary' : 'text-text-sub'}`}
                            >
                              Mudar para {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap gap-1">
                        {client.services.slice(0, 2).map(s => (
                          <span key={s} className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-[9px] font-bold rounded">
                            {s}
                          </span>
                        ))}
                        {client.services.length > 2 && <span className="text-[9px] font-bold text-text-sub">+{client.services.length - 2}</span>}
                      </div>
                      <span className="text-[10px] text-text-sub font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {client.location}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase text-primary tracking-tighter">{client.provenance}</span>
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
                          className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">person_add</span>
                          Assumir
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleOpenDetails(client)}
                      className="text-primary hover:text-primary-dark font-black text-[11px] uppercase transition-colors flex items-center gap-1"
                    >
                      Abrir Ficha <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredClients.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
              <p className="text-sm font-bold text-text-sub">Nenhum cliente encontrado com estes critérios.</p>
              <button onClick={() => { setFilterStatus('Todos'); setSearchQuery(''); }} className="text-xs text-primary font-bold hover:underline">Limpar Filtros</button>
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
              <h3 className="text-2xl font-black tracking-tight">Novo Prospecto</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="material-symbols-outlined text-text-sub hover:text-red-500 transition-colors">close</button>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Empresa e Contacto Principal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Nome da Empresa</label>
                  <input required className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="Ex: Hotel Polana" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Email Corporativo</label>
                  <input required type="email" className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="comercial@empresa.co.mz" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Celular do Lead (WhatsApp)</label>
                <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="+258 8X XXX XXXX" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Contacto Interno (Decision Maker)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Nome do Contacto</label>
                  <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="Ex: João Matola" value={formData.internalContact} onChange={e => setFormData({ ...formData, internalContact: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-text-sub uppercase">Cargo / Função</label>
                  <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="Ex: Director Geral" value={formData.internalContactRole} onChange={e => setFormData({ ...formData, internalContactRole: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-text-sub uppercase">Telefone do Contacto</label>
                <input className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary" placeholder="+258 84 XXX XXXX" value={formData.internalContactPhone} onChange={e => setFormData({ ...formData, internalContactPhone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-primary tracking-widest border-b pb-2">Serviços e Região</h4>
              <div className="flex flex-wrap gap-2">
                {availableServices.map(service => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border-2 ${formData.services.includes(service)
                      ? 'bg-primary border-primary text-white'
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
                <label className="text-[10px] font-bold text-text-sub uppercase">Responsável pelo Lead</label>
                <select className="bg-gray-50 dark:bg-zinc-800 border-none rounded-xl p-3 text-sm" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })}>
                  <option value="">Sem Responsável (Aberto)</option>
                  {allTeamMembers.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-black text-sm uppercase shadow-xl hover:scale-[1.01] transition-all">
              Guardar no Pipeline
            </button>
          </form>
        </div>
      )}

      {/* MODAL DETALHES DO LEAD */}
      {isDetailModalOpen && selectedClient && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>

          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-2xl">
                  {selectedClient.initials}
                </div>
                <div>
                  <h2 className="text-2xl font-black">{selectedClient.name}</h2>
                  <p className="text-sm text-text-sub mt-1">{selectedClient.email}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-text-sub hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase ${statusConfig[selectedClient.status].color} ${statusConfig[selectedClient.status].bg}`}>
                <span className="size-2 rounded-full bg-current"></span>
                {selectedClient.status}
              </span>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-xs font-bold text-text-sub uppercase mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">email</span>
                  Email Principal
                </p>
                <p className="text-sm font-bold">{selectedClient.email}</p>
              </div>

              {selectedClient.phone && (
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                  <p className="text-xs font-bold text-text-sub uppercase mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">phone</span>
                    Telefone Pessoal
                  </p>
                  <p className="text-sm font-bold">{selectedClient.phone}</p>
                </div>
              )}

              {selectedClient.companyPhone && (
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                  <p className="text-xs font-bold text-text-sub uppercase mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">business</span>
                    Telefone da Empresa
                  </p>
                  <p className="text-sm font-bold">{selectedClient.companyPhone}</p>
                </div>
              )}

              {selectedClient.location && (
                <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                  <p className="text-xs font-bold text-text-sub uppercase mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    Localização
                  </p>
                  <p className="text-sm font-bold">{selectedClient.location}</p>
                </div>
              )}
            </div>

            {/* Internal Contact Information */}
            {(selectedClient.internalContact || selectedClient.internalContactPhone || selectedClient.internalContactRole) && (
              <div className="mb-6 p-4 border-2 border-primary/20 rounded-xl bg-primary/5">
                <h3 className="text-sm font-black uppercase text-primary mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">badge</span>
                  Contacto Interno da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedClient.internalContact && (
                    <div>
                      <p className="text-xs text-text-sub font-bold mb-1">Nome</p>
                      <p className="text-sm font-bold">{selectedClient.internalContact}</p>
                    </div>
                  )}
                  {selectedClient.internalContactPhone && (
                    <div>
                      <p className="text-xs text-text-sub font-bold mb-1">Telefone</p>
                      <p className="text-sm font-bold">{selectedClient.internalContactPhone}</p>
                    </div>
                  )}
                  {selectedClient.internalContactRole && (
                    <div>
                      <p className="text-xs text-text-sub font-bold mb-1">Cargo</p>
                      <p className="text-sm font-bold">{selectedClient.internalContactRole}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Client Responsible Information */}
            {(selectedClient.clientResponsibleName || selectedClient.clientResponsiblePhone) && (
              <div className="mb-6 p-4 border-2 border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <h3 className="text-sm font-black uppercase text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined">person</span>
                  Responsável do Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedClient.clientResponsibleName && (
                    <div>
                      <p className="text-xs text-text-sub font-bold mb-1">Nome</p>
                      <p className="text-sm font-bold">{selectedClient.clientResponsibleName}</p>
                    </div>
                  )}
                  {selectedClient.clientResponsiblePhone && (
                    <div>
                      <p className="text-xs text-text-sub font-bold mb-1">Telefone</p>
                      <p className="text-sm font-bold">{selectedClient.clientResponsiblePhone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Services & Origin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-xs font-bold text-text-sub uppercase mb-2">Serviços Interessados</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClient.services?.map((service, idx) => (
                    <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-xs font-bold text-text-sub uppercase mb-2">Origem do Lead</p>
                <p className="text-sm font-bold text-primary">{selectedClient.provenance}</p>
              </div>
            </div>

            {/* Responsible */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs font-bold text-text-sub uppercase mb-2">Responsável Ocean Group</p>
              <p className="text-sm font-bold">{selectedClient.responsible || 'Sem responsável'}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => handleDeleteLead(selectedClient.id)}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                Deletar Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
