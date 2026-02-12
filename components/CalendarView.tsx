
import React, { useState, useMemo } from 'react';
import { Transaction, Client, TransactionType } from '../types';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, AlertCircle, CheckCircle2, User, Wallet, 
  ArrowUpRight, ArrowDownRight, Info, Plus, X, Handshake, Zap, StickyNote
} from 'lucide-react';

interface CalendarViewProps {
  transactions: Transaction[];
  clients: Client[];
  onAddTransaction?: (t: Omit<Transaction, 'id'>) => void;
  onUpdateClient?: (id: string, updates: Partial<Client>) => void;
}

type SchedulingType = 'followup' | 'transaction';

const CalendarView: React.FC<CalendarViewProps> = ({ 
  transactions, 
  clients, 
  onAddTransaction, 
  onUpdateClient 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [schedulingType, setSchedulingType] = useState<SchedulingType>('followup');

  // Form states for scheduling
  const [followupForm, setFollowupForm] = useState({ clientId: '', note: '' });
  const [transactionForm, setTransactionForm] = useState({
    description: '',
    amount: '',
    type: 'income' as TransactionType,
    clientId: '',
    category: 'Geral',
    paymentMethod: 'PIX'
  });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const offset = firstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayTransactions = transactions.filter(t => t.dueDate === dateStr);
    const dayFollowUps = clients.filter(c => c.followUpDate === dateStr);
    return { transactions: dayTransactions, followUps: dayFollowUps };
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return { transactions: [], followUps: [] };
    return getEventsForDate(selectedDay);
  }, [selectedDay, transactions, clients]);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = selectedDay?.toISOString().split('T')[0] || '';

    if (schedulingType === 'followup') {
      if (!followupForm.clientId) return alert('Selecione um cliente');
      onUpdateClient?.(followupForm.clientId, {
        followUpDate: dateStr,
        followUpNote: followupForm.note
      });
    } else {
      if (!transactionForm.description || !transactionForm.amount) return alert('Preencha os campos obrigatórios');
      const amount = parseFloat(transactionForm.amount.replace(',', '.'));
      const client = clients.find(c => c.id === transactionForm.clientId);
      onAddTransaction?.({
        description: transactionForm.description,
        amount,
        dueDate: dateStr,
        type: transactionForm.type,
        status: 'pending',
        category: transactionForm.category,
        clientId: transactionForm.clientId,
        clientName: client?.name || 'N/A',
        paymentMethod: transactionForm.paymentMethod
      });
    }

    setIsSchedulingModalOpen(false);
    setFollowupForm({ clientId: '', note: '' });
    setTransactionForm({ description: '', amount: '', type: 'income', clientId: '', category: 'Geral', paymentMethod: 'PIX' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return selectedDay && 
           date.getDate() === selectedDay.getDate() && 
           date.getMonth() === selectedDay.getMonth() && 
           date.getFullYear() === selectedDay.getFullYear();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-700">
      {/* CALENDÁRIO GRID */}
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
            <CalendarIcon className="w-64 h-64" />
          </div>

          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white capitalize">{monthName}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cronograma de Atividades e Vencimentos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-xl transition-all">Hoje</button>
              <button onClick={nextMonth} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-4 relative z-10">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 relative z-10">
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="h-24 md:h-32 opacity-10"></div>;
              
              const { transactions: tEvents, followUps: fEvents } = getEventsForDate(date);
              const totalEvents = tEvents.length + fEvents.length;
              const hasIncome = tEvents.some(t => t.type === 'income');
              const hasExpense = tEvents.some(t => t.type === 'expense');

              return (
                <div 
                  key={date.getTime()}
                  onClick={() => setSelectedDay(date)}
                  className={`h-24 md:h-32 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                    isSelected(date) 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg ${
                      isToday(date) ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 group-hover:text-white'
                    }`}>
                      {date.getDate()}
                    </span>
                    {totalEvents > 0 && (
                      <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-700">
                        {totalEvents}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-auto">
                    {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>}
                    {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div>}
                    {fEvents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>}
                  </div>
                  
                  {isSelected(date) && (
                    <div className="absolute inset-0 ring-2 ring-emerald-500/20 rounded-2xl pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* LEGENDAS */}
        <div className="flex flex-wrap gap-6 bg-slate-900/50 border border-slate-800 p-6 rounded-[24px]">
          <LegendItem color="bg-emerald-500" label="Receitas" />
          <LegendItem color="bg-rose-500" label="Despesas" />
          <LegendItem color="bg-blue-500" label="Follow-ups" />
          <LegendItem color="bg-slate-700" label="Vazio" />
        </div>
      </div>

      {/* DETALHES DO DIA SELECIONADO */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Agenda Detalhada</h2>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl h-fit min-h-[400px] flex flex-col">
          <div className="p-8 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white capitalize">
                {selectedDay?.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Eventos do Dia Selecionado</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl text-slate-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-3 h-3" /> Vencimentos Financeiros
              </h4>
              
              {selectedDayEvents.transactions.length > 0 ? selectedDayEvents.transactions.map(t => (
                <div key={t.id} className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl group hover:border-slate-600 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                    <span className={`text-[10px] font-bold ${t.status === 'paid' ? 'text-emerald-400' : t.status === 'overdue' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {t.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mb-1 truncate">{t.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Cliente: {t.clientName}</span>
                    <span className="text-sm font-bold text-white">R$ {t.amount.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-[10px] text-slate-600 italic">Nenhuma transação para este dia.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3" /> Compromissos & Follow-ups
              </h4>
              
              {selectedDayEvents.followUps.length > 0 ? selectedDayEvents.followUps.map(c => (
                <div key={c.id} className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl group hover:bg-blue-500/10 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">{c.status}</p>
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-blue-500/10">
                    <p className="text-[10px] text-slate-300 italic leading-relaxed">
                      "{c.followUpNote || 'Sem notas adicionais.'}"
                    </p>
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-[10px] text-slate-600 italic">Nenhum compromisso agendado.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-slate-800/10 border-t border-slate-800">
            <button 
              onClick={() => setIsSchedulingModalOpen(true)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/10 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Novo Agendamento
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE AGENDAMENTO FUNCIONAL */}
      {isSchedulingModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsSchedulingModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Novo Agendamento</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Para o dia {selectedDay?.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSchedulingModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-xl"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-8">
              {/* TABS DO MODAL */}
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button 
                  onClick={() => setSchedulingType('followup')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${schedulingType === 'followup' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Handshake className={`w-4 h-4 ${schedulingType === 'followup' ? 'text-blue-500' : ''}`} />
                  Compromisso
                </button>
                <button 
                  onClick={() => setSchedulingType('transaction')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${schedulingType === 'transaction' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Zap className={`w-4 h-4 ${schedulingType === 'transaction' ? 'text-emerald-500' : ''}`} />
                  Financeiro
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-6">
                {schedulingType === 'followup' ? (
                  <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <User className="w-3 h-3" /> Selecionar Cliente
                      </label>
                      <select 
                        required
                        value={followupForm.clientId}
                        onChange={e => setFollowupForm({...followupForm, clientId: e.target.value})}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                      >
                        <option value="">Selecione um cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <StickyNote className="w-3 h-3" /> Nota do Compromisso
                      </label>
                      <textarea 
                        required
                        rows={4}
                        value={followupForm.note}
                        onChange={e => setFollowupForm({...followupForm, note: e.target.value})}
                        placeholder="Ex: Reunião para alinhar proposta comercial de 2024..."
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white resize-none focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Descrição</label>
                      <input 
                        required
                        type="text"
                        placeholder="Ex: Fatura Servidor AWS"
                        value={transactionForm.description}
                        onChange={e => setTransactionForm({...transactionForm, description: e.target.value})}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                        <input 
                          required
                          type="text"
                          placeholder="0,00"
                          value={transactionForm.amount}
                          onChange={e => setTransactionForm({...transactionForm, amount: e.target.value})}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo</label>
                        <select 
                          value={transactionForm.type}
                          onChange={e => setTransactionForm({...transactionForm, type: e.target.value as TransactionType})}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white outline-none"
                        >
                          <option value="income">Receita (+)</option>
                          <option value="expense">Despesa (-)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cliente Vinculado</label>
                      <select 
                        value={transactionForm.clientId}
                        onChange={e => setTransactionForm({...transactionForm, clientId: e.target.value})}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 px-6 text-white outline-none"
                      >
                        <option value="">Nenhum</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsSchedulingModalOpen(false)} 
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-5 rounded-2xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className={`flex-1 py-5 rounded-2xl font-bold text-white shadow-2xl transition-all active:scale-95 ${schedulingType === 'followup' ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
                  >
                    Confirmar Agendamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-2.5 h-2.5 rounded-full ${color}`}></div>
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

export default CalendarView;
