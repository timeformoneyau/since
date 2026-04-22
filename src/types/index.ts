export type RepeatUnit = 'days' | 'weeks' | 'months' | 'years';

export interface CompletionEvent {
  id: string;
  date: string; // YYYY-MM-DD
}

export interface SinceItem {
  id: string;
  name: string;
  category: string;
  lastDoneDate: string; // always mirrors history[0].date (most recent completion)
  history: CompletionEvent[]; // newest first
  repeatValue: number | null;
  repeatUnit: RepeatUnit | null;
  createdAt: string;
  updatedAt: string;
}

export type StatusLabel =
  | 'All good'
  | 'Coming up'
  | 'About now'
  | "It's been a while"
  | 'Getting overdue'
  | 'Long overdue';

export interface ItemStatus {
  label: StatusLabel | null; // null = no repeat interval set
  daysSince: number;
  daysUntilDue: number | null;
  nextDueDate: Date | null;
}

export const DEFAULT_CATEGORIES = [
  'Household',
  'Health',
  'Auto',
  'Family',
  'Admin',
  'Purchases',
  'Other',
] as const;

// Main app navigation
export type RootStackParamList = {
  Main: undefined;
  Add: undefined;
  Edit: { itemId: string };
  Detail: { itemId: string };
  Account: undefined;
  ChangePassword: undefined;
};

// Auth flow navigation
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};
