
import React, { useState } from 'react';
import { View, User, Task, Transaction } from '../types';
import { Logo } from '../constants';
import { LiveAssistant } from './LiveAssistant';
import { ProfileSettings } from './ProfileSettings';
import { NotificationCenter } from './ui/NotificationCenter';

interface LayoutProps {
  currentView: View;
  setView: (view: View) => void;
  onAddTask?: (task: Omit<Task, 'id' | 'status'>) => Task;
  onAddFinancial?: (transaction: Omit<Transaction, 'id' | 'status'>) => Transaction;
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onUpdateAvatar: (newAvatar: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  currentView,
  setView,
  onAddTask,
  onAddFinancial,
  children,
  user,
  onLogout,
  onUpdateAvatar
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const isProjectManager = user.role === 'Gestor de Projectos';
  const isAnyManager = [
    'Gestor de Projectos',
    'Gestor Criativo',
    'Gestor de Parceiros e Clientes',
    'Gestor de Trading e Negociação'
  ].includes(user.role);

  const navItems = [
    { id: View.DASHBOARD, label: 'Painel', icon: 'dashboard' },
    { id: View.CLIENTS, label: 'Pipeline', icon: 'hub' },
    { id: View.KANBAN, label: 'Tarefas', icon: 'task' },
    { id: View.CALENDAR, label: 'Calendário', icon: 'calendar_today' },
    ...(isAnyManager ? [
      { id: View.TEAM, label: 'Equipe', icon: 'groups' }
    ] : []),
    ...(isProjectManager ? [
      { id: View.FINANCE, label: 'Financeiro', icon: 'payments' }
    ] : []),
  ]; return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark text-text-main dark:text-gray-100 transition-colors duration-300">
      {/* Sidebar - Desktop & Tablet */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:static`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView(View.DASHBOARD); setIsMobileMenuOpen(false); }}>
              <Logo className="h-10" variant={isDarkMode ? 'white' : 'black'} />
            </div>
            <button className="lg:hidden text-text-sub" onClick={() => setIsMobileMenuOpen(false)}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${currentView === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-sub hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-text-main'
                  }`}
              >
                <span className={`material-symbols-outlined text-xl ${currentView === item.id ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 text-text-sub hover:text-text-main transition-colors mb-4"
          >
            <span className="material-symbols-outlined">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            <span className="text-sm font-bold">{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 flex items-center gap-3">
            <button onClick={() => setIsProfileSettingsOpen(true)} className="relative group">
              <img src={user.avatar} className="size-10 rounded-lg object-cover transition-all group-hover:ring-2 group-hover:ring-primary" alt="" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">edit</span>
              </div>
            </button>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-black truncate">{user.name}</p>
              <p className="text-[10px] text-text-sub font-bold uppercase truncate">{user.role}</p>
            </div>
            <button onClick={onLogout} className="text-text-sub hover:text-red-500 transition-colors" title="Sair">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark overflow-hidden relative">
        <header className="h-16 border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0 z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 -ml-2 text-text-sub"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="lg:hidden">
              <Logo className="h-8" variant={isDarkMode ? 'white' : 'black'} />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-sm font-black uppercase tracking-widest text-text-sub">
                {navItems.find(n => n.id === currentView)?.label || 'Sistema'}
              </h1>
            </div>
          </div>


          <div className="flex items-center gap-2 lg:gap-4">
            <NotificationCenter user={user} />
            <button
              onClick={() => setIsAssistantOpen(true)}
              className="bg-primary text-white px-3 lg:px-4 py-2 rounded-full text-[10px] lg:text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sm filled">temp_preferences_custom</span> <span className="hidden sm:inline">IA Assistant</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>

        {isAssistantOpen && (
          <LiveAssistant
            onClose={() => setIsAssistantOpen(false)}
            onAddTask={onAddTask}
            onAddFinancial={onAddFinancial}
          />
        )}

        {isProfileSettingsOpen && (
          <ProfileSettings
            user={user}
            onClose={() => setIsProfileSettingsOpen(false)}
            onUpdate={onUpdateAvatar}
          />
        )}
      </main>
    </div>
  );
};

