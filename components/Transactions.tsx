
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Client } from '../types';
import { 
  Plus, Search, X, Trash2, CheckCircle2, Clock, AlertCircle, 
  CreditCard, Zap, FileText, Banknote, Sparkles, RefreshCw, 
  HandCoins, Receipt, AlertTriangle, LayoutList, BrainCircuit, Info, AlertOctagon,
  BellRing, CalendarClock
} from 'lucide-react';
import { getFinancialInsights, InsightContext } from '../services/geminiService';

interface TransactionsProps {
  transactions: Transaction[];
  clients: Client[];
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
}

type SubTab = 'all' | 'receivable' | 'payable' | 'overdue';

const Transactions: React.FC<TransactionsProps> = ({ transactions, clients, onAdd, onDelete, onToggleStatus, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<SubTab>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiInsights, setAiInsights] = useState<Record<SubTab, string | null>>({ all: null, receivable: null, payable: null, overdue: null });
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Estados para formulário e validação
  const [amountInput, setAmountInput] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    description: '', amount: 0, dueDate: '', type: 'income' as TransactionType,
    category: '', clientId: '', clientName: '', paymentMethod: 'PIX',
    paymentIcon: 'zap', reminderActive: false, reminderDate: '',
    reminderMessage: '', notifyEmail: true, observations: ''
  });

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = t.description.toLowerCase().includes(searchLower) || t.clientName.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;

        switch (activeTab) {
          case 'receivable': return t.type === 'income' && (t.status === 'pending' || t.status === 'overdue');
          case 'payable': return t.type === 'expense' && (t.status === 'pending' || t.status === 'overdue');
          case 'overdue': return t.status === 'overdue';
          default: return true;
        }
      })
      .sort((a, b) => {
        // 1. Prioridade para lembretes ativos
        if (a.reminderActive && !b.reminderActive) return -1;
        if (!a.reminderActive && b.reminderActive) return 1;

        // 2. Ordenação por proximidade da data de vencimento
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
      });
  }, [transactions, activeTab, searchTerm]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Validação de Descrição
    if (!formData.description.trim()) {
      errors.description = "A descrição é obrigatória.";
    } else if (formData.description.length < 3) {
      errors.description = "A descrição deve ter pelo menos 3 caracteres.";
    }

    // Validação de Valor - Trim e substituição de vírgula
    const cleanAmount = amountInput.trim().replace(',', '.');
    const numAmount = parseFloat(cleanAmount);
    if (!amountInput.trim()) {
      errors.amount = "O valor é obrigatório.";
    } else if (isNaN(numAmount) || numAmount <= 0) {
      errors.amount = "Insira um valor numérico válido maior que zero.";
    }

    // Validação de Data
    if (!formData.dueDate) {
      errors.dueDate = "A data de vencimento é obrigatória.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFetchAiInsights = async () => {
    setLoadingAi(true);
    const contextMap: Record<SubTab, InsightContext> = {
        all: 'general',
        receivable: 'receivable',
        payable: 'payable',
        overdue: 'overdue'
    };
    
    const text = await getFinancialInsights(filteredTransactions, contextMap[activeTab]);
    setAiInsights(prev => ({ ...prev, [activeTab]: text || "Sem insights disponíveis." }));
    setLoadingAi(false);
  };

  const getPaymentIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'pix': return <Zap className="w-3.5 h-3.5 text-emerald-400" />;
      case 'cartão de crédito':
      case 'cartão': return <CreditCard className="w-3.5 h-3.5 text-blue-400" />;
      case 'boleto': return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      case 'dinheiro': return <Banknote className="w-3.5 h-3.5 text-emerald-500" />;
      default: return <CreditCard className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getUrgencyLevel = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dueDate);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Atrasado', color: 'text-rose-500 bg-rose-500/10', icon: AlertCircle, urgent: true };
    if (diffDays === 0) return { label: 'Vence Hoje', color: 'text-amber-500 bg-amber-500/10', icon: Zap, urgent: true };
    if (diffDays <= 3) return { label: `Em ${diffDays} dias`, color: 'text-blue-400 bg-blue-500/10', icon: Clock, urgent: false };
    return { label: `Em ${diffDays} dias`, color: 'text-slate-500 bg-slate-800/50', icon: CalendarClock, urgent: false };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Processamento final do valor: remove espaços e troca vírgula por ponto
    const cleanAmount = amountInput.trim().replace(',', '.');
    const val = parseFloat(cleanAmount);
    
    onAdd({ 
      ...formData, 
      amount: val, 
      status: 'pending', 
      clientName: clients.find(c => c.id === formData.clientId)?.name || 'N/A' 
    });
    
    setIsModalOpen(false);
    setAmountInput('');
    setFormData({
      description: '', amount: 0, dueDate: '', type: 'income',
      category: '', clientId: '', clientName: '', paymentMethod: 'PIX',
      paymentIcon: 'zap', reminderActive: false, reminderDate: '',
      reminderMessage: '', notifyEmail: true, observations: ''
    });
    setFormErrors({});
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sistema de Abas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit">
          <TabButton active={activeTab === 'all'} label="Geral" icon={LayoutList} onClick={() => setActiveTab('all')} />
          <TabButton active={activeTab === 'receivable'} label="A Receber" icon={HandCoins} color="text-emerald-500" onClick={() => setActiveTab('receivable')} />
          <TabButton active={activeTab === 'payable'} label="A Pagar" icon={Receipt} color="text-blue-500" onClick={() => setActiveTab('payable')} />
          <TabButton active={activeTab === 'overdue'} label="Atrasados" icon={AlertTriangle} color="text-rose-500" onClick={() => setActiveTab('overdue')} />
        </div>

        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Filtrar nesta aba..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-64"
                />
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/10 transition-all active:scale-95"
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Painel de IA Contextual */}
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
            <BrainCircuit className="w-32 h-32" />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${activeTab === 'overdue' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Insights de {activeTab === 'all' ? 'Gestão' : activeTab === 'receivable' ? 'Recebíveis' : activeTab === 'payable' ? 'Pagamentos' : 'Recuperação'}
                    </h3>
                    <p className="text-xs text-slate-500">IA analisando transações contextuais para esta aba</p>
                </div>
            </div>
            <button 
                onClick={handleFetchAiInsights}
                disabled={loadingAi}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl text-xs font-bold border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
                {loadingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                {aiInsights[activeTab] ? 'Atualizar Análise' : 'Gerar Análise IA'}
            </button>
        </div>

        {aiInsights[activeTab] && (
            <div className="mt-6 p-5 bg-slate-950/50 border border-slate-800 rounded-2xl animate-in slide-in-from-top-4">
                <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {aiInsights[activeTab]}
                </div>
            </div>
        )}
      </div>

      {/* Listagem de Transações */}
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Valor</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vencimento</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pagamento</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.map(t => {
                const urgency = getUrgencyLevel(t.dueDate);
                const isUrgentReminder = t.reminderActive && (urgency.urgent);

                return (
                  <tr key={t.id} className={`group hover:bg-slate-800/30 transition-all relative ${
                    t.reminderActive ? 'bg-emerald-500/5 border-l-4 border-l-emerald-500' : ''
                  } ${isUrgentReminder ? 'bg-rose-500/5 border-l-4 border-l-rose-500' : ''}`}>
                    <td className="px-8 py-5 relative group/tooltip">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors cursor-help">{t.description}</span>
                          {t.reminderActive && (
                            <div className={`p-1 rounded-md ${isUrgentReminder ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                <BellRing className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500 uppercase">{t.category || 'Geral'}</span>
                           {t.reminderActive && (
                             <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${isUrgentReminder ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                               Lembrete Ativo
                             </span>
                           )}
                        </div>
                      </div>

                      {/* Tooltip com Animação Suave */}
                      <div className="absolute z-30 left-8 bottom-[80%] mb-2 w-max max-w-xs p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl opacity-0 scale-95 translate-y-2 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:translate-y-0 transition-all duration-300 ease-out">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-md ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              <Info className="w-3 h-3" />
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Detalhes da Transação</span>
                          </div>
                          {t.reminderActive && (
                            <p className="text-[10px] font-bold text-emerald-500 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                              Lembrete configurado para esta operação.
                            </p>
                          )}
                          <p className="text-xs text-slate-300 leading-relaxed italic">
                            {t.observations || 'Nenhuma observação detalhada para este lançamento.'}
                          </p>
                        </div>
                        <div className="absolute top-full left-6 -mt-1 border-x-8 border-x-transparent border-t-8 border-t-slate-800"></div>
                        <div className="absolute top-full left-6 -mt-[5px] border-x-[7px] border-x-transparent border-t-[7px] border-t-slate-950"></div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-400">{t.clientName}</td>
                    <td className={`px-8 py-5 text-sm font-bold text-right ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      R$ {t.amount.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-mono">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</span>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-lg w-fit border border-current opacity-70 ${urgency.color}`}>
                           <urgency.icon className="w-2.5 h-2.5" />
                           <span className="text-[9px] font-black uppercase tracking-widest">{urgency.label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                          {getPaymentIcon(t.paymentMethod || 'PIX')}
                          <span>{t.paymentMethod || 'PIX'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase border ${
                          t.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          t.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                          {t.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : t.status === 'overdue' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {t.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onToggleStatus(t.id)} className="p-2 text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => onDelete(t.id)} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center text-slate-500 italic text-sm">Nenhum lançamento encontrado nesta aba.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Plus className="w-5 h-5 text-emerald-500" />
                      Novo Lançamento
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              Descrição
                              {formErrors.description && <span className="text-[10px] text-rose-500 normal-case flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> {formErrors.description}</span>}
                            </label>
                            <input 
                              type="text" 
                              placeholder="Ex: Consultoria Mensal Dezembro"
                              value={formData.description} 
                              onChange={e => setFormData({...formData, description: e.target.value})} 
                              className={`w-full bg-slate-800 border ${formErrors.description ? 'border-rose-500' : 'border-slate-700'} rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-emerald-500/20 transition-all`} 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              Valor (R$)
                              {formErrors.amount && <span className="text-[10px] text-rose-500 normal-case flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> {formErrors.amount}</span>}
                            </label>
                            <input 
                              type="text" 
                              placeholder="0,00"
                              value={amountInput} 
                              onChange={e => setAmountInput(e.target.value)} 
                              className={`w-full bg-slate-800 border ${formErrors.amount ? 'border-rose-500' : 'border-slate-700'} rounded-2xl px-5 py-3.5 text-white font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all`} 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              Vencimento
                              {formErrors.dueDate && <span className="text-[10px] text-rose-500 normal-case flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> {formErrors.dueDate}</span>}
                            </label>
                            <input 
                              type="date" 
                              value={formData.dueDate} 
                              onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                              className={`w-full bg-slate-800 border ${formErrors.dueDate ? 'border-rose-500' : 'border-slate-700'} rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-emerald-500/20 transition-all`} 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo</label>
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TransactionType})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-emerald-500/20">
                                <option value="income">Receita (+)</option>
                                <option value="expense">Despesa (-)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ativar Lembrete?</label>
                            <div className="flex items-center gap-4 py-3.5">
                               <button 
                                 type="button"
                                 onClick={() => setFormData({...formData, reminderActive: !formData.reminderActive})}
                                 className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                   formData.reminderActive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-500'
                                 }`}
                               >
                                 {formData.reminderActive ? 'Sim' : 'Não'}
                               </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente / Fornecedor</label>
                            <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-emerald-500/20">
                                <option value="">Nenhum</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Forma de Pagamento</label>
                            <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white focus:ring-2 focus:ring-emerald-500/20">
                                <option value="PIX">PIX</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Boleto">Boleto</option>
                                <option value="Dinheiro">Dinheiro</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              Observações Internas
                            </label>
                            <textarea 
                              rows={2} 
                              value={formData.observations} 
                              onChange={e => setFormData({...formData, observations: e.target.value})} 
                              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white resize-none focus:ring-2 focus:ring-emerald-500/20" 
                              placeholder="Detalhes que aparecerão no tooltip informativo..." 
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-4 rounded-2xl font-bold transition-all active:scale-95">Cancelar</button>
                        <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 transition-all active:scale-95">Salvar Lançamento</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, label, icon: Icon, onClick, color = 'text-white' }: any) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${active ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <Icon className={`w-4 h-4 ${active ? color : 'text-slate-500'}`} />
    {label}
  </button>
);

export default Transactions;
