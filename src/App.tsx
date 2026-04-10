import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AuthProvider } from './context/AuthContext';
import { Step1 } from './pages/Step1';
import { ServicedRentalStep1 } from './pages/ServicedRentalStep1';
import { Step3 } from './pages/Step3';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { InstallerLogin } from './pages/InstallerLogin';
import { ResetPassword } from './pages/ResetPassword';
import { CalculatorDashboard } from './pages/CalculatorDashboard';
import { MyAccount } from './pages/MyAccount';
import { Submissions } from './pages/Submissions';
import { SubmissionDetail } from './pages/SubmissionDetail';
import { Contacts } from './pages/Contacts';
import { MyQuotes } from './pages/MyQuotes';
import { QuoteDetail } from './pages/QuoteDetail';
import { Setup2FA } from './pages/Setup2FA';
import { Verify2FA } from './pages/Verify2FA';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Analytics } from './components/Analytics';
import { useEffect } from 'react';

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, loading, totpVerified } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!totpVerified) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function AdminInit() {
  useEffect(() => {
    const initAdmin = async () => {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth/init`;

      try {
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error initializing admin:', error);
      }
    };

    initAdmin();
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AdminProvider>
        <AuthProvider>
          <AppProvider>
            <AdminInit />
            <Analytics />
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<InstallerLogin />} />
              <Route path="/installer-login" element={<InstallerLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/setup-2fa" element={<Setup2FA />} />
              <Route path="/verify-2fa" element={<Verify2FA />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <CalculatorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-account"
                element={
                  <ProtectedRoute>
                    <MyAccount />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submissions"
                element={
                  <ProtectedRoute>
                    <Submissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submissions/:id"
                element={
                  <ProtectedRoute>
                    <SubmissionDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contacts"
                element={
                  <ProtectedRoute>
                    <Contacts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calculator/step1"
                element={
                  <ProtectedRoute>
                    <Step1 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calculator/serviced-rental-step1"
                element={
                  <ProtectedRoute>
                    <ServicedRentalStep1 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/step-3"
                element={
                  <ProtectedRoute>
                    <Step3 />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quotes"
                element={
                  <ProtectedRoute>
                    <MyQuotes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quotes/:id"
                element={
                  <ProtectedRoute>
                    <QuoteDetail />
                  </ProtectedRoute>
                }
              />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                }
              />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
