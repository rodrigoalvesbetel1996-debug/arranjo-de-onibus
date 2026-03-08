
import React, { useState, useEffect } from 'react';
import { User, UserRole, JWEvent, Passenger, Congregation, PaymentReceipt, SHReport, Expense } from '@/types';
import { storage } from '@/services/storageService';
import { supabaseService } from '@/services/supabaseService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import Login from '@/views/Login';
import Layout from '@/components/Layout';
import Dashboard from '@/views/Dashboard';
import PassengerManagement from '@/views/PassengerManagement';
import FinancialManagement from '@/views/FinancialManagement';
import AdminEvents from '@/views/AdminEvents';
import SHReportForm from '@/views/SHReportForm';
import UserManagement from '@/views/UserManagement';
import CongregationManagement from '@/views/CongregationManagement';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('jw_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [events, setEvents] = useState<JWEvent[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [reports, setReports] = useState<SHReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Auth Session Management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await supabaseService.getCurrentProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initial Data Loading
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      // We start by showing the UI immediately if we have local data
      // or if we are not logged in.
      if (!user) {
        setIsLoading(false);
      }

      try {
        if (isSupabaseConfigured) {
          const fetchWithFallback = async (fetcher: () => Promise<any>, fallback: any) => {
            try {
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 3000)
              );
              return await Promise.race([fetcher(), timeoutPromise]);
            } catch (e) {
              return fallback;
            }
          };

          const [u, e, c, p, pay, r, exp] = await Promise.all([
            fetchWithFallback(() => supabaseService.getUsers(), storage.getUsers()),
            fetchWithFallback(() => supabaseService.getEvents(), storage.getEvents()),
            fetchWithFallback(() => supabaseService.getCongregations(), storage.getCongregations()),
            fetchWithFallback(() => supabaseService.getPassengers(), storage.getPassengers()),
            fetchWithFallback(() => supabaseService.getPayments(), storage.getPayments()),
            fetchWithFallback(() => supabaseService.getReports(), storage.getReports()),
            fetchWithFallback(() => supabaseService.getExpenses(), storage.getExpenses())
          ]);
          
          if (!isMounted) return;

          if (u) setUsers(u);
          if (e) setEvents(e);
          if (c) {
            const fixedCongs = c.map((cong: Congregation) => ({
              ...cong,
              accessCode: cong.accessCode || Math.floor(100000 + Math.random() * 900000).toString()
            }));
            setCongregations(fixedCongs);
          }
          if (p) setPassengers(p);
          if (pay) setPayments(pay);
          if (r) setReports(r);
          if (exp) setExpenses(exp);
        }
      } catch (error) {
        console.error('Background sync error:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user?.id]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('jw_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('jw_theme', 'light');
    }
  }, [isDarkMode]);

  // Persistência automática no LocalStorage e Supabase
  useEffect(() => {
    if (isLoading) return;
    storage.saveEvents(events);
    if (isSupabaseConfigured) {
      events.forEach(e => supabaseService.saveEvent(e).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [events, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    storage.savePassengers(passengers);
    if (isSupabaseConfigured) {
      supabaseService.savePassengers(passengers).catch(err => console.warn('Supabase save error:', err));
    }
  }, [passengers, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveCongregations(congregations);
    if (isSupabaseConfigured) {
      congregations.forEach(c => supabaseService.saveCongregation(c).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [congregations, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    storage.savePayments(payments);
    if (isSupabaseConfigured) {
      payments.forEach(p => supabaseService.savePayment(p).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [payments, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveReports(reports);
    if (isSupabaseConfigured) {
      reports.forEach(r => supabaseService.saveReport(r).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [reports, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveExpenses(expenses);
    if (isSupabaseConfigured) {
      expenses.forEach(e => supabaseService.saveExpense(e).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [expenses, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveUsers(users);
    if (isSupabaseConfigured) {
      users.forEach(u => supabaseService.saveUser(u).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [users, isLoading]);

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const addPassengerGroup = (group: Partial<Passenger>[], existingGroupId?: string) => {
    const groupId = existingGroupId || `group-${Date.now()}`;
    const newPassengers = group.map((p, index) => ({
      ...p,
      id: p.id && !p.id.toString().startsWith('temp') ? p.id : `p-${Date.now()}-${index}`,
      groupId,
      status: 'PENDING'
    } as Passenger));
    
    setPassengers(prev => {
      let filtered = prev;
      if (existingGroupId) {
        filtered = filtered.filter(p => p.groupId !== existingGroupId);
      }
      return [...filtered, ...newPassengers];
    });
  };

  const removePassenger = (id: string) => {
    setPassengers(passengers.filter(p => p.id !== id));
    if (isSupabaseConfigured) {
      supabaseService.deletePassenger(id).catch(err => console.warn('Supabase delete error:', err));
    }
  };

  const uploadPassengerDoc = (id: string, file: File) => {
    setPassengers(passengers.map(p => 
      p.id === id ? { ...p, termOfResponsibilityUrl: URL.createObjectURL(file) } : p
    ));
  };

  const savePayment = (pay: Partial<PaymentReceipt>) => {
    setPayments(prev => {
      const isUpdate = !!pay.id && prev.some(p => p.id === pay.id);
      
      if (isUpdate) {
        return prev.map(p => p.id === pay.id ? { ...p, ...pay } as PaymentReceipt : p);
      } else {
        const newPay: PaymentReceipt = {
          ...pay,
          id: pay.id || `pay-${Date.now()}`,
          status: pay.status || 'PENDING'
        } as PaymentReceipt;
        return [...prev, newPay];
      }
    });
  };

  const deletePayment = (id: string) => {
    setPayments(prev => {
      const filtered = prev.filter(p => p.id !== id);
      console.debug(`Excluindo pagamento ID: ${id}. Itens restantes: ${filtered.length}`);
      return filtered;
    });
    if (isSupabaseConfigured) {
      supabaseService.deletePayment(id).catch(err => console.warn('Supabase delete error:', err));
    }
  };

  const addEvent = (ev: Partial<JWEvent>) => {
    const newEv: JWEvent = {
      ...ev,
      id: ev.id || `ev-${Date.now()}`
    } as JWEvent;
    if (newEv.isActive) {
      setEvents(events.map(e => ({ ...e, isActive: false })).concat(newEv));
    } else {
      setEvents([...events, newEv]);
    }
  };

  const toggleEventStatus = (id: string) => {
    setEvents(events.map(e => e.id === id ? { ...e, isActive: !e.isActive } : e));
  };

  const editEvent = (updatedEvent: JWEvent) => {
    setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    if (isSupabaseConfigured) {
      supabaseService.deleteEvent(id).catch(err => console.warn('Supabase delete error:', err));
    }
  };

  const saveSHReport = (report: Partial<SHReport>) => {
    const newReport: SHReport = {
      ...report,
      id: report.id || `rep-${Date.now()}`
    } as SHReport;
    setReports(prev => [...prev.filter(r => r.id !== newReport.id), newReport]);
  };

  const deleteSHReport = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
    if (isSupabaseConfigured) {
      supabaseService.deleteReport(id).catch(err => console.warn('Supabase delete error:', err));
    }
  };

  const saveExpense = (expense: Partial<Expense>) => {
    const newExpense: Expense = {
      ...expense,
      id: expense.id || `exp-${Date.now()}`
    } as Expense;
    setExpenses(prev => [...prev.filter(e => e.id !== newExpense.id), newExpense]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (isSupabaseConfigured) {
      supabaseService.deleteExpense(id).catch(err => console.warn('Supabase delete error:', err));
    }
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => {
      const newUsers = prev.map(u => u.id === updatedUser.id ? updatedUser : u);
      if (user && user.id === updatedUser.id) {
        setUser(updatedUser);
        storage.setSession(updatedUser);
      }
      return newUsers;
    });
  };

  const updateCongregation = (updatedCong: Congregation) => {
    setCongregations(prev => prev.map(c => c.id === updatedCong.id ? updatedCong : c));
  };

  const addCongregation = (newCong: Partial<Congregation>) => {
    const cong: Congregation = {
      ...newCong,
      id: newCong.id || `cong-${Date.now()}`,
      accessCode: Math.floor(100000 + Math.random() * 900000).toString(),
      lastUpdated: new Date().toISOString()
    } as Congregation;
    setCongregations(prev => [...prev, cong]);
  };

  const registerUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    handleLogin(newUser);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse">Carregando dados...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} onRegister={registerUser} users={users} congregations={congregations} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />;
  }

  return (
    <Layout
      user={user}
      onLogout={handleLogout}
      onNavigate={setCurrentView}
      currentView={currentView}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
    >
      {currentView === 'dashboard' && (
        <Dashboard
          user={user}
          events={events}
          passengers={passengers}
          payments={payments}
          congregations={congregations}
          expenses={expenses}
          onSaveExpense={saveExpense}
          onDeleteExpense={deleteExpense}
        />
      )}
      {currentView === 'passengers' && (
        <PassengerManagement
          user={user}
          passengers={passengers}
          events={events}
          onAddPassengerGroup={addPassengerGroup}
          onRemovePassenger={removePassenger}
          onUploadDoc={uploadPassengerDoc}
        />
      )}
      {currentView === 'finance' && (
        <FinancialManagement
          user={user}
          passengers={passengers}
          events={events}
          payments={payments}
          onAddPayment={savePayment}
          onDeletePayment={deletePayment}
        />
      )}
      {currentView === 'events' && (
        <AdminEvents
          events={events}
          onAddEvent={addEvent}
          onToggleEvent={toggleEventStatus}
          onEditEvent={editEvent}
          onDeleteEvent={deleteEvent}
        />
      )}
      {currentView === 'users' && (
        <UserManagement
          users={users}
          onUpdateUser={updateUser}
        />
      )}
      {currentView === 'sh-report' && (
        <SHReportForm
          user={user}
          events={events}
          reports={reports}
          onSaveReport={saveSHReport}
          onDeleteReport={deleteSHReport}
        />
      )}
      {currentView === 'congregations' && (
        <CongregationManagement
          user={user}
          congregations={congregations}
          passengers={passengers}
          payments={payments}
          reports={reports}
          events={events}
          onUpdateCongregation={updateCongregation}
          onAddCongregation={addCongregation}
          onDeletePayment={deletePayment}
          onAddPayment={savePayment}
        />
      )}
    </Layout>
  );
};

export default App;
