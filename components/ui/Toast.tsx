import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, type, message, duration }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-lg border-l-4 flex items-center gap-3 animate-in slide-in-from-right-full duration-300 ${toast.type === 'success' ? 'bg-white dark:bg-zinc-800 border-green-500 text-green-700 dark:text-green-400' :
                                toast.type === 'error' ? 'bg-white dark:bg-zinc-800 border-red-500 text-red-700 dark:text-red-400' :
                                    toast.type === 'warning' ? 'bg-white dark:bg-zinc-800 border-amber-500 text-amber-700 dark:text-amber-400' :
                                        'bg-white dark:bg-zinc-800 border-blue-500 text-blue-700 dark:text-blue-400'
                            }`}
                    >
                        <span className="material-symbols-outlined">
                            {toast.type === 'success' ? 'check_circle' :
                                toast.type === 'error' ? 'error' :
                                    toast.type === 'warning' ? 'warning' : 'info'}
                        </span>
                        <p className="text-sm font-medium dark:text-zinc-100">{toast.message}</p>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
