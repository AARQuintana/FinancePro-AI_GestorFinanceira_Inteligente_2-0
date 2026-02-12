
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Client, Transaction, ClientStatus, TransactionType } from '../types';
import { 
  User, Phone, Mail, TrendingUp, BarChart3, Filter, CheckCircle2, 
  Clock, AlertCircle, Trash2, X, AlertTriangle, Plus, UserPlus, 
  ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown, ChevronUp, History, Users as UsersIcon,
  PlusCircle, CreditCard, Zap, StickyNote, UserCheck, ArrowRight, Handshake, MessageSquare, Hash, Search,
  BellRing, CalendarClock, CalendarDays, RefreshCw, Calendar, Briefcase, Edit2, Activity, Info, 
  UserRoundPlus, Contact, Globe, Layers, Wallet, Receipt, Upload, FileText, Check, AlertOctagon,
  Banknote, AlertCircle as WarningIcon
} from 'lucide-react';

interface ClientsProps {
  clients: Client[];
  transactions: Transaction[];
  onDeleteClient?: (id: string) => void;
  onAddClient?: (c: Omit<Client, 'id' | 'totalBusiness'>) => void;
  onUpdateClient?: (id: string, updates: Partial<Client>) => void;
  onAddTransaction?: (t: Omit<Transaction, 'id'>) => void;
  onToggleTransactionStatus?: (id: string) => void;
}

type ClientFilterFinancial = 'all' | 'paid' | 'pending' | 'overdue';
type ClientFilterProfile = 'all' | ClientStatus;

interface InlineEditState {
  clientId: string;
  field: 'name' | 'email' | 'phone';
  value: string;
}

interface ImportPreviewItem extends Omit<Client, 'id' | 'totalBusiness'> {
  errors: string[];
}

