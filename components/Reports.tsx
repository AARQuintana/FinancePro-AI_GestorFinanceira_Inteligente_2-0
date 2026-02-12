
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, Client, AppView } from '../types';
import { 
  FileSpreadsheet, Layers, FileText, Wallet, ArrowUpRight, 
  ArrowDownRight, LineChart as LineChartIcon, LayoutList, 
  HandCoins, Receipt, AlertTriangle, Filter, CheckCircle2, 
  Activity, Clock, Calendar, Search, RefreshCw, X, Download,
  UserX, History, CalendarX, Sparkles, BrainCircuit, Info,
  TrendingUp, TrendingDown, Target, Zap
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, AreaChart, Area, Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getFinancialInsights, InsightContext } from '../services/geminiService';

interface ReportsProps {
  transactions: Transaction[];
  clients: Client[];
}

type ReportTab = 'all' | 'receivable' | 'payable' | 'overdue' | 'inactive_clients';
type InactiveTimeFilter = 'all' | '3m' | '6m' | '12m';

const Reports: React.FC<ReportsProps> = ({ transactions, clients }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [compareYear, setCompareYear] = useState(false);
  
  // Estados de Filtros para Inativos
  const [inactiveTime, setInactiveTime] = useState<InactiveTimeFilter>('all');
  const [minVolume, setMinVolume] = useState<number>(0);

  // Estados de IA
  const [aiTabInsights, setAiTabInsights] = useState<Record<string, string | null>>({});
  const [loadingAi, setLoadingAi] = useState(false);

  // Refs para exportação de imagem
  const areaChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);

  // Filtragem de transações para abas normais
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.dueDate);
      const matchesDate = 
        (!startDate || tDate >= new Date(startDate)) && 
        (!endDate || tDate <= new Date(endDate));
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        t.description.toLowerCase().includes(searchLower) || 
        t.clientName.toLowerCase().includes(searchLower) ||
        (t.category || '').toLowerCase().includes(searchLower);

      let matchesTab = true;
      if (activeTab === 'receivable') matchesTab = t.type === 'income' && (t.status === 'pending' || t.status === 'overdue');
      if (activeTab === 'payable') matchesTab = t.type === 'expense' && (t.status === 'pending' || t.status === 'overdue');
      if (activeTab === 'overdue') matchesTab = t.status === 'overdue';
      if (activeTab === 'inactive_clients') matchesTab = false;

      return matchesDate && matchesSearch && matchesTab;
    });
  }, [transactions, activeTab, startDate, endDate, searchTerm]);

  // Dados de Clientes Inativos com Filtros Dinâmicos
  const inactiveClientsData = useMemo(() => {
    const now = new Date();
    return clients
      .filter(c => c.status === 'Inativo')
      .map(client => {
        const clientTransactions = transactions.filter(t => t.clientId === client.id);
        const lastTransaction = clientTransactions.length > 0 
          ? clientTransactions.reduce((prev, curr) => new Date(curr.dueDate) > new Date(prev.dueDate) ? curr : prev)
          : null;
        
        const totalValue = clientTransactions.reduce((acc, t) => acc + t.amount, 0);
        const lastActivityDate = [client.followUpDate, lastTransaction?.dueDate]
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

        return {
          ...client,
          totalValue,
          transactionCount: clientTransactions.length,
          lastActivityDate
        };
      })
      .filter(c => {
        if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (minVolume > 0 && c.totalValue < minVolume) return false;
        if (inactiveTime !== 'all' && c.lastActivityDate) {
          const lastDate = new Date(c.lastActivityDate);
          const diffMs = now.getTime() - lastDate.getTime();
          const monthsDiff = diffMs / (1000 * 60 * 60 * 24 * 30.44);
          if (inactiveTime === '3m' && monthsDiff < 3) return false;
          if (inactiveTime === '6m' && monthsDiff < 6) return false;
          if (inactiveTime === '12m' && monthsDiff < 12) return false;
        }
        return true;
      });
  }, [clients, transactions, inactiveTime, minVolume, searchTerm]);

  // FIX: Added 'stats' useMemo to calculate income and expense totals for the report
  const stats = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  const handleFetchTabInsights = async () => {
    setLoadingAi(true);
    let context: InsightContext = 'general';
    let extra = "";

    if (activeTab === 'receivable') context = 'receivable';
    else if (activeTab === 'payable') context = 'payable';
    else if (activeTab === 'overdue') context = 'overdue';
    else if (activeTab === 'inactive_clients') {
      context = 'inactive';
      const summary = inactiveClientsData.slice(0, 10).map(c => 
        `Cliente: ${c.name}, Total: R$ ${c.totalValue}, Último contato: ${c.lastActivityDate || 'N/A'}, Nota: ${c.followUpNote || 'Sem nota'}`
      ).join('\n');
      extra = `Lista de inativos para win-back:\n${summary}`;
    }

    const text = await getFinancialInsights(activeTab === 'inactive_clients' ? [] : filteredTransactions, context, extra);
    setAiTabInsights(prev => ({ ...prev, [activeTab]: text || null }));
    setLoadingAi(false);
  };

  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];

    if (activeTab === 'inactive_clients') {
      headers = [
        'Nome do Cliente', 'E-mail', 'Telefone', 'Status', 
        'Total Negociado (R$)', 'Nº de Transações', 
        'Data Última Atividade', 'Data Próximo Follow-up', 'Notas de Follow-up'
      ];
      rows = inactiveClientsData.map(c => [
        `"${c.name.replace(/"/g, '""')}"`, 
        `"${c.email.replace(/"/g, '""')}"`, 
        `"${c.phone}"`, 
        c.status, 
        c.totalValue.toFixed(2).replace('.', ','), 
        c.transactionCount,
        c.lastActivityDate || 'N/A',
        c.followUpDate || 'N/A',
        `"${(c.followUpNote || '').replace(/"/g, '""')}"`
      ]);
    } else {
      headers = ['ID Lançamento', 'Descrição', 'Valor (R$)', 'Data Vencimento', 'Tipo', 'Status', 'Categoria', 'Entidade / Cliente'];
      const isFullDetail = activeTab === 'all' || activeTab === 'receivable' || activeTab === 'payable';
      if (isFullDetail) {
        headers.push('Método de Pagamento', 'Observações Internas');
      }
      rows = filteredTransactions.map(t => {
        const row = [
          t.id.toUpperCase(),
          `"${t.description.replace(/"/g, '""')}"`,
          t.amount.toFixed(2).replace('.', ','),
          new Date(t.dueDate).toLocaleDateString('pt-BR'),
          t.type === 'income' ? 'Receita' : 'Despesa',
          t.status.toUpperCase(),
          `"${(t.category || 'N/A').replace(/"/g, '""')}"`,
          `"${t.clientName.replace(/"/g, '""')}"`
        ];
        if (isFullDetail) {
          row.push(`"${(t.paymentMethod || 'N/A').replace(/"/g, '""')}"`, `"${(t.observations || '').replace(/"/g, '""')}"`);
        }
        return row;
      });
    }

    const csvContent = ['\ufeff' + headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financepro_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const chartData = useMemo(() => {
    const monthly: Record<string, { income: number; expense: number; monthName: string; timestamp: number }> = {};
    const dataToUse = activeTab === 'inactive_clients' ? transactions : filteredTransactions;

    dataToUse.forEach(t => {
      const date = new Date(t.dueDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) {
        monthly[key] = { 
          income: 0, 
          expense: 0, 
          monthName: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime()
        };
      }
      if (t.type === 'income') monthly[key].income += t.amount;
      else monthly[key].expense += t.amount;
    });

    return Object.entries(monthly)
      .map(([key, data]) => ({ key, ...data, balance: data.income - data.expense }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-12);
  }, [filteredTransactions, transactions, activeTab]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit overflow-x-auto">
          <TabButton active={activeTab === 'all'} label="Geral" icon={LayoutList} onClick={() => setActiveTab('all')} />
          <TabButton active={activeTab === 'receivable'} label="A Receber" icon={HandCoins} color="text-emerald-500" onClick={() => setActiveTab('receivable')} />
          <TabButton active={activeTab === 'payable'} label="A Pagar" icon={Receipt} color="text-blue-500" onClick={() => setActiveTab('payable')} />
          <TabButton active={activeTab === 'overdue'} label="Atrasados" icon={AlertTriangle} color="text-rose-500" onClick={() => setActiveTab('overdue')} />
          <TabButton active={activeTab === 'inactive_clients'} label="Inativos" icon={UserX} color="text-slate-400" onClick={() => setActiveTab('inactive_clients')} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder="Filtrar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none w-48" />
          </div>
          <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all"><FileSpreadsheet className="w-4 h-4" /> Exportar CSV</button>
        </div>
      </div>

      {/* DASHBOARD IA */}
      <div className="bg-slate-900 border border-emerald-500/10 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity"><BrainCircuit className="w-32 h-32" /></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl shadow-xl bg-emerald-500/10 text-emerald-500`}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Análise Estratégica AI</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">IA analisando dados da aba {activeTab}</p>
            </div>
          </div>
          <button onClick={handleFetchTabInsights} disabled={loadingAi} className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-[10px] font-black uppercase text-white shadow-lg disabled:opacity-50">
            {loadingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />} Analisar com IA
          </button>
        </div>
        {aiTabInsights[activeTab] && (
          <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">{aiTabInsights[activeTab]}</div>
          </div>
        )}
      </div>

      {/* GRÁFICOS */}
      {activeTab !== 'inactive_clients' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-[40px] p-8" ref={areaChartRef}>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="monthName" stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Area name="Receitas" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReport)" />
                  <Area name="Despesas" type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-6 text-emerald-500 self-start">
             <h4 className="text-[10px] font-black uppercase tracking-widest mb-2">Liquidez Total</h4>
             <p className="text-2xl font-black">R$ {(stats.income - stats.expense).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      )}

      {/* TABELA */}
      <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950/40">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase">Data/Evento</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase">Descrição</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase text-right">Valor</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {(activeTab === 'inactive_clients' ? inactiveClientsData : filteredTransactions).map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-all">
                  <td className="px-8 py-5 text-xs text-slate-400">
                    {activeTab === 'inactive_clients' ? (item.lastActivityDate || 'N/A') : new Date(item.dueDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-8 py-5"><div className="flex flex-col"><span className="text-sm font-bold text-white">{activeTab === 'inactive_clients' ? item.name : item.description}</span><span className="text-[10px] text-slate-500 uppercase">{activeTab === 'inactive_clients' ? item.email : (item.category || 'Geral')}</span></div></td>
                  <td className={`px-8 py-5 text-sm font-black text-right ${activeTab === 'inactive_clients' ? 'text-slate-300' : (item.type === 'income' ? 'text-emerald-500' : 'text-rose-500')}`}>
                    R$ {(activeTab === 'inactive_clients' ? item.totalValue : item.amount).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${item.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, label, icon: Icon, onClick, color = 'text-white' }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition-all ${active ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
    <Icon className={`w-4 h-4 ${active ? color : 'text-slate-500'}`} />{label}
  </button>
);

export default Reports;
