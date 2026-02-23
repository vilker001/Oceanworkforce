import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../src/lib/supabase';
import { User } from '../../types';

interface Notification {
    id: string;
    title: string;
    description: string;
    type: 'task_assigned' | 'deadline_24h' | 'deadline_today' | 'task_overdue';
    read: boolean;
    created_at: string;
    task_id?: string;
}

interface NotificationCenterProps {
    user: User;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ user }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user) return;
        fetchNotifications();

        // Subscribe to new notifications
        const subscription = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE)
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id || (user as any).id}`, // Handle both likely ID locations if type mismatch
                },
                (payload) => {
                    console.log('Notification update:', payload);
                    fetchNotifications(); // Refresh list on any change
                }
            )
            .subscribe();

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            subscription.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [user]);

    const fetchNotifications = async () => {
        try {
            // Need user ID. Assuming user object has ID or we can get it from auth
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', authUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Ensure date is cast correctly if needed
            const typedData = (data as any[]).map(n => ({
                ...n,
                read: n.read || n.is_read || false // Handle both naming conventions just in case
            })) as Notification[];

            setNotifications(typedData);
            setUnreadCount(typedData.filter(n => !n.read).length);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setNotifications((prev: Notification[]) => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', authUser.id)
                .eq('read', false); // Only update unread ones

            if (error) throw error;

            fetchNotifications();
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'task_assigned': return 'assignment_ind';
            case 'deadline_today': return 'alarm';
            case 'deadline_24h': return 'calendar_clock';
            case 'task_overdue': return 'warning';
            default: return 'notifications';
        }
    };

    const getColor = (type: Notification['type']) => {
        switch (type) {
            case 'task_assigned': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case 'deadline_today': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
            case 'deadline_24h': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
            case 'task_overdue': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative size-10 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            >
                <span className={`material-symbols-outlined text-gray-600 dark:text-gray-300 ${unreadCount > 0 ? 'animate-pulse' : ''}`}>notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm border-2 border-white dark:border-zinc-950">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 z-[100] animate-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-800/20">
                        <h3 className="font-bold text-sm">Notificações</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[10px] uppercase font-black tracking-wider text-primary hover:text-primary-dark transition-colors">
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-text-sub flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined text-4xl opacity-20">notifications_off</span>
                                <p className="text-xs">Nenhuma notificação no momento.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.read && markAsRead(notification.id)}
                                        className={`p-4 border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer flex gap-3 relative ${!notification.read ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                                    >
                                        <div className={`size-8 rounded-lg shrink-0 flex items-center justify-center ${getColor(notification.type)}`}>
                                            <span className="material-symbols-outlined text-sm">{getIcon(notification.type)}</span>
                                        </div>
                                        <div className="flex flex-col gap-1 pr-6">
                                            <h4 className={`text-xs font-bold ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {notification.title}
                                            </h4>
                                            <p className="text-[11px] text-text-sub leading-snug">{notification.description}</p>
                                            <span className="text-[9px] text-gray-400 mt-1">
                                                {new Date(notification.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {!notification.read && (
                                            <div className="absolute top-4 right-4 size-2 bg-blue-500 rounded-full"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
