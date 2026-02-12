
export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'overdue';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  clientId: string;
  clientName: string;
  paymentMethod?: string;
  paymentIcon?: string;
  reminderActive?: boolean;
  reminderDate?: string;
  reminderMessage?: string;
  notifyEmail?: boolean;
  observations?: string;
}

export type ClientStatus = 'Ativo' | 'Inativo' | 'Potencial' | 'Em Negociação' | 'Em Contato';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBusiness: number;
  status: ClientStatus;
  externalId?: string;
  followUpDate?: string;
  followUpNote?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export enum AppView {
  DASHBOARD = 'dashboard',
  TRANSACTIONS = 'transactions',
  CLIENTS = 'clients',
  CALENDAR = 'calendar',
  REPORTS = 'reports'
}
