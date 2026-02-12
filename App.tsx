
import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Transaction, Client, User, ClientStatus } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Clients from './components/Clients';
import Reports from './components/Reports';
import LoginForm from './components/LoginForm';
import CalendarView from './components/CalendarView';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  // Initialize with some dummy data if localStorage is empty
  useEffect(() => {
    const savedUser = localStorage.getItem('finance_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));

    const savedData = localStorage.getItem('finance_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setTransactions(parsed.transactions);
      setClients(parsed.clients);
    } else {
      const initialClients: Client[] = [
        { id: 'c1', name: 'Tech Solutions Ltda', email: 'contato@tech.com', phone: '11 9999-8888', totalBusiness: 15000, status: 'Ativo', externalId: 'TECH-001' },
        { id: 'c2', name: 'Maria Silva Consultoria', email: 'maria@consult.com', phone: '21 9888-7777', totalBusiness: 8000, status: 'Potencial', externalId: 'MS-99' },
        { id: 'c3', name: 'Global Trade Corp', email: 'vendas@global.com', phone: '11 3333-2222', totalBusiness: 0, status: 'Em Negociação' },
        { id: 'c4', name: 'Agência Criativa Digital', email: 'hello@agencia.com', phone: '11 5555-4444', totalBusiness: 4200, status: 'Em Contato' }
      ];
      const initialTransactions: Transaction[] = [
        { id: 't1', description: 'Serviço Software Out', amount: 5000, dueDate: '2023-12-01', type: 'income', status: 'paid', category: 'Serviços', clientId: 'c1', clientName: 'Tech Solutions Ltda', paymentMethod: 'PIX' },
        { id: 't2', description: 'Aluguel Escritório', amount: 2500, dueDate: '2025-05-10', type: 'expense', status: 'pending', category: 'Infra', clientId: '', clientName: 'N/A', paymentMethod: 'Boleto' },
        { id: 't3', description: 'Venda Consultoria', amount: 3000, dueDate: '2024-04-15', type: 'income', status: 'overdue', category: 'Vendas', clientId: 'c2', clientName: 'Maria Silva Consultoria', paymentMethod: 'Cartão de Crédito' },
        { id: 't4', description: 'Assinatura AWS', amount: 450, dueDate: '2025-06-20', type: 'expense', status: 'pending', category: 'TI', clientId: '', clientName: 'N/A', paymentMethod: 'Cartão de Crédito' }
      ];
      setClients(initialClients);
      setTransactions(initialTransactions);
    }
  }, []);

  // Engine to check for payment reminders and follow-ups
  const checkReminders = () => {
    if (transactions.length === 0 && clients.length === 0) return;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const newNotifs: string[] = [];

    // Check payment transactions
    const triggeredTrans = transactions.filter(t => 
      t.reminderActive && 
      t.reminderDate && 
      new Date(t.reminderDate) <= now &&
      t.status !== 'paid'
    );

    triggeredTrans.forEach(t => {
      const msg = t.reminderMessage && t.reminderMessage.trim() !== '' 
        ? t.reminderMessage 
        : `Lembrete: O pagamento "${t.description}" de R$ ${t.amount.toLocaleString('pt-BR')} vence em breve.`;
      
      newNotifs.push(msg);

      if (t.notifyEmail) {
        console.group('%c [FinancePro Mail Service] ', 'background: #10b981; color: white; font-weight: bold; border-radius: 4px;');
        console.log(`Para: ${currentUser?.email}`);
        console.log(`Assunto: Alerta de Pagamento - ${t.description}`);
        console.log(`Mensagem: ${msg}`);
        console.groupEnd();
      }
    });

    // Check Client Follow-ups
    const triggeredFollowUps = clients.filter(c => 
      c.followUpDate === todayStr || (c.followUpDate && new Date(c.followUpDate) < now)
    );

    triggeredFollowUps.forEach(c => {
       const msg = `Follow-up Pendente: Contatar "${c.name}" conforme agendado. ${c.followUpNote ? `Nota: ${c.followUpNote}` : ''}`;
       newNotifs.push(msg);
    });

    if (newNotifs.length > 0) {
      setNotifications(prev => {
        const updated = [...prev, ...newNotifs];
        return Array.from(new Set(updated));
      });
      
      if (triggeredTrans.length > 0) {
        setTransactions(prev => prev.map(t => {
            const isTriggered = triggeredTrans.find(trig => trig.id === t.id);
            if (isTriggered) return { ...t, reminderActive: false };
            return t;
        }));
      }
    }
  };

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [transactions, clients]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('finance_data', JSON.stringify({ transactions, clients }));
    }
  }, [transactions, clients, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('finance_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('finance_user');
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: Math.random().toString(36).substr(2, 9) };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleAddClient = (c: Omit<Client, 'id' | 'totalBusiness'>) => {
    const newClient: Client = {
      ...c,
      id: Math.random().toString(36).substr(2, 9),
      totalBusiness: 0
    };
    setClients(prev => [...prev, newClient]);
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setTransactions(prev => prev.map(t => t.clientId === id ? { ...t, clientId: '', clientName: 'N/A' } : t));
  };

  const handleUpdateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const toggleStatus = (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'paid' ? 'pending' : 'paid';
        return { ...t, status: nextStatus as any };
      }
      return t;
    }));
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const clearNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={setActiveView} onLogout={handleLogout} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          user={currentUser} 
          activeView={activeView} 
          notifications={notifications} 
          onClearNotification={clearNotification}
          onClearAll={clearAllNotifications}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          {activeView === AppView.DASHBOARD && (
            <Dashboard transactions={transactions} />
          )}
          {activeView === AppView.TRANSACTIONS && (
            <Transactions 
              transactions={transactions} 
              onAdd={addTransaction} 
              onDelete={deleteTransaction}
              onToggleStatus={toggleStatus}
              onUpdate={updateTransaction}
              clients={clients}
            />
          )}
          {activeView === AppView.CLIENTS && (
            <Clients 
              clients={clients} 
              transactions={transactions} 
              onDeleteClient={deleteClient}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onAddTransaction={addTransaction}
              onToggleTransactionStatus={toggleStatus}
            />
          )}
          {activeView === AppView.CALENDAR && (
            <CalendarView 
              transactions={transactions} 
              clients={clients} 
              onAddTransaction={addTransaction}
              onUpdateClient={handleUpdateClient}
            />
          )}
          {activeView === AppView.REPORTS && (
            <Reports transactions={transactions} clients={clients} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
