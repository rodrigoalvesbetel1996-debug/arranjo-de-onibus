
import React, { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { supabaseService } from '@/services/supabaseService';
import { Congregation } from '@/types';

interface LoginProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Login: React.FC<LoginProps> = ({ isDarkMode, toggleTheme }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        if (role === 'admin') {
          await authService.registerAdmin(name, email, password);
        } else {
          if (!accessCode) {
            throw new Error('Código de acesso é obrigatório para usuários.');
          }
          await authService.registerUser(name, email, password, accessCode);
        }
      } else {
        await authService.login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl flex overflow-hidden flex-col md:flex-row border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Left Side: Illustration & Branding */}
        <div className="hidden md:flex md:w-[45%] bg-indigo-600 p-16 flex-col justify-between text-white relative">
          <div className="absolute top-8 left-8">
            <button 
              onClick={toggleTheme}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-10 backdrop-blur-md shadow-xl">🚌</div>
            <h1 className="text-4xl font-black mb-6 leading-tight">Gestão de Transporte</h1>
            <p className="text-indigo-100 font-medium text-lg leading-relaxed opacity-90">
              Sistema unificado para controle de passageiros, finanças e segurança para os grandes eventos regionais.
            </p>
          </div>
          
          <div className="space-y-6 relative z-10">
            <FeatureItem icon="🛡️" text="Documentação Segura" />
            <FeatureItem icon="📊" text="Controle em Tempo Real" />
            <FeatureItem icon="✅" text="Auditado e Transparente" />
          </div>

          {/* Decorative element */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Right Side: Entry Forms */}
        <div className="w-full md:w-[55%] p-10 md:p-16">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-800 dark:text-white">Seja bem-vindo</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-widest mt-1">Identifique-se para continuar</p>
          </div>

          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 py-3 text-xs font-bold uppercase rounded-lg transition-all ${!isRegistering ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 py-3 text-xs font-bold uppercase rounded-lg transition-all ${isRegistering ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" checked={role === 'user'} onChange={() => setRole('user')} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Usuário</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" checked={role === 'admin'} onChange={() => setRole('admin')} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Administrador</span>
                </label>
              </div>
            )}

            {isRegistering && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>

            {isRegistering && role === 'user' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código da Congregação</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: 123456"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium tracking-widest"
                />
              </div>
            )}

            {error && (
              <p className="text-red-500 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black hover:opacity-90 transition-all shadow-xl shadow-indigo-200 dark:shadow-none transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Aguarde...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
            </button>
          </form>
          
          <p className="mt-12 text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">JW Transportation Engine v2.0</p>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon, text }: { icon: string, text: string }) => (
  <div className="flex items-center space-x-4 group">
    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-xl group-hover:scale-110 transition-transform">{icon}</div>
    <span className="font-bold text-lg">{text}</span>
  </div>
);

export default Login;
