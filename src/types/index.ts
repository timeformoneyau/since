export type RepeatUnit = 'days' | 'weeks' | 'months' | 'years';

export interface CompletionEvent {
  id: string;
  date: string; // YYYY-MM-DD
}

export interface SinceItem {
  id: string;
  name: string;
  category: string;
  lastDoneDate: string;
  history: CompletionEvent[]; // newest first
  repeatValue: number | null;
  repeatUnit: RepeatUnit | null;
  notes: string | null;
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
  label: StatusLabel | null;
  daysSince: number;
  daysUntilDue: number | null;
  nextDueDate: Date | null;
}

export const DEFAULT_CATEGORIES = [
  'Household',
  'Health',
  'Auto',
  'Family',
  'Finance',
  'Admin',
  'Purchases',
  'Other',
] as const;

export type TabParamList = {
  Since: undefined;
  AddTab: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Add: undefined;
  Edit: { itemId: string };
  Detail: { itemId: string };
  ChangePassword: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};
