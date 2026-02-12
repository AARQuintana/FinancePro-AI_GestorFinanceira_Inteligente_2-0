
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export type InsightContext = 'receivable' | 'payable' | 'overdue' | 'general' | 'inactive';

export const getFinancialInsights = async (transactions: Transaction[], context: InsightContext = 'general', extraInfo?: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = transactions.reduce((acc, t) => {
    if (t.type === 'income') {
      if (t.status === 'paid') acc.paidIncome += t.amount;
      if (t.status === 'pending') acc.pendingIncome += t.amount;
      if (t.status === 'overdue') acc.overdueIncome += t.amount;
    } else {
      if (t.status === 'paid') acc.paidExpense += t.amount;
      if (t.status === 'pending') acc.pendingExpense += t.amount;
      if (t.status === 'overdue') acc.overdueExpense += t.amount;
    }
    return acc;
  }, { 
    paidIncome: 0, pendingIncome: 0, overdueIncome: 0,
    paidExpense: 0, pendingExpense: 0, overdueExpense: 0
  });

  const prompts: Record<InsightContext, string> = {
    general: `Analise o fluxo de caixa geral: Receita R$ ${summary.paidIncome} vs Despesa R$ ${summary.paidExpense}. Forneça um resumo executivo da saúde financeira.`,
    
    receivable: `Aja como Especialista em Cobrança. Temos R$ ${summary.pendingIncome.toFixed(2)} a receber. 
    Analise este volume e sugira: 1. Estratégias de antecipação. 2. Melhoria na régua de comunicação com clientes. 3. Como evitar que esses valores vençam sem pagamento.`,
    
    payable: `Aja como Especialista em Eficiência Operacional. Temos R$ ${summary.pendingExpense.toFixed(2)} em contas a pagar. 
    Analise e sugira: 1. Otimização de prazos com fornecedores. 2. Priorização de pagamentos essenciais. 3. Identificação de possíveis reduções de custos fixos.`,
    
    overdue: `Aja como Gestor de Risco e Recuperação de Crédito. 
    SITUAÇÃO CRÍTICA: R$ ${summary.overdueIncome.toFixed(2)} em inadimplência de clientes e R$ ${summary.overdueExpense.toFixed(2)} em dívidas próprias vencidas. 
    Sugira: 1. Plano de negociação imediata para dívidas. 2. Ações de cobrança extrajudicial. 3. Medidas para estancar o crescimento da inadimplência.`,

    inactive: `Aja como Especialista em CRM e Customer Success. Analise a lista de clientes inativos fornecida.
    Informação extra sobre os clientes: ${extraInfo || 'Sem detalhes adicionais'}.
    Sugira: 1. Motivos prováveis para o churn (abandono) baseando-se no histórico. 2. Estratégias personalizadas de reativação (win-back). 3. Ofertas ou gatilhos mentais para reconquista.`
  };

  const promptBase = `
    Use um tom profissional e direto. 
    Responda em Markdown com tópicos curtos. 
    Contexto da Análise: ${context.toUpperCase()}
    ${prompts[context]}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptBase,
    });
    
    return response.text;
  } catch (error) {
    console.error("Erro ao obter insights da IA:", error);
    return "⚠️ Erro ao gerar insights contextuais. Tente novamente.";
  }
};
