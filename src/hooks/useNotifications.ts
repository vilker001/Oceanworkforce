import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    user_id: string;
    task_id: string | null;
    type: 'task_assigned' | 'deadline_24h' | 'deadline_today' | 'task_overdue';
    title: string;
    description: string | null;
    is_read: boolean;
    created_at: string;
}

export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No authenticated user');

            const { data, error: fetchError } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            setNotifications(data || []);
            setUnreadCount((data || []).filter(n => !n.is_read).length);
        } catch (err: any) {
            console.error('Error fetching notifications:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (id: string) => {
        try {
            const { error: updateError } = await supabase
                .from('notifications')
                .update({ is_read: true } as any)
                .eq('id', id);

            if (updateError) throw updateError;

            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error: updateError } = await supabase
                .from('notifications')
                .update({ is_read: true } as any)
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (updateError) throw updateError;

            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (err: any) {
            console.error('Error marking all as read:', err);
        }
    };

    // Delete notification
    const deleteNotification = async (id: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            setNotifications(prev => prev.filter(n => n.id !== id));
            const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
            if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: any) {
            console.error('Error deleting notification:', err);
        }
    };

    // Create notification (for task assignment)
    const createNotification = async (
        userId: string,
        taskId: string,
        type: Notification['type'],
        title: string,
        description?: string
    ) => {
        try {
            const { error: insertError } = await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    task_id: taskId,
                    type,
                    title,
                    description: description || null
                } as any);

            if (insertError) throw insertError;
        } catch (err: any) {
            console.error('Error creating notification:', err);
        }
    };

    // Real-time subscription
    useEffect(() => {
        fetchNotifications();

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const subscription = supabase
                .channel('notifications_channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log('Notification change:', payload);
                        fetchNotifications();
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        };

        setupSubscription();
    }, []);

    return {
        notifications,
        loading,
        error,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        createNotification,
        refetch: fetchNotifications
    };
};
