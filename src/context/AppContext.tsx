import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Asset, RequiredDocument } from '../lib/supabase';
import { CalculatorConfig } from '../calculator';

interface AppState {
  projectCost: number;
  loanTermYears: number;
  selectedAssetIds: string[];
  annualSolarGenerationKwh?: number;
  specialPricingRequested?: boolean;
  businessDescription?: string;
  residualPercentage?: number;
  paymentTiming?: 'advance' | 'arrears';
  calculatorType?: 'rental' | 'progress_payment_rental' | 'serviced_rental';
  progressPayments?: Array<{ percentage: number; daysAfterStart: number }>;
  annualMaintenanceFee?: number;
  annualMaintenanceCost?: number;
  recipientEmail?: string;
  recipientName?: string;
  recipientCompany?: string;
  siteAddress?: string;
  systemSize?: string;
}

interface AppContextType {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  resetState: () => void;
  config: CalculatorConfig | null;
  assets: Asset[];
  documents: RequiredDocument[];
  loadingConfig: boolean;
  refreshConfig: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    projectCost: 100000,
    loanTermYears: 5,
    selectedAssetIds: [],
    paymentTiming: 'arrears',
    calculatorType: 'rental'
  });

  const [config, setConfig] = useState<CalculatorConfig | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const { data, error } = await supabase
        .from('calculator_config')
        .select('config')
        .eq('calculator_type', 'rental')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const baseConfig = data.config as CalculatorConfig;

        const { data: siteSettings } = await supabase
          .from('site_settings')
          .select('application_fee, ppsr_fee')
          .maybeSingle();

        const mergedConfig = {
          ...baseConfig,
          applicationFee: siteSettings?.application_fee ? parseFloat(siteSettings.application_fee) : 0,
          ppsrFee: siteSettings?.ppsr_fee ? parseFloat(siteSettings.ppsr_fee) : 0
        };

        setConfig(mergedConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('active', true)
        .order('ordering');

      if (error) throw error;
      if (data) setAssets(data);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('required_documents')
        .select('*')
        .eq('active', true)
        .order('ordering');

      if (error) throw error;
      if (data) setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  useEffect(() => {
    loadConfig();
    loadAssets();
    loadDocuments();
  }, []);

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const resetState = () => {
    setState({
      projectCost: 100000,
      loanTermYears: 5,
      selectedAssetIds: [],
      paymentTiming: 'arrears'
    });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        updateState,
        resetState,
        config,
        assets,
        documents,
        loadingConfig,
        refreshConfig: loadConfig,
        refreshAssets: loadAssets,
        refreshDocuments: loadDocuments
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
