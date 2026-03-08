
import React, { useState } from 'react';
import { User, UserRole, Congregation } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { supabaseService } from '@/services/supabaseService';

interface LoginProps {
  onLogin: (u: User) => void;
  onRegister: (u: User) => void;
  users: User[];
  congregations: Congregation[];
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, users, congregations, isDarkMode, toggleTheme }) => {
  const [portalView, setPortalView] = useState<'PORTAL' | 'ADMIN' | 'CONGREGATION'>('PORTAL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isAdminRegistering, setIsAdminRegistering] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auth Flow State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedCongregation, setSelectedCongregation] = useState<Congregation | null>(null);
  const [authStep, setAuthStep] = useState<'LOGIN_OR_REGISTER' | 'CONFIRM_EMAIL' | 'ACCESS_CODE'>('LOGIN_OR_REGISTER');
  const [isRegistering, setIsRegistering] = useState(true);
  
  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmCode: '',
    accessCode: ''
  });
  const [modalError, setModalError] = useState('');
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  const handleCongregationClick = (cong: Congregation) => {
    setSelectedCongregation(cong);
    setAuthStep('LOGIN_OR_REGISTER');
    setIsRegistering(true);
    setFormData({ name: '', email: '', password: '', confirmCode: '', accessCode: '' });
    setModalError('');
    setTempUserId(null);
    setShowAuthModal(true);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Mock login for when Supabase is not configured
        setTimeout(() => {
          if (authStep === 'LOGIN_OR_REGISTER') {
            if (isRegistering) {
              setAuthStep('CONFIRM_EMAIL');
            } else {
              setAuthStep('ACCESS_CODE');
            }
          } else if (authStep === 'ACCESS_CODE') {
            onLogin({
              id: 'mock-user-id',
              email: formData.email,
              name: formData.name || 'Usuário Teste',
              role: UserRole.CONGREGATION,
              congregationId: selectedCongregation?.id
            });
          }
          setIsLoading(false);
        }, 1000);
        return;
      }

      if (authStep === 'LOGIN_OR_REGISTER') {
        if (isRegistering) {
          // 1. Supabase Auth Sign Up
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                full_name: formData.name,
                role: 'congregation_user'
              }
            }
          });

          if (signUpError) throw signUpError;
          
          // 2. Create Profile in public.profiles
          if (data.user) {
            setTempUserId(data.user.id);
            await supabaseService.saveUser({
              id: data.user.id,
              email: formData.email,
              name: formData.name,
              role: UserRole.CONGREGATION
            });
          }

          setAuthStep('CONFIRM_EMAIL');
        } else {
          // Login Logic with strict timeout
          const loginPromise = supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password
          });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tempo de conexão esgotado. O servidor pode estar "acordando" ou as credenciais estão incorretas. Tente novamente em alguns instantes.')), 45000)
          );

          const { data, error: signInError } = await Promise.race([loginPromise, timeoutPromise]) as any;

          if (signInError) throw signInError;

          if (data && data.user) {
            setTempUserId(data.user.id);
            try {
              const profile = await supabaseService.getCurrentProfile(data.user.id);
              if (profile) {
                if (profile.role === UserRole.ADMIN) {
                  onLogin(profile);
                  return;
                }
                
                if (profile.congregationId !== selectedCongregation?.id) {
                  if (profile.congregationId) {
                    setModalError('Este usuário pertence a outra congregação.');
                    return;
                  }
                  setAuthStep('ACCESS_CODE');
                  return;
                }
                onLogin(profile);
              } else {
                // Fallback if profile doesn't exist but auth succeeded
                setAuthStep('ACCESS_CODE');
              }
            } catch (profileError) {
              console.error('Error fetching profile:', profileError);
              setAuthStep('ACCESS_CODE');
            }
          } else {
            throw new Error('Falha ao obter dados do usuário.');
          }
        }
      } else if (authStep === 'ACCESS_CODE') {
        let userId = tempUserId;
        
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id || null;
        }

        if (!userId) {
          setModalError('Sessão expirada. Faça login novamente.');
          setAuthStep('LOGIN_OR_REGISTER');
          return;
        }

        const inputCode = formData.accessCode.trim();
        const congregationId = await supabaseService.validateAccessCode(inputCode);

        if (congregationId) {
          if (congregationId !== selectedCongregation?.id) {
            setModalError('Este código pertence a outra congregação.');
            return;
          }

          await supabaseService.linkUserToCongregation(userId, congregationId);
          const profile = await supabaseService.getCurrentProfile(userId);
          if (profile) onLogin(profile);
        } else {
          setModalError('Código de acesso inválido ou inativo.');
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Mock login for when Supabase is not configured
        setTimeout(() => {
          onLogin({
            id: 'mock-admin-id',
            email: email,
            name: adminName || 'Admin Teste',
            role: UserRole.ADMIN
          });
          setIsLoading(false);
        }, 1000);
        return;
      }

      if (isAdminRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: adminName,
              role: 'admin'
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await supabaseService.saveUser({
            id: data.user.id,
            email,
            name: adminName,
            role: UserRole.ADMIN
          });
          alert('Cadastro realizado! Verifique seu email para confirmar.');
          setIsAdminRegistering(false);
        }
      } else {
        // Strict timeout for login to prevent infinite loading
        const loginPromise = supabase.auth.signInWithPassword({ email, password });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo de conexão esgotado. O servidor pode estar "acordando" ou as credenciais estão incorretas. Tente novamente em alguns instantes.')), 45000)
        );
        
        const { data, error: signInError } = await Promise.race([loginPromise, timeoutPromise]) as any;

        if (signInError) throw signInError;

        if (data && data.user) {
          try {
            const profile = await supabaseService.getCurrentProfile(data.user.id);
            if (profile && profile.role === UserRole.ADMIN) {
              onLogin(profile);
            } else if (profile) {
              setError('Acesso negado. Apenas administradores podem entrar aqui.');
              await supabase.auth.signOut();
            } else {
              // Fallback if profile doesn't exist but auth succeeded
              onLogin({
                id: data.user.id,
                email: data.user.email || email,
                name: data.user.user_metadata?.full_name || 'Admin',
                role: UserRole.ADMIN
              });
            }
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
            // Fallback to allow login even if profile fetch fails
            onLogin({
              id: data.user.id,
              email: data.user.email || email,
              name: data.user.user_metadata?.full_name || 'Admin',
              role: UserRole.ADMIN
            });
          }
        } else {
          throw new Error('Falha ao obter dados do usuário.');
        }
      }
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      setError(err.message || 'Erro ao autenticar admin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl flex overflow-hidden flex-col md:flex-row border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Left Side: Illustration & Branding */}
        <div className="hidden md:flex md:w-[40%] bg-indigo-600 p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-8 left-8">
            <button 
              onClick={toggleTheme}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-8 backdrop-blur-md shadow-xl">🚌</div>
            <h1 className="text-3xl font-black mb-4 leading-tight">JW Event Transport</h1>
            <p className="text-indigo-100 font-medium text-base leading-relaxed opacity-90">
              Sistema unificado para controle de passageiros, finanças e segurança para os grandes eventos regionais.
            </p>
          </div>
          
          <div className="space-y-4 relative z-10">
            <FeatureItem icon="🛡️" text="Documentação Segura" />
            <FeatureItem icon="📊" text="Controle em Tempo Real" />
            <FeatureItem icon="✅" text="Auditado e Transparente" />
          </div>

          {/* Decorative element */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Right Side: Portal / Entry Forms */}
        <div className="w-full md:w-[60%] p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          
          {portalView === 'PORTAL' && (
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="mb-12">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white">Portal de Acesso</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-widest mt-1">Escolha seu tipo de acesso para continuar</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <button 
                  onClick={() => setPortalView('ADMIN')}
                  className="group relative p-8 bg-slate-900 dark:bg-indigo-600 rounded-3xl text-left overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-8xl">👑</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Administrador</h3>
                  <p className="text-indigo-100/80 text-sm font-medium max-w-[70%]">Gestão total de eventos, congregações e relatórios consolidados.</p>
                  <div className="mt-6 flex items-center text-white font-bold text-xs uppercase tracking-widest">
                    Acessar Área Admin <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </button>

                <button 
                  onClick={() => setPortalView('CONGREGATION')}
                  className="group relative p-8 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl text-left overflow-hidden transition-all hover:border-indigo-500 dark:hover:border-indigo-500 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="text-8xl">⛪</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Congregação</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-[70%]">Gestão de passageiros e pagamentos da sua congregação local.</p>
                  <div className="mt-6 flex items-center text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">
                    Selecionar Congregação <span className="ml-2 group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {portalView === 'ADMIN' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setPortalView('PORTAL')}
                className="mb-8 text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-2 uppercase tracking-widest"
              >
                ← Voltar ao Portal
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white">Área Admin</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-widest mt-1">
                  {isAdminRegistering ? 'Crie sua conta de administrador' : 'Identifique-se para gerenciar o sistema'}
                </p>
              </div>

              <form onSubmit={handleAdminAuth} className="space-y-4">
                {isAdminRegistering && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Seu nome"
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      required
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="admin@exemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">⚠️ {error}</p>}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-xl font-black hover:opacity-90 transition-all shadow-xl disabled:opacity-50"
                >
                  {isLoading ? 'Carregando...' : (isAdminRegistering ? 'Cadastrar Administrador' : 'Entrar no Painel')}
                </button>

                <div className="text-center mt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAdminRegistering(!isAdminRegistering)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest"
                  >
                    {isAdminRegistering ? 'Já tenho conta? Fazer Login' : 'Não tem conta? Cadastre-se'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {portalView === 'CONGREGATION' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setPortalView('PORTAL')}
                className="mb-8 text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-2 uppercase tracking-widest"
              >
                ← Voltar ao Portal
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white">Congregações</h2>
                <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] tracking-widest mt-1">Selecione sua congregação para acessar o painel local</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {congregations.map(cong => (
                  <button
                    key={cong.id}
                    onClick={() => handleCongregationClick(cong)}
                    className="group text-left p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex flex-col justify-between"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{cong.name}</span>
                    <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 mt-3">Acessar Painel Local →</span>
                  </button>
                ))}
                {congregations.length === 0 && (
                  <div className="col-span-2 p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                    <p className="text-slate-400 font-bold text-sm">Nenhuma congregação cadastrada.</p>
                    <p className="text-[10px] text-slate-300 uppercase mt-2">Contate o administrador do sistema</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="mt-12 text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">JW Transportation Engine v2.0</p>
        </div>
      </div>

      {/* Auth Modal (Same as before but with better styling) */}
      {showAuthModal && selectedCongregation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">{selectedCongregation.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {authStep === 'LOGIN_OR_REGISTER' ? (isRegistering ? 'Novo Cadastro' : 'Acesso à Conta') : 
                   authStep === 'CONFIRM_EMAIL' ? 'Verificação' : 'Código de Acesso'}
                </p>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">✕</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {authStep === 'LOGIN_OR_REGISTER' && (
                <>
                  <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(true); setModalError(''); }}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${isRegistering ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                      Cadastrar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(false); setModalError(''); }}
                      className={`flex-1 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${!isRegistering ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                      Entrar
                    </button>
                  </div>

                  {isRegistering && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                    <input
                      required
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                </>
              )}

              {authStep === 'CONFIRM_EMAIL' && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 animate-bounce">📧</div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    Enviamos um link de confirmação para <br/><strong className="text-indigo-600 dark:text-indigo-400">{formData.email}</strong>.
                    <br /><br />
                    Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
                  </p>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">Ambiente de Teste</p>
                    <button
                      type="button"
                      onClick={() => setAuthStep('ACCESS_CODE')}
                      className="w-full bg-white dark:bg-slate-700 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all"
                    >
                      Simular Confirmação de E-mail
                    </button>
                  </div>
                </div>
              )}

              {authStep === 'ACCESS_CODE' && (
                <div className="space-y-6">
                  <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                      Para vincular sua conta à congregação <strong>{selectedCongregation.name}</strong>, insira o código de acesso fornecido pelo seu coordenador.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código de Acesso</label>
                    <input
                      required
                      type="text"
                      placeholder="CONG-XXXXXX"
                      value={formData.accessCode}
                      onChange={e => setFormData({ ...formData, accessCode: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-black text-center tracking-[0.3em] text-xl uppercase"
                    />
                  </div>
                </div>
              )}

              {modalError && (
                <p className="text-red-500 dark:text-red-400 text-[11px] font-bold bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 text-center animate-shake">
                  ⚠️ {modalError}
                </p>
              )}

              {authStep !== 'CONFIRM_EMAIL' && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 dark:shadow-none text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 transform active:scale-[0.98]"
                >
                  {isLoading ? 'Processando...' : (authStep === 'LOGIN_OR_REGISTER' ? (isRegistering ? 'Continuar Cadastro' : 'Entrar na Conta') : 'Validar e Acessar')}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
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
