import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { User, TeamMember, UserRole } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';
import { supabase } from '../../src/lib/supabase';

const COLORS = ['#078836', '#0056b3', '#cf4444'];

interface TeamPerformanceProps {
  currentUser: User;
  team: TeamMember[];
  onRefetch?: () => void;
  error?: string | null;
}

export const TeamPerformance: React.FC<TeamPerformanceProps> = ({ currentUser, team, onRefetch, error }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Add Form State
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('Colaborador');
  const [addPassword, setAddPassword] = useState('');
  const [addAvatar, setAddAvatar] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Colaborador');
  const [editAvatar, setEditAvatar] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const isCEO = currentUser.role === 'Gestor de Projetos';

  const filteredTeam = useMemo(() => {
    return team.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [team, searchTerm]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');

    try {
      const { data: newUserId, error } = await supabase.rpc('create_new_user', {
        p_email: addEmail.trim(),
        p_password: 'OceanTeam2026',
        p_name: addName.trim(),
        p_role: addRole,
        p_avatar: addAvatar.trim() || DEFAULT_AVATAR
      });

      if (error) throw error;

      alert('Colaborador criado com sucesso! O utilizador será forçado a alterar a password no primeiro login.');
      setIsAddModalOpen(false);
      
      // Reset form
      setAddName('');
      setAddEmail('');
      setAddRole('Colaborador');
      setAddPassword('');
      setAddAvatar('');

      onRefetch?.();

    } catch (err: any) {
      console.error('Error creating user:', err);
      setAddError(err.message || 'Erro ao criar utilizador. Verifique os dados.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role as UserRole);
    setEditAvatar(member.avatar || DEFAULT_AVATAR);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setEditLoading(true);
    setEditError('');

    try {
      const { error } = await supabase.rpc('update_user_admin', {
        p_user_id: selectedMember.id,
        p_email: editEmail.trim(),
        p_name: editName.trim(),
        p_role: editRole,
        p_avatar: editAvatar.trim()
      });

      if (error) throw error;

      alert('Colaborador atualizado com sucesso!');
      setIsEditModalOpen(false);
      onRefetch?.();

    } catch (err: any) {
      console.error('Error updating user:', err);
      setEditError(err.message || 'Erro ao atualizar utilizador.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Diretório da Equipe</h2>
          <p className="text-text-sub">Gestão de talentos, performance e reconhecimento.</p>
          <div className="mt-2 bg-yellow-100 text-yellow-800 p-2 text-xs font-bold rounded">DEBUG: team.length = {team.length}</div>
          {error && <div className="mt-2 bg-red-100 text-red-600 p-2 text-xs font-bold rounded">ERRO NA BASE DE DADOS: {error}</div>}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-sub text-lg">search</span>
            <input
              type="text"
              placeholder="Procurar colaborador..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isCEO && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">person_add</span> Adicionar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeam.map((member) => {
          const objPercentage = member.metrics.totalObjectives > 0 
            ? Math.round((member.metrics.objectivesMet / member.metrics.totalObjectives) * 100) 
            : 0;
            
          const taskDistribution = [
            { name: 'Cumpridas', value: member.metrics.completed },
            { name: 'Pendentes', value: member.metrics.pending },
            { name: 'Perdidas', value: member.metrics.missed },
          ];

          // Calculate XP progress (simple logic: 1000 XP per level)
          const xpProgress = (member.xp % 1000) / 10;

          return (
            <div key={member.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col relative">
              {isCEO && (
                <button
                  onClick={() => handleOpenEdit(member)}
                  className="absolute top-4 left-4 size-8 bg-zinc-100 hover:bg-primary hover:text-white dark:bg-zinc-800 dark:hover:bg-primary rounded-xl flex items-center justify-center transition-colors z-20"
                  title="Editar Perfil"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              )}

              {/* Header do Card com Nível */}
              <div className="p-6 pb-4 flex items-start justify-between relative">
                <div className="absolute top-0 right-0 p-4">
                  <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-primary uppercase leading-none mb-1">LVL</span>
                    <span className="text-lg font-black text-primary leading-none">{member.level}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-8">
                  <div className="relative">
                    <img src={member.avatar || DEFAULT_AVATAR} className="size-16 rounded-2xl object-cover border-2 border-primary/10 shadow-sm" alt="" />
                    <div className="absolute -bottom-1 -right-1 size-5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" title="Ativo"></div>
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight">{member.name}</h3>
                    <p className="text-primary text-[11px] font-black uppercase tracking-wider">{member.role}</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar de XP */}
              <div className="px-6 mb-4">
                <div className="flex justify-between items-center text-[9px] font-black text-text-sub uppercase mb-1">
                  <span>Progresso de Nível</span>
                  <span>{member.xp % 1000} / 1000 XP</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${xpProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Badges do Colaborador */}
              <div className="px-6 flex flex-wrap gap-1.5 mb-2">
                {member.badges.map(badge => (
                  <div key={badge} className="px-2 py-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] text-amber-600 filled">stars</span>
                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tighter">{badge}</span>
                  </div>
                ))}
              </div>

              {/* Informações Profissionais e de RH */}
              <div className="px-6 py-4 bg-gray-50/50 dark:bg-zinc-800/30 flex flex-col gap-3 border-y border-gray-50 dark:border-zinc-800">
                {member.employeeId && (
                  <div className="flex items-center justify-between text-xs font-bold text-text-main">
                    <span className="text-[10px] uppercase text-text-sub">ID:</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-widest">{member.employeeId}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-text-sub tracking-widest">Contacto</span>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="material-symbols-outlined text-[14px] text-primary">call</span>
                      <span className="truncate">{member.phone}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-text-sub tracking-widest">Email</span>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="material-symbols-outlined text-[14px] text-primary">mail</span>
                      <span className="truncate">{member.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-text-sub tracking-widest">Nascimento</span>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="material-symbols-outlined text-[14px] text-primary">cake</span>
                      <span>{member.birthDate ? new Date(member.birthDate).toLocaleDateString('pt-BR') : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase text-text-sub tracking-widest">Género</span>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="material-symbols-outlined text-[14px] text-primary">badge</span>
                      <span>{member.gender || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métricas de Performance */}
              <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10 flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-black uppercase text-primary tracking-tighter mb-1">Taxa de Sucesso</p>
                    <p className="text-xl font-black text-primary">{objPercentage}%</p>
                  </div>
                  <div className="h-20 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskDistribution}
                          innerRadius={25}
                          outerRadius={35}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {taskDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black">{member.metrics.completed}</span>
                    </div>
                  </div>
                </div>

                {/* KPIs Detalhados */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase text-text-sub tracking-widest">KPIs de Reconhecimento</p>
                  {member.metrics.kpis.map(kpi => (
                    <div key={kpi.name}>
                      <div className="flex justify-between text-[10px] font-bold mb-1 uppercase">
                        <span>{kpi.name}</span>
                        <span className="text-primary">{kpi.score}%</span>
                      </div>
                      <div className="h-1 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${kpi.score}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Portfólio de Clientes Responsável */}
                <div className="mt-auto pt-4 border-t border-gray-50 dark:border-zinc-800">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[9px] font-black uppercase text-text-sub tracking-widest">Alocação de Projetos</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {member.metrics.clients && member.metrics.clients.length > 0 ? (
                      member.metrics.clients.map(client => (
                        <span key={client} className="px-2 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-[9px] font-bold text-text-main dark:text-gray-300 shadow-sm">
                          {client}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-text-sub italic">Sem clientes alocados</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTeam.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-zinc-800">
            <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">person_search</span>
            <p className="text-text-sub font-bold">Nenhum colaborador encontrado com esses termos.</p>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR UTILIZADOR */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-gray-100 dark:border-zinc-800 p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <h3 className="text-2xl font-black mb-6">Adicionar Colaborador</h3>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome Completo"
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="email@oceangroup.com"
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">Cargo</label>
                <select
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={addRole}
                  onChange={e => setAddRole(e.target.value as UserRole)}
                >
                  <option value="Gestor de Projetos">Gestor de Projetos</option>
                  <option value="Gestor Técnico">Gestor Técnico</option>
                  <option value="Gestor de Trading">Gestor de Trading</option>
                  <option value="Fotógrafo">Fotógrafo</option>
                  <option value="Promotor de Venda">Promotor de Venda (SDR)</option>
                  <option value="Colaborador">Colaborador</option>
                </select>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-xs flex gap-2 items-start mt-2">
                <span className="material-symbols-outlined text-sm shrink-0">info</span>
                <p>A senha inicial será <strong>OceanTeam2026</strong>. O colaborador será forçado a alterar esta senha e definir o seu Avatar no primeiro login.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">URL do Avatar (Opcional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={addAvatar}
                  onChange={e => setAddAvatar(e.target.value)}
                />
              </div>

              {addError && <p className="text-red-500 text-xs font-bold text-center">{addError}</p>}

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-3 rounded-xl font-bold text-sm text-text-sub transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center"
                >
                  {addLoading ? <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR UTILIZADOR */}
      {isEditModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-gray-100 dark:border-zinc-800 p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <h3 className="text-2xl font-black mb-6">Editar Colaborador</h3>
            <form onSubmit={handleUpdateUser} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome Completo"
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="email@oceangroup.com"
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">Cargo</label>
                <select
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as UserRole)}
                >
                  <option value="Gestor de Projetos">Gestor de Projetos</option>
                  <option value="Gestor Técnico">Gestor Técnico</option>
                  <option value="Gestor de Trading">Gestor de Trading</option>
                  <option value="Fotógrafo">Fotógrafo</option>
                  <option value="Promotor de Venda">Promotor de Venda (SDR)</option>
                  <option value="Colaborador">Colaborador</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-text-sub ml-1">URL do Avatar</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                  value={editAvatar}
                  onChange={e => setEditAvatar(e.target.value)}
                />
              </div>

              {editError && <p className="text-red-500 text-xs font-bold text-center">{editError}</p>}

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-3 rounded-xl font-bold text-sm text-text-sub transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center"
                >
                  {editLoading ? <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Guardar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
