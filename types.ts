
export enum UserRole {
  ADMIN = 'ADMIN',
  CONGREGATION = 'CONGREGATION'
}

export enum EventType {
  CIRCUIT_ASSEMBLY = 'Assembleia de Circuito',
  BETHEL_ASSEMBLY = 'Assembleia com Representante de Betel',
  REGIONAL_CONVENTION = 'Congresso Regional'
}

export interface User {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  congregationId?: string;
  name: string;
}

export interface Congregation {
  id: string;
  name: string;
  passengersTotal: number;
  ticketsPurchased: number;
  // Campos do Perfil Administrativo
  coordinatorName?: string;
  circuit?: string;
  cityState?: string;
  phone?: string;
  lastUpdated?: string;
  isPaidConfirmed?: boolean;
  accessCode?: string;
}

export interface JWEvent {
  id: string;
  name: string;
  type: EventType;
  startDate: string;
  days: number;
  pricePerTicket: number;
  isActive: boolean;
  paymentDeadline?: string;
  registrationDeadline?: string;
  info?: string;
  fileUrl?: string;
  fileName?: string;
}

export type AccommodationType = 'LAP' | 'SEAT' | 'NORMAL';

export interface Passenger {
  id: string;
  groupId: string;
  congregationId: string;
  eventId: string;
  name: string;
  document: string; // RG or CPF
  age: number;
  mobile?: string;
  payerName: string;
  isPayer: boolean;
  accommodationType: AccommodationType;
  sitsOnLap: boolean; 
  travelingWithParent: boolean; // For <= 16 years
  isUnaccompaniedMinor: boolean; // Logic: age <= 16 AND NOT travelingWithParent
  termOfResponsibilityUrl?: string; // Uploaded doc
  status: 'PENDING' | 'CONFIRMED';
  selectedDays?: string[]; // Array of ISO date strings (YYYY-MM-DD) for multi-day events
}

export type ExcessTreatment = 'DONATION' | 'CHANGE';

export interface PaymentReceipt {
  id: string;
  congregationId: string;
  eventId: string;
  payerName: string; 
  amount: number;
  appliedAmount: number; // Amount used to cover debt
  excessAmount: number;  // Overpaid amount
  excessTreatment?: ExcessTreatment;
  justification?: string;
  excessDocUrl?: string; // Complementary doc for justification
  date: string;
  imageUrl?: string;
  imageUrls?: string[];
  status: 'VALIDATED' | 'PENDING';
  observation?: string;
}

export interface SHReport {
  id: string;
  congregationId: string;
  eventId: string;
  date: string;
  answers: Record<string, string | number | boolean>;
}

export interface Expense {
  id: string;
  eventId: string;
  description: string;
  amount: number;
  date: string;
}
