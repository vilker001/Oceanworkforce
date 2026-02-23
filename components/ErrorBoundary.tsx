import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/10 p-4">
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl max-w-lg w-full border border-red-100 dark:border-red-900/30">
                        <div className="flex items-center gap-4 mb-6 text-red-600 dark:text-red-500">
                            <span className="material-symbols-outlined text-5xl">error</span>
                            <h1 className="text-2xl font-black">Algo deu errado</h1>
                        </div>

                        <p className="text-text-sub mb-6 font-medium">
                            Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
                        </p>

                        {this.state.error && (
                            <div className="bg-gray-100 dark:bg-black/30 p-4 rounded-xl mb-6 overflow-auto max-h-40 text-xs font-mono text-red-600 dark:text-red-400 border border-gray-200 dark:border-zinc-800">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
                            >
                                Recarregar Página
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                                className="px-4 py-3 rounded-xl font-bold border-2 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-text-sub"
                                title="Limpar dados locais e recarregar"
                            >
                                Resetar
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
