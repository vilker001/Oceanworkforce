import React, { useState, useMemo } from 'react';
import { useGamification } from '../../src/hooks/useGamification';
import { useTeam } from '../../src/hooks/useTeam';
import { supabase } from '../../src/lib/supabase';
import { User, TeamMember } from '../../types';
import { useConfirm } from '../ui/ConfirmDialog';

interface RankingProps {
  currentUser: User;
}

export const Ranking: React.FC<RankingProps> = ({ currentUser }) => {
  const { xpHistory, teamGoals, monthlyTitles, loading, createTeamGoal, refetch } = useGamification();
  const { team, loading: teamLoading, refetch: refetchTeam } = useTeam();
  const { confirm } = useConfirm();

  const isGP = currentUser.role === 'Gestor de Projetos';

  const [activeTab, setActiveTab] = useState<'geral' | 'mensal' | 'cargo'>('geral');
  const [selectedRole, setSelectedRole] = useState<string>('Fotógrafo');
  
  // Team Goal Input
  const [goalTarget, setGoalTarget] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Month String Helper (YYYY-MM)
  const getMonthStr = (date: Date = new Date()) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  const currentMonthStr = getMonthStr();

  // 1. Calculate Monthly XP per user (from xpHistory)
  const monthlyXpMap = useMemo(() => {
    const map: Record<string, number> = {};
    const monthPrefix = currentMonthStr;
    xpHistory
      .filter(e => e.created_at && e.created_at.startsWith(monthPrefix))
      .forEach(e => {
        map[e.user_id] = (map[e.user_id] || 0) + e.xp_amount;
      });
    return map;
  }, [xpHistory, currentMonthStr]);

  // 2. Collective Monthly XP
  const collectiveMonthlyXp = useMemo(() => {
    return Object.values(monthlyXpMap).reduce((sum: number, val: number) => sum + val, 0);
  }, [monthlyXpMap]);

  // 3. Current Month Goal
  const currentGoal = useMemo(() => {
    return teamGoals.find(g => g.month === currentMonthStr) || null;
  }, [teamGoals, currentMonthStr]);

  // 4. Sorted rankings
  const rankedUsers = useMemo(() => {
    let list = [...team];
    if (activeTab === 'geral') {
      return list.sort((a, b) => b.xp - a.xp);
    } else if (activeTab === 'mensal') {
      return list
        .map(u => ({ ...u, monthlyXp: monthlyXpMap[u.id] || 0 }))
        .sort((a, b) => b.monthlyXp - a.monthlyXp);
    } else {
      // cargo
      return list
        .filter(u => u.role === selectedRole)
        .sort((a, b) => b.xp - a.xp);
    }
  }, [team, activeTab, selectedRole, monthlyXpMap]);

  const handleSetGoal = async () => {
    const target = parseInt(goalTarget);
    if (isNaN(target) || target <= 0) return;
    setSavingGoal(true);
    try {
      await createTeamGoal(currentMonthStr, target);
      setGoalTarget('');
      alert(`Meta de ${target} XP coletivo configurada com sucesso para este mês!`);
    } catch (e) {
      console.error(e);
      alert('Erro ao configurar meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleAchieveGoal = async () => {
    if (!currentGoal) return;
    if (collectiveMonthlyXp < currentGoal.target_xp) {
      alert('A meta ainda não foi atingida!');
      return;
    }
    const ok = await confirm({
      title: 'Celebrar Conquista',
      message: 'Desejas celebrar esta conquista? Todos os colaboradores ganharão +50 XP e o Gestor de Projetos +100 XP.',
      confirmText: 'Celebrar! 🎉'
    });
    if (!ok) return;
    
    setSavingGoal(true);
    try {
      // 1. Mark as achieved in db
      const { error: updateErr } = await supabase
        .from('team_goals')
        .update({ achieved: true, current_xp: collectiveMonthlyXp })
        .eq('id', currentGoal.id);
      if (updateErr) throw updateErr;

      // 2. Award XP to team
      for (const member of team) {
        const xpReward = member.role === 'Gestor de Projetos' ? 100 : 50;
        await supabase.from('xp_history').insert({
          user_id: member.id,
          xp_amount: xpReward,
          reason: `Celebração: Meta de Equipa de ${currentGoal.target_xp} XP Mensal Atingida!`
        });
      }

      alert('Meta celebrada com sucesso! Pontos de XP distribuídos.');
      refetch();
      refetchTeam();
    } catch (e) {
      console.error(e);
      alert('Erro ao celebrar meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const roles = ['Fotógrafo', 'Promotor de Venda', 'Colaborador', 'Gestor Técnico', 'Gestor de Trading'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Rankings Listing (Left & Center) */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-colors duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black">Ranking de Membros</h2>
              <p className="text-sm text-text-sub">Gamificação e posições na equipa</p>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl w-full sm:w-auto">
              <button onClick={() => setActiveTab('geral')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'geral' ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-text-sub'}`}>
                Geral
              </button>
              <button onClick={() => setActiveTab('mensal')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'mensal' ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-text-sub'}`}>
                Mensal
              </button>
              <button onClick={() => setActiveTab('cargo')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'cargo' ? 'bg-white dark:bg-zinc-700 text-primary dark:text-white shadow-sm' : 'text-text-sub'}`}>
                Por Cargo
              </button>
            </div>
          </div>

          {/* Role selector for cargo tab */}
          {activeTab === 'cargo' && (
            <div className="flex gap-2 flex-wrap mb-4 bg-gray-50 dark:bg-zinc-850 p-2 rounded-2xl">
              {roles.map(role => (
                <button key={role} onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedRole === role ? 'bg-primary text-white shadow-sm' : 'text-text-sub hover:text-text-main'}`}>
                  {role}
                </button>
              ))}
            </div>
          )}

          {/* Leaderboard */}
          {teamLoading || loading ? (
            <div className="text-center py-12 text-text-sub">A carregar ranking...</div>
          ) : rankedUsers.length === 0 ? (
            <div className="text-center py-12 text-text-sub">Nenhum membro encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-text-sub">
                    <th className="pb-3 text-center w-12">Pos</th>
                    <th className="pb-3">Membro</th>
                    <th className="pb-3 text-center">Nível</th>
                    <th className="pb-3 text-right">XP</th>
                    <th className="pb-3 text-right">Liga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/40">
                  {rankedUsers.map((member, index) => {
                    const isTop3 = index < 3;
                    const posColor = index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                                     index === 1 ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' :
                                     index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                                     'text-text-sub bg-gray-50 dark:bg-zinc-800/20';

                    const displayedXp = activeTab === 'mensal' ? (member as any).monthlyXp : member.xp;

                    return (
                      <tr key={member.id} className={`hover:bg-gray-50/50 dark:hover:bg-zinc-850/20 transition-colors ${member.id === currentUser.id ? 'bg-primary/5 dark:bg-primary/5' : ''}`}>
                        <td className="py-4 text-center">
                          <span className={`inline-flex items-center justify-center size-6 rounded-full font-black text-xs ${posColor}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <img src={member.avatar} className="size-9 rounded-xl object-cover" alt="" />
                            <div>
                              <p className="text-sm font-black">{member.name}</p>
                              <p className="text-[10px] text-text-sub font-bold uppercase">{member.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center">
                          <span className="font-black text-sm">{member.level}</span>
                        </td>
                        <td className="py-4 text-right font-black text-sm text-primary">
                          {displayedXp.toLocaleString('pt-MZ')}
                        </td>
                        <td className="py-4 text-right">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase`}>
                            {member.badges[0] || 'Iniciante'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Gamification side widgets (Right panel) */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        {/* Collective monthly goal progress */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-colors duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Meta Coletiva do Mês</h3>
          {currentGoal ? (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-2xl font-black text-primary">{collectiveMonthlyXp.toLocaleString('pt-MZ')} XP</span>
                  <span className="text-xs text-text-sub font-bold">Meta: {currentGoal.target_xp.toLocaleString('pt-MZ')} XP</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${currentGoal.achieved ? 'bg-green-500' : 'bg-primary'}`} 
                    style={{ width: `${Math.max(0, Math.min(100, (collectiveMonthlyXp / currentGoal.target_xp) * 100))}%` }} />
                </div>
                <p className="text-[10px] text-text-sub mt-1.5 font-bold uppercase tracking-wider">
                  {currentGoal.achieved ? '✓ Meta Concluída e Celebrada!' : `${Math.max(0, currentGoal.target_xp - collectiveMonthlyXp).toLocaleString('pt-MZ')} XP em falta`}
                </p>
              </div>

              {/* Goal Celebration action for GP */}
              {!currentGoal.achieved && collectiveMonthlyXp >= currentGoal.target_xp && (
                <button onClick={handleAchieveGoal} disabled={savingGoal}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-green-500/10">
                  {savingGoal ? 'A celebrar...' : 'Celebrar Conquista (+XP p/ Equipa)'}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-4xl text-text-sub mb-2">emoji_events</span>
              <p className="text-xs text-text-sub">Nenhuma meta configurada para este mês.</p>
              {isGP && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                  <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="Meta de XP Coletivo"
                    className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-800 outline-none" />
                  <button onClick={handleSetGoal} disabled={savingGoal || !goalTarget}
                    className="w-full bg-primary text-white font-bold text-xs py-2 rounded-xl">
                    Definir Meta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Monthly Titles list */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-colors duration-300">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-sub mb-4">Galeria de Títulos Mensais</h3>
          {monthlyTitles.length === 0 ? (
            <p className="text-xs text-text-sub text-center py-6">Nenhum título atribuído ainda.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {monthlyTitles.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800/40 rounded-2xl">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl">award_star</span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-black">{t.title_type}</p>
                    <p className="text-[10px] text-text-sub truncate">{t.user_name} · {t.month}</p>
                  </div>
                  <span className="ml-auto text-xs font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-lg shrink-0">+{t.xp_awarded} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
