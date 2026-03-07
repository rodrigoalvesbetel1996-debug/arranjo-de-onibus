
import React from 'react';
import { UserRole, User } from '@/types';

interface LayoutProps {
  user: User;
  children: React.ReactNode;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, children, onLogout, onNavigate, currentView, isDarkMode, toggleTheme }) => {
  const isAdmin = user.role === UserRole.ADMIN;

  const NavItem = ({ view, label, icon }: { view: string, label: string, icon: string }) => (
    <button
      onClick={() => onNavigate(view)}
      className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 ${
        currentView === view 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none font-semibold' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
      }`}
    >
      <span className="text-lg opacity-90">{icon}</span>
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 z-20 sticky top-0 md:h-screen">
        <div className="mb-6 px-2 pt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm text-sm">JW</div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">Transporte</h1>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 text-sm"
            aria-label="Alternar tema"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <nav className="flex-1 space-y-0.5">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu</p>
          </div>
          <NavItem view="dashboard" label="Dashboard" icon="📊" />
          {isAdmin && (
            <>
              <NavItem view="events" label="Eventos" icon="📅" />
              <NavItem view="congregations" label="Congregações" icon="🏢" />
              <NavItem view="users" label="Usuários" icon="👥" />
              <NavItem view="sh-report" label="Relatórios SH" icon="📝" />
            </>
          )}
          {!isAdmin && (
            <>
              <NavItem view="passengers" label="Passageiros" icon="🚌" />
              <NavItem view="finance" label="Financeiro" icon="💰" />
              <NavItem view="sh-report" label="Relatório SH" icon="📝" />
            </>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="px-3 py-3 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Usuário</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{user.name}</p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{user.role === UserRole.ADMIN ? 'Administrador' : 'Gestor'}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-3 w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors group"
          >
            <span className="text-lg transition-transform group-hover:translate-x-[-2px]">🚪</span>
            <span className="text-sm font-semibold">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
