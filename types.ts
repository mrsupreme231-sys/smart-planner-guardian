
export type InstallmentType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type InstallmentStatus = 'pending' | 'confirmed' | 'waited' | 'failed';

export interface InstallmentLog {
  id: string;
  dueDate: string;
  status: InstallmentStatus;
  amount: number;
  confirmedAt?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
}

export const DEFAULT_GOAL_CATEGORIES: Category[] = [
  { id: 'savings', label: 'Savings', icon: '💰' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'tech', label: 'Gadgets/Tech', icon: '📱' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'home', label: 'Home/Rent', icon: '🏠' },
  { id: 'emergency', label: 'Emergency', icon: '🚨' },
  { id: 'other', label: 'Other', icon: '✨' }
];

export interface Goal {
  id: string;
  title: string;
  category: string;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  deadline: string; // ISO string
  createdAt: string; // ISO string
  installmentType: InstallmentType;
  useBuffer: boolean;
  status: 'active' | 'completed' | 'failed';
  isSubscription?: boolean;
  isWeeklyPlan?: boolean;
  monthlyAmount?: number;
  weeklyAmount?: number;
  startDate?: string;
  // Counters for deduction tracking
  totalInstallments: number;
  paidInstallments: number;
  // Notification and Schedule fields
  reminderTime: string; // "HH:mm"
  reminderDay: number; // 0-6 for Weekly (Sun-Sat)
  installmentLogs: InstallmentLog[];
}

export interface UserProfile {
  email: string;
  name: string;
  currency: string;
  avatar: string;
}

export interface AppState {
  currentUser: UserProfile | null;
  goals: Goal[];
  history: Goal[];
  hasSeenOnboarding: boolean;
  customCategories: Category[];
}
