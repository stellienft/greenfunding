import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Admin {
  id: string;
  email: string;
  needs_password_reset?: boolean;
}

export type AdminLoginResult =
  | { status: 'ok' }
  | { status: 'requires2fa'; adminId: string }
  | { status: 'setup2fa'; adminId: string; email: string };

interface AdminContextType {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<AdminLoginResult>;
  logout: () => void;
  loading: boolean;
  totpVerified: boolean;
  completeTotpVerification: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [totpVerified, setTotpVerified] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin');
    if (stored) {
      try {
        setAdmin(JSON.parse(stored));
        setTotpVerified(true);
      } catch (e) {
        localStorage.removeItem('admin');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AdminLoginResult> => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth/login`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.requires2fa) {
      return { status: 'requires2fa', adminId: data.admin.id };
    }

    if (!data.totp_setup_prompted) {
      return { status: 'setup2fa', adminId: data.admin.id, email: data.admin.email };
    }

    setAdmin(data.admin);
    setTotpVerified(true);
    localStorage.setItem('admin', JSON.stringify(data.admin));
    return { status: 'ok' };
  };

  const logout = () => {
    setAdmin(null);
    setTotpVerified(false);
    localStorage.removeItem('admin');
  };

  const completeTotpVerification = () => {
    setTotpVerified(true);
  };

  return (
    <AdminContext.Provider value={{ admin, login, logout, loading, totpVerified, completeTotpVerification }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
