import { createContext, useContext, ReactNode } from 'react';

interface CalculatorLayoutContextType {
  isAdminMode: boolean;
  onAdminNavigate?: (path: string) => void;
}

const CalculatorLayoutContext = createContext<CalculatorLayoutContextType>({ isAdminMode: false });

interface AdminCalculatorProviderProps {
  children: ReactNode;
  onNavigate?: (path: string) => void;
}

export function AdminCalculatorProvider({ children, onNavigate }: AdminCalculatorProviderProps) {
  return (
    <CalculatorLayoutContext.Provider value={{ isAdminMode: true, onAdminNavigate: onNavigate }}>
      {children}
    </CalculatorLayoutContext.Provider>
  );
}

export function useCalculatorLayout() {
  return useContext(CalculatorLayoutContext);
}
