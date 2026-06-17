import React, { useState } from 'react';
import { Logo } from '../../constants';
import { supabase } from '../../src/lib/supabase';

interface ChangePasswordProps {
  userId: string;
  onPasswordChanged: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ userId, onPasswordChanged }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) throw authError;

      // 2. Update must_change_password to false in public.users and save additional data
      const finalAvatar = avatar.trim() || `https://ui-avatars.com/api/?background=random&color=fff&name=Colaborador`;
      const updateData: any = { must_change_password: false, avatar: finalAvatar };
      if (phone.trim()) updateData.phone = phone.trim();
      if (employeeId.trim()) updateData.employee_id = employeeId.trim();
      if (birthDate.trim()) updateData.birth_date = birthDate.trim();
      if (gender.trim()) updateData.gender = gender.trim();

      const { error: dbError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (dbError) throw dbError;

      alert('Password alterada com sucesso!');
      onPasswordChanged();

    } catch (err: any) {
      console.error('Change password error:', err);
      setError(err.message || 'Erro ao alterar a password. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-8 lg:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 size-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Logo className="h-12" variant="black" />
            <h1 className="text-3xl font-black tracking-tight mt-2">Alterar Password</h1>
            <p className="text-text-sub text-sm font-medium">
              Por motivos de segurança, deves alterar a tua password inicial no primeiro login.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">
                Nova Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 pr-12 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                  placeholder="Introduza a nova password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-main transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">
                Confirmar Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 pr-12 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                  placeholder="Confirme a nova password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-main transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">
                Número de Celular
              </label>
              <input
                type="tel"
                required
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                placeholder="Ex: 840000000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">
                ID de Funcionário (Opcional)
              </label>
              <input
                type="text"
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                placeholder="Ex: FUNC-001"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">
                Data de Nascimento
              </label>
              <input
                type="date"
                required
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm font-bold outline-none transition-all"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">
                Género
              </label>
              <select
                required
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm font-bold outline-none transition-all"
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                <option value="" disabled>Selecione o Género</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Prefiro não dizer">Prefiro não dizer</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-4">
                Foto de Perfil / Avatar (Opcional)
              </label>
              <input
                type="url"
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-4 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                placeholder="https://link-para-a-sua-foto.jpg"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold text-center mt-2 px-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Guardar e Continuar'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
