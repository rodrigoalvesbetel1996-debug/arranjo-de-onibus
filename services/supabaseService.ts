import { supabase } from '@/lib/supabase';
import { User, JWEvent, Congregation, Passenger, PaymentReceipt, SHReport, Expense } from '@/types';

export const supabaseService = {
  // Auth & Profiles
  getCurrentProfile: async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as User;
  },

  validateAccessCode: async (code: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('congregation_access_codes')
      .select('congregationId')
      .eq('code', code.toUpperCase())
      .eq('isActive', true)
      .single();
    
    if (error || !data) return null;
    return data.congregationId;
  },

  linkUserToCongregation: async (userId: string, congregationId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ congregationId: congregationId })
      .eq('id', userId);
    if (error) throw error;
  },

  // Users (Profiles)
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data as User[];
  },
  saveUser: async (user: User) => {
    const { error } = await supabase.from('profiles').upsert(user);
    if (error) throw error;
  },

  // Events
  getEvents: async (): Promise<JWEvent[]> => {
    const { data, error } = await supabase.from('events').select('*');
    if (error) throw error;
    return data as JWEvent[];
  },
  saveEvent: async (event: JWEvent) => {
    const { error } = await supabase.from('events').upsert(event);
    if (error) throw error;
  },
  deleteEvent: async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
  },

  // Congregations
  getCongregations: async (): Promise<Congregation[]> => {
    try {
      const { data, error } = await supabase.from('congregations').select('*, congregation_access_codes(code)');
      
      if (error) {
        console.warn('Error fetching congregations with access codes, trying simple fetch:', error);
        const { data: simpleData, error: simpleError } = await supabase.from('congregations').select('*');
        if (simpleError) throw simpleError;
        return simpleData as Congregation[];
      }
      
      // Map access code from the joined table if needed
      return data.map(c => ({
        ...c,
        accessCode: c.congregation_access_codes?.[0]?.code || ''
      })) as Congregation[];
    } catch (err) {
      console.error('Failed to get congregations:', err);
      throw err;
    }
  },
  saveCongregation: async (cong: Congregation) => {
    // 1. Sanitize data: remove properties that are not columns in the 'congregations' table
    // We extract accessCode (to save in other table) and congregation_access_codes/stats (which come from joins/calculations)
    const { accessCode, congregation_access_codes, stats, ...congData } = cong as any;
    
    const { error: congError } = await supabase.from('congregations').upsert(congData);
    if (congError) throw congError;

    // 2. Save to congregation_access_codes table
    if (accessCode) {
      const { error: codeError } = await supabase
        .from('congregation_access_codes')
        .upsert({
          congregationId: cong.id,
          code: accessCode.toUpperCase(),
          isActive: true
        }, { onConflict: 'congregationId' });
      if (codeError) console.warn('Error saving access code:', codeError);
    }
  },

  // Passengers
  getPassengers: async (): Promise<Passenger[]> => {
    const { data, error } = await supabase.from('passengers').select('*');
    if (error) throw error;
    return data as Passenger[];
  },
  savePassengers: async (passengers: Passenger[]) => {
    const { error } = await supabase.from('passengers').upsert(passengers);
    if (error) throw error;
  },
  deletePassenger: async (id: string) => {
    const { error } = await supabase.from('passengers').delete().eq('id', id);
    if (error) throw error;
  },

  // Payments
  getPayments: async (): Promise<PaymentReceipt[]> => {
    const { data, error } = await supabase.from('payments').select('*');
    if (error) throw error;
    return data as PaymentReceipt[];
  },
  savePayment: async (payment: PaymentReceipt) => {
    const { error } = await supabase.from('payments').upsert(payment);
    if (error) throw error;
  },
  deletePayment: async (id: string) => {
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
  },

  // Reports
  getReports: async (): Promise<SHReport[]> => {
    const { data, error } = await supabase.from('sh_reports').select('*');
    if (error) throw error;
    return data as SHReport[];
  },
  saveReport: async (report: SHReport) => {
    const { error } = await supabase.from('sh_reports').upsert(report);
    if (error) throw error;
  },
  deleteReport: async (id: string) => {
    const { error } = await supabase.from('sh_reports').delete().eq('id', id);
    if (error) throw error;
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    const { data, error } = await supabase.from('expenses').select('*');
    if (error) throw error;
    return data as Expense[];
  },
  saveExpense: async (expense: Expense) => {
    const { error } = await supabase.from('expenses').upsert(expense);
    if (error) throw error;
  },
  deleteExpense: async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  }
};
