
import React, { useState } from 'react';
import { Transaction } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
// Added Activity icon to the imports below
import { AlertCircle, Sparkles, Wallet, TrendingUp, TrendingDown, Minus, CalendarDays, ArrowUpRight, ArrowDownRight, RefreshCw, BrainCircuit, Receipt, HandCoins, AlertTriangle, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { getFinancialInsights } from '../services/geminiService';

interface DashboardProps {
  transactions: Transaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Agregações para os indicadores rápidos da IA
  const aiSummary = React.useMemo(() => {
    return transactions.reduce((acc, t) => {
      if (t.status === 'pending') {
        if (t.type === 'income') acc.toReceive += t.amount;
        else acc.toPay += t.amount;
      } else if (t.status === 'overdue') {
        acc.overdue += t.amount;
      }
      return acc;
    }, { toReceive: 0, toPay: 0, overdue: 0 });
  }, [transactions]);

  // Calculate stats, trends and temporal summaries
  const { stats, trends, temporal } = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const todayStr = now.toDateString();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); 
    startOfWeek.setHours(0, 0, 0, 0);

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const initialStats = { totalIncome: 0, totalExpense: 0, overdue: 0 };
    const currMonthStats = { income: 0, expense: 0 };
    const prevMonthStats = { income: 0, expense: 0 };
    
    const todayStats = { income: 0, expense: 0 };
    const weekStats = { income: 0, expense: 0 };

    transactions.forEach(t => {
      const tDate = new Date(t.dueDate);
      const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      const isPrevMonth = tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;

      if (tDate.toDateString() === todayStr) {
        if (t.type === 'income') todayStats.income += t.amount;
        else todayStats.expense += t.amount;
      }
      
      if (tDate >= startOfWeek && tDate <= now) {
        if (t.type === 'income') weekStats.income += t.amount;
        else weekStats.expense += t.amount;
      }

      if (t.type === 'income') {
        initialStats.totalIncome += t.amount;
        if (isCurrentMonth) currMonthStats.income += t.amount;
        if (isPrevMonth) prevMonthStats.income += t.amount;
      } else {
        initialStats.totalExpense += t.amount;
        if (isCurrentMonth) currMonthStats.expense += t.amount;
        if (isPrevMonth) prevMonthStats.expense += t.amount;
      }
      
      const isOverdue = t.status === 'overdue';
      if (isOverdue) initialStats.overdue += t.amount;
    });

    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const incomeTrend = calcTrend(currMonthStats.income, prevMonthStats.income);
    const expenseTrend = calcTrend(currMonthStats.expense, prevMonthStats.expense);
    
    const currBalance = currMonthStats.income - currMonthStats.expense;
    const prevBalance = prevMonthStats.income - prevMonthStats.expense;
    const balanceTrend = calcTrend(currBalance, prevBalance);

    return {
      stats: initialStats,
      trends: {
        income: { value: incomeTrend, diff: currMonthStats.income - prevMonthStats.income },
        expense: { value: expenseTrend, diff: currMonthStats.expense - prevMonthStats.expense },
        balance: { value: balanceTrend, diff: currBalance - prevBalance }
      },
      temporal: {
        today: todayStats,
        week: weekStats
      }
    };
  }, [transactions]);

  const currentBalance = stats.totalIncome - stats.totalExpense;

  const chartData = React.useMemo(() => {
    const monthlyData: Record<string, { income: number; expense: number; month: Date }> = {};
    transactions.forEach(t => {
      const date = new Date(t.dueDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { income: 0, expense: 0, month: new Date(date.getFullYear(), date.getMonth(), 1) };
      }
      if (t.type === 'income') monthlyData[key].income += t.amount;
      else monthlyData[key].expense += t.amount;
    });

    return Object.entries(monthlyData)
      .map(([key, data]) => ({
        name: data.month.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receita: data.income,
        despesa: data.expense,
        timestamp: data.month.getTime()
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-6);
  }, [transactions]);

  const COLORS = ['#10b981', '#ef4444', '#3b82f6'];
  const pieData = [
    { name: 'Receitas', value: stats.totalIncome },
    { name: 'Despesas', value: stats.totalExpense },
    { name: 'Atraso', value: stats.overdue },
  ];

  const handleFetchInsights = async () => {
    setLoadingInsights(true);
    try {
        const text = await getFinancialInsights(transactions);
        setAiInsights(text || "Não foi possível coletar dados suficientes.");
    } catch (e) {
        setAiInsights("Houve um erro na comunicação com a IA. Verifique sua chave API.");
    } finally {
        setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      
      {/* SECTION: VISÃO INSTANTÂNEA */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Visão Instantânea do Negócio</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard 
            title="Total de Receitas" 
            value={stats.totalIncome} 
            icon={TrendingUp} 
            color="emerald" 
            trend={trends.income}
            description="Entradas brutas registradas"
          />
          <SummaryCard 
            title="Total de Despesas" 
            value={stats.totalExpense} 
            icon={TrendingDown} 
            color="rose" 
            trend={trends.expense}
            description="Saídas totais registradas"
          />
          <SummaryCard 
            title="Patrimônio Líquido" 
            value={currentBalance} 
            icon={Wallet} 
            color="blue" 
            trend={trends.balance}
            description="Diferença consolidada de caixa"
          />
        </div>
      </section>

      {/* SECTION: PERFORMANCE E INTELIGÊNCIA */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA (PRINCIPAL): ANÁLISE TEMPORAL E CFO */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Análise de Performance Temporal</h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
              <BarChart3 className="w-48 h-48" />
            </div>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-bold text-white">Evolução do Fluxo</h3>
                <p className="text-xs text-slate-500 mt-1">Histórico comparativo dos últimos 6 meses</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> RECEITAS
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> DESPESAS
                </div>
              </div>
            </div>
            
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <YAxis stroke="#475569" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cards Temporais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TemporalSummaryCard 
              title="Operações de Hoje" 
              income={temporal.today.income} 
              expense={temporal.today.expense} 
              icon={CalendarDays}
              accent="emerald"
            />
            <TemporalSummaryCard 
              title="Fechamento Semanal" 
              income={temporal.week.income} 
              expense={temporal.week.expense} 
              icon={RefreshCw}
              accent="blue"
            />
          </div>

          {/* CFO Virtual & Insights IA - MOVIDO PARA ABAIXO DOS CARDS TEMPORAIS */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">CFO Virtual & Insights IA</h2>
            </div>

            <div className="bg-slate-900 border border-emerald-500/20 rounded-[32px] overflow-hidden shadow-2xl relative group ring-1 ring-emerald-500/5 hover:ring-emerald-500/10 transition-all">
              <div className="p-8 border-b border-slate-800 bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">Análise Preditiva</h3>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Powered by Gemini Pro</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleFetchInsights}
                    disabled={loadingInsights}
                    className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white p-3 rounded-2xl transition-all border border-slate-700"
                  >
                    {loadingInsights ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {!aiInsights && !loadingInsights && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SnapshotItem icon={HandCoins} label="A Receber" value={aiSummary.toReceive} color="text-emerald-400" bgColor="bg-emerald-500/5" />
                    <SnapshotItem icon={Receipt} label="A Pagar" value={aiSummary.toPay} color="text-blue-400" bgColor="bg-blue-500/5" />
                    <SnapshotItem icon={AlertTriangle} label="Crítico (Atraso)" value={aiSummary.overdue} color="text-rose-500" bgColor="bg-rose-500/5" />
                  </div>
                )}

                <div className="min-h-[200px]">
                  {loadingInsights ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-6 text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
                        <BrainCircuit className="w-16 h-16 text-emerald-500 relative animate-bounce" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white uppercase tracking-widest">Processando Fluxo de Caixa...</p>
                        <p className="text-[10px] text-slate-500 mt-2">Aguardando resposta do núcleo de inteligência</p>
                      </div>
                    </div>
                  ) : aiInsights ? (
                    <div className="bg-slate-950/40 rounded-3xl border border-slate-800 p-6 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                      <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-medium">
                        {aiInsights}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center px-4">
                      <button 
                        onClick={handleFetchInsights}
                        className="w-full group py-8 px-6 bg-slate-800/20 border border-dashed border-slate-800 rounded-[32px] hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all"
                      >
                        <Sparkles className="w-10 h-10 text-slate-700 group-hover:text-emerald-500 transition-colors mx-auto mb-4" />
                        <p className="text-xs font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-widest">Gerar Inteligência do CFO</p>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (LATERAL): DISTRIBUIÇÃO E MÉTRICAS */}
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Distribuição de Recursos</h2>
          </div>

          {/* DISTRIBUIÇÃO DE RECURSOS - MOVIDO PARA O LUGAR ANTERIOR DO CFO */}
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <PieChartIcon className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Composição Patrimonial</h3>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>

          {/* MÉTRICAS DE SAÚDE */}
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Indicadores de Saúde</h3>
            </div>
            <div className="space-y-4">
              <HealthMetricItem label="Liquidez Corrente" value="1.8" status="safe" />
              <HealthMetricItem label="Risco de Inadimplência" value={`${((stats.overdue / (stats.totalIncome || 1)) * 100).toFixed(1)}%`} status={stats.overdue > (stats.totalIncome * 0.1) ? 'danger' : 'safe'} />
              <HealthMetricItem label="Cobertura de Caixa" value="45 dias" status="warning" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// Helper components para o Dashboard
const HealthMetricItem = ({ label, value, status }: { label: string, value: string, status: 'safe' | 'warning' | 'danger' }) => {
  const statusColors = {
    safe: 'text-emerald-500 bg-emerald-500/10',
    warning: 'text-amber-500 bg-amber-500/10',
    danger: 'text-rose-500 bg-rose-500/10'
  };
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/30 border border-slate-800/50">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${statusColors[status]}`}>{value}</span>
    </div>
  );
};

const TemporalSummaryCard = ({ title, income, expense, icon: Icon, accent }: any) => {
  const accentClass = accent === 'emerald' ? 'text-emerald-500' : 'text-blue-500';
  const accentBg = accent === 'emerald' ? 'bg-emerald-500/10' : 'bg-blue-500/10';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 hover:border-slate-700 transition-all group">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
        <div className={`p-2.5 ${accentBg} rounded-xl ${accentClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-black text-white uppercase tracking-widest">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" /> Entradas
          </p>
          <p className="text-xl font-bold text-white tracking-tight">R$ {income.toLocaleString('pt-BR')}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-1">
            <ArrowDownRight className="w-3 h-3 text-rose-500" /> Saídas
          </p>
          <p className="text-xl font-bold text-white tracking-tight">R$ {expense.toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
};

const SnapshotItem = ({ icon: Icon, label, value, color, bgColor }: any) => (
  <div className={`${bgColor} border border-slate-800/40 p-4 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all group`}>
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl bg-slate-900 text-slate-500 group-hover:${color} transition-colors`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-sm font-bold ${color}`}>R$ {value.toLocaleString('pt-BR')}</span>
  </div>
);

const SummaryCard = ({ title, value, icon: Icon, color, description, trend }: any) => {
  const isPositiveTrend = trend.value > 0;
  const isNeutralTrend = trend.value === 0;

  const colorStyles: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-transparent border-emerald-500/20 text-emerald-500',
    rose: 'from-rose-500/20 to-transparent border-rose-500/20 text-rose-500',
    blue: 'from-blue-500/20 to-transparent border-blue-500/20 text-blue-500',
  };

  const textColors: Record<string, string> = {
    emerald: 'text-emerald-500',
    rose: 'text-rose-500',
    blue: 'text-blue-500',
  };

  return (
    <div className={`bg-slate-900 bg-gradient-to-br ${colorStyles[color]} border rounded-[32px] p-8 hover:scale-[1.02] transition-all duration-500 shadow-2xl relative group overflow-hidden`}>
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div>
          <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</h4>
          <p className={`text-3xl font-bold tracking-tighter text-white`}>
            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`bg-slate-950/50 p-4 rounded-2xl group-hover:scale-110 transition-transform ${textColors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <div className="flex items-center gap-3 mb-3 relative z-10">
        {isNeutralTrend ? (
          <div className="flex items-center gap-1 text-slate-500 bg-slate-500/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
            <Minus className="w-3 h-3" />
            <span>ESTÁVEL</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isPositiveTrend ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
            {isPositiveTrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">vs. Mês Anterior</span>
      </div>

      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed relative z-10">
        {trend.diff === 0 ? (
          <span>{description}</span>
        ) : (
          <span className="opacity-60">
            {trend.diff > 0 ? 'Expansão' : 'Retração'} de <strong className="text-white">R$ {Math.abs(trend.diff).toLocaleString('pt-BR')}</strong>
          </span>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
