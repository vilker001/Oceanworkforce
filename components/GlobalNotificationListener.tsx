import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { useToast } from './ui/Toast';

export const GlobalNotificationListener: React.FC = () => {
    const { showToast } = useToast();
    const [demands, setDemands] = useState<any[]>([]);

    useEffect(() => {
        const fetchDemands = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch existing unread demands
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_read', false)
                .eq('title', 'O Gestor está a cobrar esta tarefa!');
            
            if (data && !error) {
                setDemands(data);
            }
        };

        fetchDemands();

        const setupListener = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const subscription = supabase
                .channel('global_notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        const newNotification = payload.new as any;
                        
                        if (newNotification.title === 'O Gestor está a cobrar esta tarefa!') {
                            setDemands(prev => [...prev, newNotification]);
                            try {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                audio.play().catch(() => {});
                            } catch (e) {}
                        } else {
                            // Trigger toast for normal notifications
                            showToast(
                                'info',
                                newNotification.title || 'Nova notificação',
                                5000
                            );
                        }
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        };

        const cleanupPromise = setupListener();

        return () => {
            cleanupPromise.then(cleanup => cleanup && cleanup());
        };
    }, [showToast]);

    const handleDismissDemand = async (id: string) => {
        setDemands(prev => prev.filter(d => d.id !== id));
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
    };

    if (demands.length > 0) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="bg-red-600 w-full max-w-md rounded-3xl p-8 flex flex-col gap-6 shadow-2xl border border-red-500 animate-pulse-slow">
                    <div className="flex flex-col items-center text-center gap-4 text-white">
                        <span className="material-symbols-outlined text-6xl">warning</span>
                        <h2 className="text-2xl font-black uppercase tracking-wider">Atenção Prioritária</h2>
                        <p className="text-sm font-bold opacity-90">
                            {demands[0].description}
                        </p>
                    </div>
                    <button 
                        onClick={() => handleDismissDemand(demands[0].id)}
                        className="w-full py-4 bg-white text-red-600 rounded-xl font-black uppercase text-sm hover:scale-105 transition-transform">
                        Entendido, vou atualizar
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
