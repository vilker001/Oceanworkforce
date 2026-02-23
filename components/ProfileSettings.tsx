import React, { useState, useRef } from 'react';
import { supabase } from '../src/lib/supabase';

interface ProfileSettingsProps {
    user: { name: string; role: string; avatar: string };
    onClose: () => void;
    onUpdate: (newAvatar: string) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onClose, onUpdate }) => {
    const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 2MB.');
            return;
        }

        setUploading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('No authenticated user');

            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('user-uploads')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('user-uploads')
                .getPublicUrl(filePath);

            setSelectedAvatar(publicUrl);
            alert('Foto carregada com sucesso!');
        } catch (error: any) {
            console.error('Error uploading file:', error);
            alert(error.message || 'Erro ao fazer upload da foto. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) throw new Error('No authenticated user');

            const { error } = await supabase
                .from('users')
                .update({ avatar: selectedAvatar } as any)
                .eq('id', authUser.id);

            if (error) throw error;

            onUpdate(selectedAvatar);
            onClose();
        } catch (error) {
            console.error('Error updating avatar:', error);
            alert('Erro ao atualizar foto. Tente novamente.');
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
                        <p className="text-sm text-text-sub mt-1">Personalize sua foto de perfil</p>
                    </div>
                    <button onClick={onClose} className="text-text-sub hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="mb-6 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                    <p className="text-xs font-bold text-text-sub uppercase mb-2">Informações</p>
                    <p className="text-sm font-black">{user.name}</p>
                    <p className="text-xs text-primary font-bold uppercase">{user.role}</p>
                </div>

                {/* Current Avatar Preview */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-text-sub uppercase mb-3 block">
                        Foto Atual
                    </label>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                        <img src={selectedAvatar} alt="Avatar atual" className="w-20 h-20 rounded-xl object-cover" />
                        <div className="flex-1">
                            <p className="text-xs text-text-sub">Sua foto de perfil atual</p>
                        </div>
                    </div>
                </div>

                {/* Upload Custom Photo */}
                <div className="mb-6">
                    <label className="text-sm font-bold text-text-sub uppercase mb-3 block">
                        Fazer Upload de Foto
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-4xl text-primary">
                            {uploading ? 'hourglass_empty' : 'cloud_upload'}
                        </span>
                        <p className="text-sm font-bold">
                            {uploading ? 'Fazendo upload...' : 'Clique para escolher uma foto'}
                        </p>
                        <p className="text-xs text-text-sub">JPG, PNG ou GIF (máx. 2MB)</p>
                    </button>
                </div>

                {/* Presets removed as per user request */}


                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-gray-200 dark:border-zinc-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading || selectedAvatar === user.avatar}
                        className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};
