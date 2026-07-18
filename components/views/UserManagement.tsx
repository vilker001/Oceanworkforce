import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/lib/supabase';
import { User, UserRole } from '../../types';
import { DEFAULT_AVATAR } from '../../constants';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; isDanger?: boolean } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Colaborador');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const roles: UserRole[] = [
    'Gestor de Projetos',
    'Gestor Técnico',
    'Gestor de Trading',
    'Fotógrafo',
    'Promotor de Venda',
    'Colaborador'
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      if (error) throw error;
      setUsers((data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        avatar: u.avatar || DEFAULT_AVATAR,
        must_change_password: u.must_change_password,
        is_blocked: u.is_blocked
      })));
    } catch (e) {
      console.error('Erro ao buscar utilizadores:', e);
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('Colaborador');
    setPassword('OceanTeam2026');
    setAvatar('');
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email || '');
    setRole(u.role);
    setPassword('');
    setAvatar(u.avatar);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name || (!editingUser && (!email || !password))) {
      alert('Por favor preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        // Edit existing user profile in public table
        const { error } = await supabase
          .from('users')
          .update({
            name,
            role,
            avatar: avatar || DEFAULT_AVATAR
          })
          .eq('id', editingUser.id);
        if (error) throw error;
        alert('Perfil atualizado com sucesso!');
      } else {
        // Create new user using the Security Definer Postgres RPC function
        const finalAvatar = avatar || `https://ui-avatars.com/api/?background=0D8ABC&color=fff&name=${encodeURIComponent(name)}`;
        const { data: newUserId, error } = await supabase.rpc('create_new_user', {
          p_email: email,
          p_password: password,
          p_name: name,
          p_role: role,
          p_avatar: finalAvatar
        });

        if (error) throw error;
        alert(`Conta criada com sucesso! ID: ${newUserId}`);
      }
      setShowModal(false);
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar utilizador: ${e.message || JSON.stringify(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: User) => {
    setConfirmDialog({
      title: 'Apagar Colaborador',
      message: `Tem a certeza que deseja APAGAR a conta de ${user.name}? Esta ação é irreversível e removerá o acesso desta pessoa ao sistema.`,
      isDanger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const { error } = await supabase.rpc('delete_user_admin', { p_user_id: user.id });
          if (error) throw error;
          alert(`Conta de ${user.name} apagada com sucesso.`);
          fetchUsers();
        } catch (e: any) {
          console.error(e);
          alert(`Erro ao apagar conta: ${e.message}`);
        }
      }
    });
  };

  const handleToggleBlock = (user: User) => {
    const isBlocking = !user.is_blocked;
    setConfirmDialog({
      title: isBlocking ? 'Bloquear Colaborador' : 'Desbloquear Colaborador',
      message: isBlocking 
        ? `Deseja BLOQUEAR o acesso de ${user.name} ao sistema?` 
        : `Deseja DESBLOQUEAR o acesso de ${user.name}?`,
      isDanger: isBlocking,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const { error } = await supabase.rpc('toggle_block_user', { p_user_id: user.id, p_block: isBlocking });
          if (error) throw error;
          alert(`Acesso de ${user.name} ${isBlocking ? 'bloqueado' : 'desbloqueado'}.`);
          fetchUsers();
        } catch (e: any) {
          console.error(e);
          alert(`Erro ao ${isBlocking ? 'bloquear' : 'desbloquear'} conta: ${e.message}`);
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black">Gestão de Utilizadores</h2>
          <p className="text-sm text-text-sub">Crie e administre os perfis e acessos dos colaboradores</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
          <span className="material-symbols-outlined text-lg">person_add</span> Novo Colaborador
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm transition-colors duration-300">
        {loading ? (
          <p className="text-center py-8 text-text-sub">A carregar colaboradores...</p>
        ) : users.length === 0 ? (
          <p className="text-center py-8 text-text-sub">Nenhum colaborador registado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-text-sub">
                  <th className="pb-3">Colaborador</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Cargo</th>
                  <th className="pb-3 text-center">Primeiro Acesso</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/40">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/20 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} className="size-9 rounded-xl object-cover" alt="" />
                        <span className="text-sm font-black">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-text-sub">{u.email || '—'}</td>
                    <td className="py-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.must_change_password ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                      }`}>
                        {u.must_change_password ? 'Pendente' : 'Concluído'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-blue-500" title="Editar Cargo e Perfil">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => handleToggleBlock(u)} className={`p-2 rounded-lg transition-colors ${u.is_blocked ? 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500' : 'hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-500'}`} title={u.is_blocked ? "Desbloquear Acesso" : "Bloquear Acesso"}>
                          <span className="material-symbols-outlined text-lg">{u.is_blocked ? 'lock_open' : 'block'}</span>
                        </button>
                        <button onClick={() => handleDelete(u)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500" title="Apagar Conta">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-black text-lg">{editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
              <button onClick={() => setShowModal(false)} className="text-text-sub hover:text-text-main">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Nome Completo *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva"
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Cargo / Função *</label>
                <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">URL do Avatar (Opcional)</label>
                <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="https://..."
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-sub uppercase mb-1.5 block">Email *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com"
                      className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-xs flex gap-2 items-start mt-2">
                    <span className="material-symbols-outlined text-sm">info</span>
                    <p>A senha inicial será <strong>OceanTeam2026</strong>. O colaborador será forçado a alterar esta senha e definir o seu Avatar no primeiro login.</p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
                  {saving ? 'A guardar...' : 'Criar / Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-zinc-800 scale-in-center">
            <div className="flex flex-col items-center text-center">
              <div className={`size-16 rounded-full flex items-center justify-center mb-4 ${confirmDialog.isDanger ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : 'bg-primary/10 text-primary'}`}>
                <span className="material-symbols-outlined text-3xl">{confirmDialog.isDanger ? 'warning' : 'info'}</span>
              </div>
              <h3 className="font-black text-xl mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-text-sub mb-6">{confirmDialog.message}</p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gray-100 dark:bg-zinc-800 text-text-main hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDialog.onConfirm}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all ${
                    confirmDialog.isDanger 
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20 hover:shadow-red-500/40' 
                      : 'bg-primary hover:bg-primary/90 shadow-primary/20 hover:shadow-primary/40'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
