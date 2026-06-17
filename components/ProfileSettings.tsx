import React, { useState, useRef } from 'react';
import { supabase } from '../src/lib/supabase';

interface ProfileSettingsProps {
    user: { 
        name: string; 
        role: string; 
        avatar: string;
        phone?: string;
        employeeId?: string;
        birthDate?: string;
        gender?: string;
    };
    onClose: () => void;
    onUpdate: (newAvatar: string, newName: string) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onClose, onUpdate }) => {
    const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
    const [name, setName] = useState(user.name);
    const [phone, setPhone] = useState(user.phone || '');
    const [employeeId, setEmployeeId] = useState(user.employeeId || '');
    const [birthDate, setBirthDate] = useState(user.birthDate || '');
    const [gender, setGender] = useState(user.gender || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 2MB.');
            return;
        }

        setUploading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('No authenticated user');

            const fileExt = file.name.split('.').pop();
            const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('user-uploads')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('user-uploads')
                .getPublicUrl(filePath);

            setSelectedAvatar(publicUrl);
            alert('Foto carregada com sucesso!');
        } catch (err: any) {
            console.error('Error uploading file:', err);
            alert(err.message || 'Erro ao fazer upload da foto. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password) {
            if (password.length < 6) {
                setError('A password deve ter pelo menos 6 caracteres.');
                return;
            }
            if (password !== confirmPassword) {
                setError('As passwords não coincidem.');
                return;
            }
        }

        setSaving(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('No authenticated user');

            // 1. Update Name and Avatar in public.users
            const { error: dbError } = await supabase
                .from('users')
                .update({ 
                    name: name.trim(), 
                    avatar: selectedAvatar,
                    phone: phone.trim(),
                    employee_id: employeeId.trim(),
                    birth_date: birthDate.trim(),
                    gender: gender.trim()
                } as any)
                .eq('id', authUser.id);

            if (dbError) throw dbError;

            // 2. Update password in Supabase Auth if provided
            if (password) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: password
                });
                if (authError) throw authError;
            }

            alert('Perfil atualizado com sucesso!');
            onUpdate(selectedAvatar, name.trim());
            onClose();
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Erro ao atualizar o perfil. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-black">Configurações de Perfil</h2>
                        <p className="text-sm text-text-sub mt-1">Personalize suas informações</p>
                    </div>
                    <button onClick={onClose} className="text-text-sub hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSave} className="flex flex-col gap-5">
                    {/* Role Read-Only Info */}
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-text-sub uppercase">Cargo Operacional</p>
                            <p className="text-xs text-primary font-black uppercase mt-0.5">{user.role}</p>
                        </div>
                        <span className="material-symbols-outlined text-zinc-400">lock</span>
                    </div>

                    {/* Username Input */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-text-sub ml-1">Nome de Utilizador</label>
                        <input
                            type="text"
                            required
                            className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-text-sub ml-1">Nº Celular</label>
                            <input
                                type="text"
                                className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-text-sub ml-1">ID Funcionário</label>
                            <input
                                type="text"
                                className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                                value={employeeId}
                                onChange={e => setEmployeeId(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-text-sub ml-1">Nascimento</label>
                            <input
                                type="date"
                                className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                                value={birthDate}
                                onChange={e => setBirthDate(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-text-sub ml-1">Género</label>
                            <select
                                className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                <option value="Masculino">Masculino</option>
                                <option value="Feminino">Feminino</option>
                                <option value="Prefiro não dizer">Prefiro não dizer</option>
                            </select>
                        </div>
                    </div>

                    {/* Current Avatar Preview & Upload */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                        <img src={selectedAvatar} alt="Avatar" className="w-16 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700" />
                        <div className="flex-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black px-4 py-2.5 rounded-xl transition-all"
                            >
                                {uploading ? 'Carregando...' : 'Alterar Foto'}
                            </button>
                        </div>
                    </div>

                    {/* Change Password Inputs */}
                    <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 flex flex-col gap-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-text-sub ml-1">Alterar Password (Opcional)</p>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-sub ml-1">Nova Password</label>
                          <input
                              type="password"
                              className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                              placeholder="Nova password (mín. 6 caracteres)"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-sub ml-1">Confirmar Nova Password</label>
                          <input
                              type="password"
                              className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border-none outline-none font-bold text-sm"
                              placeholder="Confirme a nova password"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                          />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl font-bold text-sm text-text-sub transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || uploading}
                            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