const Clients: React.FC<ClientsProps> = ({ 
  clients, 
  transactions, 
  onDeleteClient, 
  onAddClient,
  onUpdateClient,
  onAddTransaction,
  onToggleTransactionStatus
}) => {
  const [financialFilter, setFinancialFilter] = useState<ClientFilterFinancial>('all');
  const [profileFilter, setProfileFilter] = useState<ClientFilterProfile>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para o formulário de Transação Rápida
  const [transAmountInput, setTransAmountInput] = useState('');
  const [transErrors, setTransErrors] = useState<Record<string, string>>({});
  const [transData, setTransData] = useState({
    description: '',
    type: 'income' as TransactionType,
    category: 'Vendas',
    dueDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'PIX',
    observations: ''
  });

  useEffect(() => {
    if (inlineEdit && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [inlineEdit]);

  const [newClientData, setNewClientData] = useState<Omit<Client, 'id' | 'totalBusiness'>>({
    name: '',
    email: '',
    phone: '',
    status: 'Ativo',
    externalId: '',
    followUpDate: '',
    followUpNote: ''
  });

  const [followUpData, setFollowUpData] = useState({ date: '', note: '' });

  const clientStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return clients.map(client => {
      const clientTransactions = transactions.filter(t => t.clientId === client.id);
      
      const totalIncome = clientTransactions
        .filter(t => t.type === 'income' && t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalPendingAmount = clientTransactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalOverdueAmount = clientTransactions
        .filter(t => t.type === 'income' && t.status === 'overdue')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const hasOverdue = clientTransactions.some(t => t.status === 'overdue');
      const hasPending = clientTransactions.some(t => t.status === 'pending');
      const isUpToDate = !hasOverdue && !hasPending;

      const hasFollowUpToday = client.followUpDate === todayStr;
      const hasFollowUpLate = client.followUpDate && new Date(client.followUpDate) < new Date(todayStr);

      const recentTransactions = [...clientTransactions]
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 3);

      return {
        ...client, 
        totalIncome, 
        totalPendingAmount, 
        totalOverdueAmount,
        totalDebt: totalPendingAmount + totalOverdueAmount,
        hasOverdue, 
        hasPending, 
        isUpToDate, 
        hasFollowUpToday, 
        hasFollowUpLate, 
        recentTransactions
      };
    });
  }, [clients, transactions]);

  const upcomingFollowUps = useMemo(() => {
    return clientStats
      .filter(c => c.followUpDate)
      .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime())
      .slice(0, 4);
  }, [clientStats]);

  const filteredClients = useMemo(() => {
    let result = clientStats;
    if (financialFilter === 'overdue') result = result.filter(c => c.hasOverdue);
    else if (financialFilter === 'pending') result = result.filter(c => c.hasPending);
    else if (financialFilter === 'paid') result = result.filter(c => c.isUpToDate);
    
    if (profileFilter !== 'all') result = result.filter(c => c.status === profileFilter);
    
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(lowerSearch) || c.email.toLowerCase().includes(lowerSearch) || c.phone.includes(lowerSearch));
    }
    return result;
  }, [clientStats, financialFilter, profileFilter, searchTerm]);

  const groupedClients = useMemo(() => {
    const order: ClientStatus[] = ['Ativo', 'Em Negociação', 'Potencial', 'Em Contato', 'Inativo'];
    return order.map(status => ({
      status,
      clients: filteredClients.filter(c => c.status === status)
    })).filter(group => group.clients.length > 0);
  }, [filteredClients]);

  const startInlineEdit = (e: React.MouseEvent, clientId: string, field: 'name' | 'email' | 'phone', initialValue: string) => {
    e.stopPropagation();
    setInlineEdit({ clientId, field, value: initialValue });
  };

  const saveInlineEdit = () => {
    if (inlineEdit && onUpdateClient) {
      const newValue = inlineEdit.value.trim();
      if (newValue) {
        onUpdateClient(inlineEdit.clientId, { [inlineEdit.field]: newValue });
      }
    }
    setInlineEdit(null);
  };

  const handleInlineEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      setInlineEdit(null);
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateClient && selectedClient) {
      onUpdateClient(selectedClient.id, { followUpDate: followUpData.date, followUpNote: followUpData.note });
      setIsFollowUpModalOpen(false);
      setSelectedClient(null);
    }
  };

  const handleMarkAsPaid = (clientId: string) => {
    const clientTransactions = transactions.filter(t => t.clientId === clientId && t.status !== 'paid');
    clientTransactions.forEach(t => {
      onToggleTransactionStatus?.(t.id);
    });
  };

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddClient) {
      onAddClient(newClientData);
      setIsAddSectionOpen(false);
      setNewClientData({
        name: '', email: '', phone: '', status: 'Ativo', externalId: '', followUpDate: '', followUpNote: ''
      });
    }
  };

  // Funções para Transação Rápida
  const openAddTransaction = (client: Client) => {
    setSelectedClient(client);
    setTransAmountInput('');
    setTransErrors({});
    setTransData({
      description: '',
      type: 'income',
      category: 'Vendas',
      dueDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'PIX',
      observations: ''
    });
    setIsAddTransactionModalOpen(true);
  };

  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const errors: Record<string, string> = {};
    const cleanAmount = transAmountInput.trim().replace(',', '.');
    const numAmount = parseFloat(cleanAmount);

    if (!transData.description.trim()) errors.description = 'Obrigatório';
    if (!transAmountInput.trim() || isNaN(numAmount) || numAmount <= 0) errors.amount = 'Inválido';
    if (!transData.dueDate) errors.dueDate = 'Obrigatório';

    if (Object.keys(errors).length > 0) {
      setTransErrors(errors);
      return;
    }

    if (onAddTransaction) {
      onAddTransaction({
        ...transData,
        amount: numAmount,
        status: 'pending',
        clientId: selectedClient.id,
        clientName: selectedClient.name
      });
      setIsAddTransactionModalOpen(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      const headers = lines[0].split(/[;,]/).map(h => h.trim().toLowerCase());
      
      const mappedPreview: ImportPreviewItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(/[;,]/).map(v => v.trim().replace(/^"|"$/g, ''));
        
        const clientObj: ImportPreviewItem = {
          name: '', email: '', phone: '', status: 'Ativo', externalId: '', followUpDate: '', followUpNote: '',
          errors: []
        };

        headers.forEach((header, idx) => {
          if (header.includes('nome')) clientObj.name = values[idx];
          else if (header.includes('email') || header.includes('e-mail')) clientObj.email = values[idx];
          else if (header.includes('tel') || header.includes('fone')) clientObj.phone = values[idx];
          else if (header.includes('status')) {
            const s = values[idx];
            if (['Ativo', 'Inativo', 'Potencial', 'Em Negociação', 'Em Contato'].includes(s)) {
              clientObj.status = s as ClientStatus;
            }
          }
          else if (header.includes('id') || header.includes('codigo')) clientObj.externalId = values[idx];
        });

        // Validação Robusta
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})$/;

        if (!clientObj.name) clientObj.errors.push("Nome ausente");
        if (clientObj.email && !emailRegex.test(clientObj.email)) clientObj.errors.push("E-mail com formato inválido");
        if (clientObj.phone && !phoneRegex.test(clientObj.phone)) clientObj.errors.push("Telefone com formato inválido");

        if (clientObj.name) mappedPreview.push(clientObj);
      }
      setImportPreview(mappedPreview);
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (onAddClient) {
      const validToImport = importPreview.filter(p => p.errors.length === 0);
      validToImport.forEach(c => {
          const { errors, ...clientData } = c;
          onAddClient(clientData);
      });
      setIsImportModalOpen(false);
      setImportPreview([]);
    }
  };

  const getStatusColor = (status: ClientStatus) => {
    switch (status) {
      case 'Ativo': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Em Negociação': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'Potencial': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Em Contato': return 'text-sky-400 bg-sky-400/10 border-sky-400/20'; 
      case 'Inativo': return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getStatusIcon = (status: ClientStatus) => {
    switch (status) {
      case 'Ativo': return <ShieldCheck className="w-4 h-4" />;
      case 'Em Negociação': return <Handshake className="w-4 h-4" />;
      case 'Potencial': return <TrendingUp className="w-4 h-4" />;
      case 'Em Contato': return <MessageSquare className="w-4 h-4" />;
      case 'Inativo': return <ShieldAlert className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const financialFilterButtons = [ { id: 'all', label: 'Todos' }, { id: 'paid', label: 'Em dia' }, { id: 'pending', label: 'Pendentes' }, { id: 'overdue', label: 'Atrasados' } ];
  const profileFilterButtons = [ { id: 'all', label: 'Todos Perfis' }, { id: 'Ativo', label: 'Ativos' }, { id: 'Em Negociação', label: 'Em Negociação' }, { id: 'Potencial', label: 'Potenciais' }, { id: 'Em Contato', label: 'Em Contato' }, { id: 'Inativo', label: 'Inativos' } ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* SEÇÃO DEDICADA: AGENDA DE FOLLOW-UPS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-[32px] p-6 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity"><Calendar className="w-48 h-48" /></div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500"><CalendarDays className="w-6 h-6" /></div>
              <div><h3 className="text-lg font-bold text-white">Agenda de Contatos</h3><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Acompanhamentos estratégicos agendados</p></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingFollowUps.length > 0 ? upcomingFollowUps.map(c => (
              <div key={c.id} className={`p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.05] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${c.hasFollowUpLate ? 'bg-rose-500/5 border-rose-500/20' : c.hasFollowUpToday ? 'bg-amber-500/5 border-amber-400/20' : 'bg-slate-800/40 border-slate-700/50'}`} onClick={() => setExpandedClientId(c.id)}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${c.hasFollowUpLate ? 'bg-rose-500 text-white' : c.hasFollowUpToday ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>{c.hasFollowUpLate ? 'Atrasado' : c.hasFollowUpToday ? 'Hoje' : 'Próximo'}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{new Date(c.followUpDate!).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-sm font-bold text-white truncate mb-1">{c.name}</p>
                <p className="text-[10px] text-slate-400 line-clamp-2 italic leading-relaxed">"{c.followUpNote || 'Sem nota'}"</p>
              </div>
            )) : <div className="col-span-4 py-8 text-center bg-slate-800/20 border border-dashed border-slate-800 rounded-2xl"><p className="text-xs text-slate-500 italic">Nenhum follow-up agendado no momento.</p></div>}
          </div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-6 flex flex-col items-center justify-center text-center gap-4 group hover:bg-emerald-500/20 transition-all cursor-pointer shadow-xl shadow-emerald-500/5" onClick={() => setIsAddSectionOpen(true)}>
          <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform"><UserPlus className="w-8 h-8" /></div>
          <div><h4 className="font-bold text-emerald-400">Novo Cliente</h4><p className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-widest">Expanda sua base agora</p></div>
        </div>
      </div>

      {/* FILTROS E PESQUISA */}
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 space-y-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Pesquisar clientes por nome, email ou telefone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 shadow-lg active:scale-95 group"><Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />Importar</button>
              <button onClick={() => setIsAddSectionOpen(true)} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/10 active:scale-95 group"><Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />Novo Cliente</button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Situação:</span>
              <div className="flex gap-2 flex-wrap">
                {financialFilterButtons.map(btn => (<button key={btn.id} onClick={() => setFinancialFilter(btn.id as ClientFilterFinancial)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${financialFilter === btn.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{btn.label}</button>))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">Perfil:</span>
              <div className="flex gap-2 flex-wrap">
                {profileFilterButtons.map(btn => (<button key={btn.id} onClick={() => setProfileFilter(btn.id as ClientFilterProfile)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${profileFilter === btn.id ? (btn.id === 'Em Negociação' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : btn.id === 'Em Contato' ? 'bg-sky-500 text-white shadow-lg shadow-sky-400/20' : 'bg-slate-700 text-white') : (btn.id === 'Em Negociação' ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : btn.id === 'Em Contato' ? 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20' : 'bg-slate-800 text-slate-400 hover:text-white')}`}>{btn.label}</button>))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISTAGEM AGRUPADA */}
      <div className="space-y-16 pb-20">
        {groupedClients.map(group => (
          <div key={group.status} className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
              <div className="flex items-center gap-3"><div className={`p-2 rounded-xl border ${getStatusColor(group.status)}`}>{getStatusIcon(group.status)}</div><div><h4 className="text-xl font-bold text-white tracking-tight">{group.status}s</h4><p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Clientes em fase de {group.status.toLowerCase()}</p></div></div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total:</span><span className="text-xs font-bold text-white">{group.clients.length}</span></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.clients.map(client => (
                <div 
                  key={client.id} 
                  className={`bg-slate-900 border border-slate-800 rounded-[32px] p-6 transition-all duration-300 ease-out relative group cursor-pointer hover:border-emerald-500/50 hover:scale-[1.03] hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] hover:-translate-y-1.5 ${expandedClientId === client.id ? 'ring-2 ring-emerald-500/20 border-emerald-500/40 shadow-2xl bg-slate-800/40' : ''}`} 
                  onClick={() => setExpandedClientId(expandedClientId === client.id ? null : client.id)}
                >
                  <div className="absolute z-50 left-6 bottom-full mb-4 w-80 p-6 bg-slate-950/95 backdrop-blur-xl border border-emerald-500/30 rounded-3xl shadow-2xl opacity-0 scale-95 translate-y-4 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3"><div className="flex items-center gap-2"><div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400"><Activity className="w-4 h-4" /></div><span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Visão 360º</span></div></div>
                      {client.followUpDate && <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl"><div className="flex items-center gap-2"><CalendarClock className="w-3 h-3 text-blue-400" /><span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Próximo Contato</span></div><p className="text-xs font-bold text-white mt-1">{new Date(client.followUpDate).toLocaleDateString('pt-BR')}</p></div>}
                      <div className="space-y-2"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Recentes</p>{client.recentTransactions.map(rt => (<div key={rt.id} className="flex justify-between text-[10px] bg-slate-900/50 p-2 rounded-xl border border-slate-800/50"><span className="text-slate-300 truncate">{rt.description}</span><span className={`font-black ${rt.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>R$ {rt.amount}</span></div>))}</div>
                    </div>
                  </div>
                  {client.followUpDate && <div className={`absolute -top-3 -right-3 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl border-2 z-10 ${client.hasFollowUpLate ? 'bg-rose-500 border-rose-400 text-white animate-pulse' : client.hasFollowUpToday ? 'bg-amber-500 border-amber-400 text-white' : 'bg-blue-500 border-blue-400 text-white'}`}>{client.hasFollowUpLate ? '⚠️ Atrasado' : client.hasFollowUpToday ? '⚡ Hoje' : `📅 ${new Date(client.followUpDate).toLocaleDateString('pt-BR')}`}</div>}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{client.name}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{client.status}</p>
                      </div>
                    </div>
                    {/* BOTAO DE AÇÃO RAPIDA SOLICITADO */}
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openAddTransaction(client); }} 
                        className="p-2 text-slate-500 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-800/50 rounded-xl border border-slate-700/50"
                        title="Nova Transação"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setClientToDelete(client); }} 
                        className="p-2 text-slate-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-800/50 rounded-xl border border-slate-700/50"
                        title="Excluir Cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6"><div><p className="text-[10px] text-slate-500 uppercase font-bold">Total Pago</p><p className="text-lg font-bold text-emerald-500">R$ {client.totalIncome}</p></div><div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold">Saldo</p><p className="text-lg font-bold text-rose-500">R$ {client.totalDebt}</p></div></div>
                  <div className={`mt-6 pt-6 border-t border-slate-800 space-y-6 animate-in fade-in slide-in-from-top-4 ${expandedClientId === client.id ? '' : 'hidden'}`} onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button onClick={() => { setSelectedClient(client); setFollowUpData({ date: client.followUpDate || '', note: client.followUpNote || '' }); setIsFollowUpModalOpen(true); }} className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-2xl text-[10px] font-bold"><CalendarClock className="w-4 h-4" /> Follow-up</button>
                      <button onClick={() => openAddTransaction(client)} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-2xl text-[10px] font-bold border border-slate-700"><PlusCircle className="w-4 h-4 text-emerald-500" /> Nova Transação</button>
                      <button onClick={() => handleMarkAsPaid(client.id)} className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-2xl text-[10px] font-bold"><CheckCircle2 className="w-4 h-4" /> Liquidar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL TRANSAÇÃO RÁPIDA */}
      {isAddTransactionModalOpen && selectedClient && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsAddTransactionModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center"><h3 className="text-2xl font-bold text-white">Nova Transação - {selectedClient.name}</h3><button onClick={() => setIsAddTransactionModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleAddTransactionSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Descrição do Lançamento</label>
                <input required type="text" value={transData.description} onChange={e => setTransData({...transData, description: e.target.value})} placeholder="Ex: Venda de Consultoria" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                  <input required type="text" value={transAmountInput} onChange={e => setTransAmountInput(e.target.value)} placeholder="0,00" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white font-bold focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Vencimento</label>
                  <input required type="date" value={transData.dueDate} onChange={e => setTransData({...transData, dueDate: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddTransactionModalOpen(false)} className="flex-1 bg-slate-800 text-slate-400 py-5 rounded-2xl font-bold hover:bg-slate-700 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 transition-all active:scale-95">Confirmar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAÇÃO COM VALIDAÇÃO */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md animate-in fade-in" onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white tracking-tight">Importação de Clientes</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Validação Robusta de E-mail e Telefone</p></div><button onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }} className="p-2 text-slate-500 hover:text-white bg-slate-800 rounded-xl"><X className="w-6 h-6" /></button></div>
            <div className="p-8">
              {importPreview.length === 0 ? (
                <div onClick={() => fileInputRef.current?.click()} className="group py-20 border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
                  <FileText className="w-12 h-12 text-slate-700 group-hover:text-emerald-500" /><p className="text-lg font-bold text-white">Selecione seu arquivo CSV</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar border border-slate-800 rounded-2xl">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                        <tr><th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Nome</th><th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">E-mail</th><th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Telefone</th><th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Status/Erros</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {importPreview.map((p, i) => (
                          <tr key={i} className={`hover:bg-slate-800/20 ${p.errors.length > 0 ? 'bg-rose-500/5' : ''}`}>
                            <td className="px-6 py-4 text-xs text-white">{p.name}</td>
                            <td className={`px-6 py-4 text-xs ${p.errors.some(e => e.includes('E-mail')) ? 'text-rose-400' : 'text-slate-400'}`}>{p.email || '-'}</td>
                            <td className={`px-6 py-4 text-xs ${p.errors.some(e => e.includes('Telefone')) ? 'text-rose-400' : 'text-slate-400'}`}>{p.phone || '-'}</td>
                            <td className="px-6 py-4">
                              {p.errors.length > 0 ? (
                                <div className="flex flex-col gap-1">{p.errors.map((e, idx) => (<span key={idx} className="text-[9px] font-black uppercase text-rose-500 flex items-center gap-1"><WarningIcon className="w-2.5 h-2.5" /> {e}</span>))}</div>
                              ) : <span className="text-[9px] font-black uppercase text-emerald-500">Pronto</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-4"><button onClick={() => setImportPreview([])} className="flex-1 bg-slate-800 text-slate-400 py-4 rounded-2xl font-bold">Limpar</button><button onClick={confirmImport} disabled={importPreview.filter(p => p.errors.length === 0).length === 0} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50">Importar {importPreview.filter(p => p.errors.length === 0).length} Válidos</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
