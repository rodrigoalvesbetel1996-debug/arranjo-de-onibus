
import { STORAGE_KEYS, INITIAL_ADMIN, MOCK_CONGREGATIONS, MOCK_EVENTS } from '@/constants';
import { User, JWEvent, Congregation, Passenger, PaymentReceipt, SHReport, UserRole, Expense } from '@/types';

export const storage = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [INITIAL_ADMIN];
  },
  saveUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),

  getEvents: (): JWEvent[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
    return data ? JSON.parse(data) : MOCK_EVENTS;
  },
  saveEvents: (events: JWEvent[]) => localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events)),

  getCongregations: (): Congregation[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONGREGATIONS);
    return data ? JSON.parse(data) : MOCK_CONGREGATIONS;
  },
  saveCongregations: (congs: Congregation[]) => localStorage.setItem(STORAGE_KEYS.CONGREGATIONS, JSON.stringify(congs)),

  getPassengers: (): Passenger[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PASSENGERS);
    return data ? JSON.parse(data) : [];
  },
  savePassengers: (pass: Passenger[]) => localStorage.setItem(STORAGE_KEYS.PASSENGERS, JSON.stringify(pass)),

  getPayments: (): PaymentReceipt[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return data ? JSON.parse(data) : [];
  },
  savePayments: (pay: PaymentReceipt[]) => localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(pay)),

  getReports: (): SHReport[] => {
    const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
    return data ? JSON.parse(data) : [];
  },
  saveReports: (rep: SHReport[]) => localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(rep)),

  getExpenses: (): Expense[] => {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },
  saveExpenses: (exp: Expense[]) => localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(exp)),

  getSession: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },
  setSession: (user: User | null) => {
    if (user) localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
};
