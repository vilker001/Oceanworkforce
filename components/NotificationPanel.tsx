import React, { useState } from 'react';
import { useNotifications } from '../src/hooks/useNotifications';

export const NotificationPanel: React.FC = () => {
    const {
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications();

    const [isOpen, setIsOpen] = useState(false);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'task_assigned':
                return 'assignment';
            case 'deadline_24h':
                return 'schedule';
            case 'deadline_today':
                return 'today';
            case 'task_overdue':
                return 'warning';
            default:
                return 'notifications';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'task_assigned':
                return 'text-blue-500';
            case 'deadline_24h':
                return 'text-orange-500';
            case 'deadline_today':
                return 'text-red-500';
            case 'task_overdue':
                return 'text-red-600';
            default:
                return 'text-gray-500';
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `${diffDays}d atrás`;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
                <span className="material-symbols-outlined text-2xl text-text-sub">
                    notifications
                </span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 z-50 max-h-[600px] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-sm">Notificações</h3>
                                {unreadCount > 0 && (
                                    <p className="text-[10px] text-text-sub">
                                        {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
                                    </p>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                                >
                                    Marcar todas
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <span className="material-symbols-outlined text-4xl text-text-sub opacity-30 mb-2">
                                        notifications_off
                                    </span>
                                    <p className="text-sm font-bold text-text-sub">
                                        Nenhuma notificação
                                    </p>
                                    <p className="text-[10px] text-text-sub opacity-70 mt-1">
                                        Você está em dia com tudo!
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                                                }`}
                                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                                                    <span className="material-symbols-outlined text-xl">
                                                        {getNotificationIcon(notification.type)}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <h4 className={`text-xs font-bold leading-tight ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-text-sub'
                                                            }`}>
                                                            {notification.title}
                                                        </h4>
                                                        {!notification.is_read && (
                                                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                                                        )}
                                                    </div>
                                                    {notification.description && (
                                                        <p className="text-[11px] text-text-sub mb-2 line-clamp-2">
                                                            {notification.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-text-sub font-bold uppercase tracking-wider">
                                                            {formatTime(notification.created_at)}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                deleteNotification(notification.id);
                                                            }}
                                                            className="text-text-sub hover:text-red-500 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">
                                                                delete
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
