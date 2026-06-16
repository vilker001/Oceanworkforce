import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (val: boolean) => void }) | null>(null);

  const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof options === 'string') {
        setDialog({
          title: 'Confirmação',
          message: options,
          resolve,
        });
      } else {
        setDialog({
          title: options.title || 'Confirmação',
          message: options.message,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          isDanger: options.isDanger,
          resolve,
        });
      }
    });
  };

  const handleConfirm = () => {
    if (dialog) {
      dialog.resolve(true);
      setDialog(null);
    }
  };

  const handleCancel = () => {
    if (dialog) {
      dialog.resolve(false);
      setDialog(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-zinc-800 scale-in-center">
            <div className="flex flex-col items-center text-center">
              <div className={`size-16 rounded-full flex items-center justify-center mb-4 ${dialog.isDanger ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : 'bg-primary/10 text-primary'}`}>
                <span className="material-symbols-outlined text-3xl">{dialog.isDanger ? 'warning' : 'help_outline'}</span>
              </div>
              <h3 className="font-black text-xl mb-2">{dialog.title}</h3>
              <p className="text-sm text-text-sub mb-6 whitespace-pre-wrap">{dialog.message}</p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={handleCancel}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gray-100 dark:bg-zinc-800 text-text-main hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  {dialog.cancelText || 'Cancelar'}
                </button>
                <button 
                  onClick={handleConfirm}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all ${
                    dialog.isDanger 
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20 hover:shadow-red-500/40' 
                      : 'bg-primary hover:bg-primary/90 shadow-primary/20 hover:shadow-primary/40'
                  }`}
                >
                  {dialog.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
