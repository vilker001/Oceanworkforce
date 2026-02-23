
import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { User, TeamMember } from '../../types';

// Team data is now passed via props from App.tsx

const COLORS = ['#078836', '#0056b3', '#cf4444'];

interface TeamPerformanceProps {
  currentUser: User;
  team: TeamMember[];
}

export const TeamPerformance: React.FC<TeamPerformanceProps> = ({ currentUser, team }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = currentUser.role === 'GP Sênior' || currentUser.role === 'Gestor Financeiro';

  const filteredTeam = useMemo(() => {
    return team.filter(m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [team, searchTerm]);


  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Diretório da Equipe</h2>
          <p className="text-text-sub">Gestão de talentos, performance e reconhecimento.</p>
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
          {isManager && (
            <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all whitespace-nowrap">
              <span className="material-symbols-outlined text-lg">person_add</span> Adicionar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeam.map((member) => {
          const objPercentage = Math.round((member.metrics.objectivesMet / member.metrics.totalObjectives) * 100);
          const taskDistribution = [
            { name: 'Cumpridas', value: member.metrics.completed },
            { name: 'Pendentes', value: member.metrics.pending },
            { name: 'Perdidas', value: member.metrics.missed },
          ];

          // Calculate XP progress (simple logic for demo: 1000 XP per level)
          const xpProgress = (member.xp % 1000) / 10;

          return (
            <div key={member.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
              {/* Header do Card com Nível */}
              <div className="p-6 pb-4 flex items-start justify-between relative">
                <div className="absolute top-0 right-0 p-4">
                  <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-primary uppercase leading-none mb-1">LVL</span>
                    <span className="text-lg font-black text-primary leading-none">{member.level}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={member.avatar} className="size-16 rounded-2xl object-cover border-2 border-primary/10 shadow-sm" alt="" />
                    <div className="absolute -bottom-1 -right-1 size-5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" title="Online"></div>
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

              {/* Informações de Contacto */}
              <div className="px-6 py-3 bg-gray-50/50 dark:bg-zinc-800/30 flex flex-col gap-2 border-y border-gray-50 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-xs font-medium text-text-sub">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-text-sub">
                  <span className="material-symbols-outlined text-sm">call</span>
                  <span>{member.phone}</span>
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
                    {member.metrics.clients.map(client => (
                      <span key={client} className="px-2 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-[9px] font-bold text-text-main dark:text-gray-300 shadow-sm">
                        {client}
                      </span>
                    ))}
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
    </div>
  );
};

