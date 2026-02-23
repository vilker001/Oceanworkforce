import React, { useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { useToast } from './ui/Toast';

export const GlobalNotificationListener: React.FC = () => {
    const { showToast } = useToast();

    useEffect(() => {
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
                        // Trigger toast
                        showToast(
                            'info',
                            newNotification.title || 'Nova notificação',
                            5000
                        );

                        // Play sound (optional)
                        try {
                            const audio = new Audio('/notification.mp3');
                            // simplistic, likely won't play without user interaction first but worth a try or just skip
                        } catch (e) { }
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

    return null; // Headless component
};
