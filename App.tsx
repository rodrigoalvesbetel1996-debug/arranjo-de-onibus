
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';

const App: React.FC = () => {
  const { session, profile, isLoading: isAuthLoading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('jw_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const [events, setEvents] = useState<JWEvent[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [reports, setReports] = useState<SHReport[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Initial Data Loading
  useEffect(() => {
    const loadData = async () => {
      if (!session?.user) {
        setUsers([]);
        setEvents([]);
        setCongregations([]);
        setPassengers([]);
        setPayments([]);
        setReports([]);
        setExpenses([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      // Cria um timer para desistir do Supabase se demorar mais de 3 segundos
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 3000)
      );

      try {
        if (isSupabaseConfigured) {
          const fetchService = async (serviceMethod: () => Promise<any>, fallbackData: any) => {
            try {
              // Tenta buscar o dado, mas com tempo limite
              const data = await Promise.race([serviceMethod(), timeoutPromise]);
              return data && data.length > 0 ? data : fallbackData;
            } catch (err) {
              console.warn(`Serviço ignorado (lento ou erro):`, err);
              setIsOfflineMode(true);
              return fallbackData;
            }
          };

          const [u, e, c, p, pay, r, exp] = await Promise.all([
            fetchService(supabaseService.getUsers, storage.getUsers()),
            fetchService(supabaseService.getEvents, storage.getEvents()),
            fetchService(supabaseService.getCongregations, storage.getCongregations()),
            fetchService(supabaseService.getPassengers, storage.getPassengers()),
            fetchService(supabaseService.getPayments, storage.getPayments()),
            fetchService(supabaseService.getReports, storage.getReports()),
            fetchService(supabaseService.getExpenses, storage.getExpenses())
          ]);
          
          setUsers(u);
          setEvents(e);
          setCongregations(c);
          setPassengers(p);
          setPayments(pay);
          setReports(r);
          setExpenses(exp);
        } else {
          setIsOfflineMode(true);
          // Fallback to LocalStorage
          setUsers(storage.getUsers());
          setEvents(storage.getEvents());
          setCongregations(storage.getCongregations());
          setPassengers(storage.getPassengers());
          setPayments(storage.getPayments());
          setReports(storage.getReports());
          setExpenses(storage.getExpenses());
        }
      } catch (error) {
        console.warn('Supabase not reachable or configured incorrectly. Falling back to LocalStorage.', error);
        setIsOfflineMode(true);
        // Fallback on error
        setUsers(storage.getUsers());
        setEvents(storage.getEvents());
        setCongregations(storage.getCongregations());
        setPassengers(storage.getPassengers());
        setPayments(storage.getPayments());
        setReports(storage.getReports());
        setExpenses(storage.getExpenses());
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [session?.user?.id]);

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
    if (isSupabaseConfigured && !isOfflineMode) {
      events.forEach(e => supabaseService.saveEvent(e).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [events, isLoading, isOfflineMode]);

  useEffect(() => {
    if (isLoading) return;
    storage.savePassengers(passengers);
    if (isSupabaseConfigured && !isOfflineMode) {
      supabaseService.savePassengers(passengers).catch(err => console.warn('Supabase save error:', err));
    }
  }, [passengers, isLoading, isOfflineMode]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveCongregations(congregations);
    if (isSupabaseConfigured && !isOfflineMode) {
      congregations.forEach(c => supabaseService.saveCongregation(c).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [congregations, isLoading, isOfflineMode]);

  useEffect(() => {
    if (isLoading) return;
    storage.savePayments(payments);
    if (isSupabaseConfigured && !isOfflineMode) {
      payments.forEach(p => supabaseService.savePayment(p).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [payments, isLoading, isOfflineMode]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveReports(reports);
    if (isSupabaseConfigured && !isOfflineMode) {
      reports.forEach(r => supabaseService.saveReport(r).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [reports, isLoading, isOfflineMode]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveExpenses(expenses);
    if (isSupabaseConfigured && !isOfflineMode) {
      expenses.forEach(e => supabaseService.saveExpense(e).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [expenses, isLoading, isOfflineMode]);

  useEffect(() => {
    if (isLoading) return;
    storage.saveUsers(users);
    if (isSupabaseConfigured && !isOfflineMode) {
      users.forEach(u => supabaseService.saveUser(u).catch(err => console.warn('Supabase save error:', err)));
    }
  }, [users, isLoading, isOfflineMode]);

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
      lastUpdated: new Date().toISOString(),
      created_by: profile?.id
    } as Congregation;
    setCongregations(prev => [...prev, cong]);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse">Carregando dados...</p>
      </div>
    );
  }

  // Create a dummy user object for Layout compatibility until we refactor Layout
  const legacyUser = profile ? {
    id: profile.id,
    name: profile.name,
    email: session?.user?.email || '',
    role: profile.role,
    congregationId: profile.congregationId || ''
  } as User : null;

  return (
    <div className="relative">
      {isOfflineMode && (
        <div className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 text-center sticky top-0 z-[100] shadow-md">
          ⚠️ Modo Offline: O banco de dados está inacessível. As alterações serão salvas apenas neste navegador.
        </div>
      )}
      <Routes>
        <Route path="/login" element={
        session ? (
          <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace />
        ) : (
          <Login isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        )
      } />

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={
          <Layout
            user={legacyUser!}
            onLogout={handleLogout}
            onNavigate={setCurrentView}
            currentView={currentView}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          >
            {currentView === 'dashboard' && (
              <Dashboard
                user={legacyUser!}
                events={events}
                passengers={passengers}
                payments={payments}
                congregations={congregations}
                expenses={expenses}
                onSaveExpense={saveExpense}
                onDeleteExpense={deleteExpense}
              />
            )}
            {currentView === 'congregations' && (
              <CongregationManagement
                user={legacyUser!}
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
            {currentView === 'events' && (
              <AdminEvents
                events={events}
                onAddEvent={addEvent}
                onToggleEvent={toggleEventStatus}
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
                user={legacyUser!}
                events={events}
                reports={reports}
                onSaveReport={saveSHReport}
                onDeleteReport={deleteSHReport}
              />
            )}
          </Layout>
        } />
      </Route>

      {/* User Routes */}
      <Route element={<ProtectedRoute allowedRoles={['user']} />}>
        <Route path="/dashboard" element={
          <Layout
            user={legacyUser!}
            onLogout={handleLogout}
            onNavigate={setCurrentView}
            currentView={currentView}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          >
            {currentView === 'dashboard' && (
              <Dashboard
                user={legacyUser!}
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
                user={legacyUser!}
                passengers={passengers}
                events={events}
                onAddPassengerGroup={addPassengerGroup}
                onRemovePassenger={removePassenger}
                onUploadDoc={uploadPassengerDoc}
              />
            )}
            {currentView === 'finance' && (
              <FinancialManagement
                user={legacyUser!}
                passengers={passengers}
                events={events}
                payments={payments}
                onAddPayment={savePayment}
                onDeletePayment={deletePayment}
              />
            )}
            {currentView === 'sh-report' && (
              <SHReportForm
                user={legacyUser!}
                events={events}
                reports={reports}
                onSaveReport={saveSHReport}
                onDeleteReport={deleteSHReport}
              />
            )}
          </Layout>
        } />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </div>
  );
};

export default App;
