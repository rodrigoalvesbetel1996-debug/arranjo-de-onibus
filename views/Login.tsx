
import React, { useState } from 'react';
import { User, UserRole, Congregation } from '../types';

interface LoginProps {
  onLogin: (u: User) => void;
  onRegister: (u: User) => void;
  users: User[];
  congregations: Congregation[];
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, users, congregations, isDarkMode, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isAdminRegistering, setIsAdminRegistering] = useState(false);
  const [error, setError] = useState('');

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

  const handleCongregationClick = (cong: Congregation) => {
    setSelectedCongregation(cong);
    setAuthStep('LOGIN_OR_REGISTER');
    setIsRegistering(true);
    setFormData({ name: '', email: '', password: '', confirmCode: '', accessCode: '' });
    setModalError('');
    setShowAuthModal(true);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (authStep === 'LOGIN_OR_REGISTER') {
      if (isRegistering) {
        // Check if user already exists
        if (users.find(u => u.email === formData.email)) {
          setModalError('Este e-mail já está cadastrado. Faça login.');
          return;
        }
        // Proceed to email confirmation
        setAuthStep('CONFIRM_EMAIL');
      } else {
        // Login Logic
        const user = users.find(u => u.email === formData.email && u.password === formData.password);
        if (user) {
          if (user.congregationId !== selectedCongregation?.id && user.role !== UserRole.ADMIN) {
             setModalError('Este usuário não pertence a esta congregação.');
             return;
          }
          onLogin(user);
        } else {
          setModalError('Credenciais inválidas.');
        }
      }
    } else if (authStep === 'CONFIRM_EMAIL') {
      // Simulate email confirmation
      // For prototype, any code works or we just proceed
      setAuthStep('ACCESS_CODE');
    } else if (authStep === 'ACCESS_CODE') {
      // Validate Access Code
      if (formData.accessCode === selectedCongregation?.accessCode) {
        // Create User and Login
        const newUser: User = {
          id: `user-${Date.now()}`,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: UserRole.CONGREGATION,
          congregationId: selectedCongregation.id
        };
        onRegister(newUser);
      } else {
        setModalError('Código de acesso inválido.');
      }
    }
  };

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isAdminRegistering) {
      // Check if admin already exists
      if (users.find(u => u.email === email)) {
        setError('Este e-mail já está cadastrado.');
        return;
      }
      
      const newAdmin: User = {
        id: `admin-${Date.now()}`,
        email,
        password,
        name: adminName,
        role: UserRole.ADMIN
      };
      onRegister(newAdmin);
    } else {
      // Login Logic
      const admin = users.find(u => u.role === UserRole.ADMIN && u.email === email && u.password === password);
      if (admin) {
        onLogin(admin);
      } else {
        setError('Acesso negado. Verifique as credenciais.');
      }
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

          <div className="space-y-12">
            {/* Admin Entry */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                  <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 mr-3"></span>
                  Área Administrativa
                </h3>
                <button 
                  onClick={() => {
                    setIsAdminRegistering(!isAdminRegistering);
                    setError('');
                    setEmail('');
                    setPassword('');
                    setAdminName('');
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline"
                >
                  {isAdminRegistering ? 'Voltar ao Login' : 'Cadastro Admin'}
                </button>
              </div>
              
              <form onSubmit={handleAdminAuth} className="space-y-4">
                {isAdminRegistering && (
                  <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                    <input
                      type="text"
                      placeholder="Nome do Administrador"
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      required
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Usuário (ex: admin)"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
                {error && <p className="text-red-500 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">⚠️ {error}</p>}
                <button
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-xl font-black hover:opacity-90 transition-all shadow-xl shadow-slate-200 dark:shadow-none transform active:scale-[0.98]"
                >
                  {isAdminRegistering ? 'Cadastrar Admin' : 'Entrar como Admin'}
                </button>
              </form>
            </section>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
              <div className="relative flex justify-center"><span className="bg-white dark:bg-slate-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesso Rápido</span></div>
            </div>

            {/* Congregation Selection */}
            <section>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center">
                <span className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800 mr-3"></span>
                Selecione sua Congregação
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-3 custom-scrollbar">
                {congregations.map(cong => (
                  <button
                    key={cong.id}
                    onClick={() => handleCongregationClick(cong)}
                    className="group text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex flex-col justify-between"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{cong.name}</span>
                    <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-indigo-400 dark:group-hover:text-indigo-500 mt-2">Acessar Painel →</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          
          <p className="mt-12 text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">JW Transportation Engine v2.0</p>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && selectedCongregation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{selectedCongregation.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {authStep === 'LOGIN_OR_REGISTER' ? (isRegistering ? 'Criar nova conta' : 'Acessar sua conta') : 
                   authStep === 'CONFIRM_EMAIL' ? 'Confirmação de E-mail' : 'Código da Congregação'}
                </p>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {authStep === 'LOGIN_OR_REGISTER' && (
                <>
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(true); setModalError(''); }}
                      className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${isRegistering ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                      Cadastrar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(false); setModalError(''); }}
                      className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${!isRegistering ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    >
                      Entrar
                    </button>
                  </div>

                  {isRegistering && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
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
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📧</div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                    Enviamos um link de confirmação para <strong>{formData.email}</strong>.
                    <br />
                    Por favor, verifique sua caixa de entrada.
                  </p>
                  <p className="text-xs text-slate-400 mb-2">Para fins de teste, clique abaixo:</p>
                  <button
                    type="button"
                    onClick={() => setAuthStep('ACCESS_CODE')}
                    className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline"
                  >
                    Simular Confirmação de E-mail
                  </button>
                </div>
              )}

              {authStep === 'ACCESS_CODE' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      Para acessar a área desta congregação, você precisa do <strong>Código de Acesso</strong> fornecido pelo administrador.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Código da Congregação</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: 123456"
                      value={formData.accessCode}
                      onChange={e => setFormData({ ...formData, accessCode: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-center tracking-widest text-lg"
                    />
                  </div>
                </div>
              )}

              {modalError && (
                <p className="text-red-500 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30 text-center">
                  ⚠️ {modalError}
                </p>
              )}

              {authStep !== 'CONFIRM_EMAIL' && (
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none text-sm uppercase tracking-wide hover:bg-indigo-700 transition-all"
                >
                  {authStep === 'LOGIN_OR_REGISTER' ? (isRegistering ? 'Continuar' : 'Entrar') : 'Acessar Painel'}
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
