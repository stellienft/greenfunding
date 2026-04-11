import { createContext, useContext, ReactNode } from 'react';

interface CalculatorLayoutContextType {
  isAdminMode: boolean;
}

const CalculatorLayoutContext = createContext<CalculatorLayoutContextType>({ isAdminMode: false });

export function AdminCalculatorProvider({ children }: { children: ReactNode }) {
  return (
    <CalculatorLayoutContext.Provider value={{ isAdminMode: true }}>
      {children}
    </CalculatorLayoutContext.Provider>
  );
}

export function useCalculatorLayout() {
  return useContext(CalculatorLayoutContext);
}
