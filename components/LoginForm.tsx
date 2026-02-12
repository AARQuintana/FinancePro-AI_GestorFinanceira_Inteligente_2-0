
import React, { useState } from 'react';
import { User as UserType } from '../types';
import { Wallet, Mail, Lock, User as UserIcon, ArrowRight, RefreshCw, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: UserType) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulating authentication delay
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        id: Math.random().toString(36).substr(2, 9),
        email,
        name: isLogin ? 'Usuário Pro' : name
      });
    }, 1200);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulating password reset email sending
    setTimeout(() => {
      setIsLoading(false);
      setResetSent(true);
      console.log(`[FinancePro AI] LINK DE REDEFINIÇÃO ENVIADO PARA: ${email}`);
    }, 1500);
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setResetSent(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background blobs for aesthetic */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-emerald-500/30 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-emerald-500 p-3 rounded-2xl shadow-xl shadow-emerald-500/20 mb-6">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">FinancePro AI</h1>
          <p className="text-slate-400">Sua gestão financeira na velocidade da luz.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[32px] p-8 md:p-10 shadow-2xl overflow-hidden min-h-[460px] flex flex-col transition-all duration-300">
          
          {isForgotPassword ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full">
              <button 
                onClick={toggleForgotPassword}
                className="flex items-center gap-2 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-8 transition-colors group"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Voltar ao Login
              </button>

              <h2 className="text-xl font-bold text-white mb-2">Redefinir Senha</h2>
              <p className="text-sm text-slate-400 mb-8">Insira seu e-mail cadastrado para receber instruções de recuperação.</p>

              {resetSent ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in duration-300">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-6 border border-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">E-mail Enviado!</h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-8">
                    Se o e-mail <span className="text-white font-medium">{email}</span> estiver em nossa base, você receberá um link em instantes.
                  </p>
                  <button
                    onClick={toggleForgotPassword}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all"
                  >
                    Entendi
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 ml-1">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Enviar Recuperação
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <h2 className="text-xl font-bold text-white mb-8">
                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400 ml-1">Nome Completo</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="João Silva"
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-slate-400">Senha</label>
                    {isLogin && (
                      <button 
                        type="button" 
                        onClick={toggleForgotPassword}
                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-rose-500 text-xs text-center font-medium animate-pulse">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 mt-4 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? 'Entrar Agora' : 'Criar Minha Conta'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                  <span className="text-emerald-500 font-bold underline decoration-emerald-500/30">
                    {isLogin ? 'Crie agora' : 'Faça login'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          Protegido por criptografia avançada. © 2024 FinancePro AI.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
