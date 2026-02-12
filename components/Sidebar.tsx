
import React from 'react';
import { AppView } from '../types';
import { LayoutDashboard, ReceiptText, Users, PieChart, LogOut, Wallet, CalendarDays } from 'lucide-react';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onLogout }) => {
  const menuItems = [
    { view: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { view: AppView.TRANSACTIONS, label: 'Lançamentos', icon: ReceiptText },
    { view: AppView.CLIENTS, label: 'Clientes', icon: Users },
    { view: AppView.CALENDAR, label: 'Agenda', icon: CalendarDays },
    { view: AppView.REPORTS, label: 'Relatórios', icon: PieChart },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-emerald-500/20 p-2 rounded-lg">
          <Wallet className="w-6 h-6 text-emerald-500" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">FinancePro</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeView === item.view
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
