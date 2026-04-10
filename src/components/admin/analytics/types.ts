export interface TermOption {
  years: number;
  monthlyPayment: number;
  interestRate: number;
  totalFinanced?: number;
}

export interface Quote {
  id: string;
  quote_number: number;
  created_at: string;
  installer_id: string | null;
  project_cost: number;
  term_options: TermOption[];
  asset_names: string[];
  calculator_type: string;
  payment_timing: string;
  status: string;
  installer: {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email: string;
  } | null;
}

export interface Application {
  id: string;
  created_at: string;
  installer_id: string | null;
  project_cost: number;
  loan_term_years: number;
  full_name: string;
  email: string;
}

export interface InstallerUser {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string;
  created_at: string;
  quote_count: number;
  application_count: number;
}

export type DateRange = '7d' | '30d' | 'custom';

export interface DateFilter {
  range: DateRange;
  from: string;
  to: string;
}

export interface InstallerStats {
  id: string;
  name: string;
  company: string;
  email: string;
  quoteCount: number;
  totalValue: number;
  avgDealSize: number;
  applicationCount: number;
  conversionRate: number;
  lastActivity: string | null;
  daysSinceActivity: number;
}

export interface DealScore {
  quoteId: string;
  score: number;
  intent: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface Opportunity {
  id: string;
  type: 'high_value_quote' | 'high_intent' | 'inactive_installer' | 'activity_spike' | 'stalled_application';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
  createdAt: string;
  data?: Record<string, unknown>;
}
