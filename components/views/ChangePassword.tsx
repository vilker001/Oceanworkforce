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

  // Validation helpers
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length === 9;

  const ageValid = (() => {
    if (!birthDate) return false;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 16;
  })();

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const genderValid = gender.trim() !== '';

  const formValid = passwordValid && passwordsMatch && phoneValid && ageValid && genderValid;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 9
    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhone(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordValid) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }
    if (!passwordsMatch) {
      setError('As passwords não coincidem.');
      return;
    }
    if (!phoneValid) {
      setError('O número de celular deve ter exactamente 9 dígitos.');
      return;
    }
    if (!ageValid) {
      setError('Tens de ter pelo menos 16 anos para usar esta plataforma.');
      return;
    }
    if (!genderValid) {
      setError('Por favor seleciona o teu género.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;

      // 2. Update must_change_password and save additional data
      const finalAvatar = avatar.trim() || `https://ui-avatars.com/api/?background=random&color=fff&name=Colaborador`;
      const updateData: any = {
        must_change_password: false,
        avatar: finalAvatar,
        phone: phoneDigits,
        gender: gender.trim(),
      };
      if (employeeId.trim()) updateData.employee_id = employeeId.trim();
      if (birthDate.trim()) updateData.birth_date = birthDate.trim();

      const { error: dbError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (dbError) throw dbError;

      alert('Perfil configurado com sucesso!');
      onPasswordChanged();

    } catch (err: any) {
      console.error('Change password error:', err);
      setError(err.message || 'Erro ao guardar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 flex flex-col p-4 sm:p-8 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden m-auto shrink-0">
        <div className="absolute top-0 right-0 -mt-24 -mr-24 size-80 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <Logo className="h-10" variant="black" />
            <h1 className="text-2xl font-black tracking-tight">Configurar Perfil</h1>
            <p className="text-text-sub text-xs font-medium">
              Por motivos de segurança, define a tua password e dados pessoais no primeiro login.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Nova Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-1">Nova Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`w-full bg-gray-50 dark:bg-zinc-800/50 border-2 rounded-2xl p-3 pr-12 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700 ${
                    password.length > 0
                      ? passwordValid ? 'border-green-400 focus:border-green-500' : 'border-red-400 focus:border-red-500'
                      : 'border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-main transition-colors">
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirmar Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-1">Confirmar Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className={`w-full bg-gray-50 dark:bg-zinc-800/50 border-2 rounded-2xl p-3 pr-12 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700 ${
                    confirmPassword.length > 0
                      ? passwordsMatch ? 'border-green-400 focus:border-green-500' : 'border-red-400 focus:border-red-500'
                      : 'border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                  placeholder="Repita a password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-text-main transition-colors">
                  <span className="material-symbols-outlined text-lg">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-red-500 text-[10px] font-bold ml-1">As passwords não coincidem.</p>
              )}
            </div>

            {/* Número de Celular */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-1">
                Número de Celular <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  className={`w-full bg-gray-50 dark:bg-zinc-800/50 border-2 rounded-2xl p-3 pr-20 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700 ${
                    phone.length > 0
                      ? phoneValid ? 'border-green-400 focus:border-green-500' : 'border-red-400 focus:border-red-500'
                      : 'border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                  placeholder="840000000"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={9}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black ${
                  phoneDigits.length === 9 ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {phoneDigits.length}/9
                </span>
              </div>
              {phone.length > 0 && !phoneValid && (
                <p className="text-red-500 text-[10px] font-bold ml-1">O número deve ter exactamente 9 dígitos.</p>
              )}
            </div>

            {/* ID de Funcionário */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-1">ID de Funcionário (Opcional)</label>
              <input
                type="text"
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-3 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                placeholder="Ex: FUNC-001"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
              />
            </div>

            {/* Data de Nascimento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-1">
                Data de Nascimento <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                className={`bg-gray-50 dark:bg-zinc-800/50 border-2 rounded-2xl p-3 text-sm font-bold outline-none transition-all ${
                  birthDate
                    ? ageValid ? 'border-green-400' : 'border-red-400'
                    : 'border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10'
                }`}
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
              />
              {birthDate && !ageValid && (
                <p className="text-red-500 text-[10px] font-bold ml-1">Tens de ter pelo menos 16 anos.</p>
              )}
            </div>

            {/* Género */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-1">
                Género <span className="text-red-400">*</span>
              </label>
              <select
                required
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-3 text-sm font-bold outline-none transition-all"
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                <option value="" disabled>Selecione o Género</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Prefiro não dizer">Prefiro não dizer</option>
              </select>
            </div>

            {/* Foto de Perfil */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-sub ml-1">Foto de Perfil / Avatar (Opcional)</label>
              <input
                type="url"
                className="bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl p-3 text-sm font-bold outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-zinc-700"
                placeholder="https://link-para-a-sua-foto.jpg"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-bold text-center px-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl py-2">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !formValid}
              className={`w-full py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 mt-2 ${
                formValid
                  ? 'bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                  : 'bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Guardar e Continuar
                </>
              )}
            </button>

            {!formValid && (
              <p className="text-center text-[10px] text-gray-400 font-medium -mt-2">
                Preenche todos os campos obrigatórios para continuar.
              </p>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};
