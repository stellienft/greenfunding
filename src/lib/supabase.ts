import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Asset {
  id: string;
  name: string;
  description: string;
  icon: string;
  ordering: number;
  active: boolean;
  risk_adjustment: number;
  max_loan_term: number;
  created_at: string;
}

export interface RequiredDocument {
  id: string;
  name: string;
  description: string;
  ordering: number;
  active: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  project_cost: number;
  loan_term_years: number;
  selected_assets: string[];
  calculated_monthly_repayment: number;
  calculated_approval_amount: number;
  calculated_total_repayment: number;
  annual_solar_generation_kwh?: number;
  calculated_cost_per_kwh?: number;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  best_time_to_contact: string;
  notes: string;
  config_snapshot: any;
  uploaded_documents: any;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login_at: string | null;
}
