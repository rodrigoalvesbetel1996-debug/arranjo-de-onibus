
import React from 'react';
import { UserRole, EventType, User, JWEvent, Congregation } from '@/types';

export const INITIAL_ADMIN: User = {
  id: 'admin-001',
  email: 'admin', // Usuário padrão alterado para 'admin'
  password: 'admin123', // Senha padrão alterada
  role: UserRole.ADMIN,
  name: 'Administrador Geral'
};

export const MOCK_CONGREGATIONS: Congregation[] = [
  { id: 'cong-01', name: 'Centro', passengersTotal: 0, ticketsPurchased: 0, circuit: 'PR-10', cityState: 'Cascavel / PR', accessCode: '123456' },
  { id: 'cong-02', name: 'Jardim Planalto', passengersTotal: 0, ticketsPurchased: 0, circuit: 'PR-10', cityState: 'Cascavel / PR', accessCode: '123456' },
  { id: 'cong-03', name: 'Vila Nova', passengersTotal: 0, ticketsPurchased: 0, circuit: 'PR-10', cityState: 'Cascavel / PR', accessCode: '123456' },
  { id: 'cong-04', name: 'Esperança', passengersTotal: 0, ticketsPurchased: 0, circuit: 'PR-12', cityState: 'Toledo / PR', accessCode: '123456' },
  { id: 'cong-05', name: 'Jardim Castelo', passengersTotal: 0, ticketsPurchased: 0, circuit: 'PR-12', cityState: 'Toledo / PR', accessCode: '123456' },
];

export const MOCK_EVENTS: JWEvent[] = [
  {
    id: 'ev-01',
    name: 'Assembleia de Circuito - Outubro 2024',
    type: EventType.CIRCUIT_ASSEMBLY,
    startDate: '2024-10-15',
    days: 1,
    pricePerTicket: 45.00,
    isActive: true
  }
];

export const STORAGE_KEYS = {
  USERS: 'jw_users',
  EVENTS: 'jw_events',
  CONGREGATIONS: 'jw_congs',
  PASSENGERS: 'jw_passengers',
  PAYMENTS: 'jw_payments',
  REPORTS: 'jw_reports',
  EXPENSES: 'jw_expenses',
  SESSION: 'jw_session'
};
