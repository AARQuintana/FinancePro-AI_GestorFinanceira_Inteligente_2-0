
import React, { useState, useRef, useEffect } from 'react';
import { User, AppView } from '../types';
import { Bell, Search, User as UserIcon, X, Trash2, Clock } from 'lucide-react';

interface HeaderProps {
  user: User;
  activeView: AppView;
  notifications?: string[];
  onClearNotification?: (index: number) => void;
  onClearAll?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  activeView, 
  notifications = [], 
  onClearNotification,
  onClearAll
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // FIX: Added missing [AppView.CALENDAR] to the titles record to resolve type error
  const viewTitles: Record<AppView, string> = {
    [AppView.DASHBOARD]: 'Visão Geral',
    [AppView.TRANSACTIONS]: 'Controle de Caixa',
    [AppView.CLIENTS]: 'Gestão de Clientes',
    [AppView.CALENDAR]: 'Agenda & Compromissos',
    [AppView.REPORTS]: 'Análises & Relatórios',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 md:h-20 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
      <h2 className="text-lg md:text-2xl font-semibold text-white">
        {viewTitles[activeView]}
      </h2>

      <div className="flex items-center gap-2 md:gap-6">
        <div className="hidden sm:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar..."
            className="bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-48 lg:w-64"
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 transition-colors relative rounded-full ${showNotifications ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 bg-emerald-500 rounded-full border-2 border-slate-950 text-[8px] font-bold text-white flex items-center justify-center animate-pulse">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Notificações</span>
                </div>
                {notifications.length > 0 && (
                  <button 
                    onClick={onClearAll}
                    className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors font-bold uppercase"
                  >
                    Limpar Tudo
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-slate-800/50">
                    {notifications.map((notif, idx) => (
                      <div key={idx} className="p-4 hover:bg-slate-800/30 transition-colors group flex items-start gap-3">
                        <div className="mt-1 p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-300 leading-snug">{notif}</p>
                          <p className="text-[10px] text-slate-600 mt-1 uppercase font-bold">Agora mesmo</p>
                        </div>
                        <button 
                          onClick={() => onClearNotification?.(idx)}
                          className="p-1 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                    <div className="p-3 bg-slate-800 rounded-full text-slate-600">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-slate-500">Você não possui novas notificações.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-2 md:pl-6 md:border-l border-slate-800">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
            <UserIcon className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
