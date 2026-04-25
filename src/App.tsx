import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { Step1 } from './pages/Step1';
import { ServicedRentalStep1 } from './pages/ServicedRentalStep1';
import { Step3 } from './pages/Step3';
import { AdminLogin } from './pages/AdminLogin';
import { AdminResetPassword } from './pages/AdminResetPassword';
import { AdminDashboard } from './pages/AdminDashboard';
import { InstallerLogin } from './pages/InstallerLogin';
import { ResetPassword } from './pages/ResetPassword';
import { InstallerDashboard } from './pages/InstallerDashboard';
import { MyAccount } from './pages/MyAccount';
import { Contacts } from './pages/Contacts';
import { MyQuotes } from './pages/MyQuotes';
import { QuoteDetail } from './pages/QuoteDetail';
import { OnlineQuote } from './pages/OnlineQuote';
import { ReviewQuote } from './pages/ReviewQuote';
import { ClientUploadDocuments } from './pages/ClientUploadDocuments';
import { Setup2FA } from './pages/Setup2FA';
import { Verify2FA } from './pages/Verify2FA';
import { PartnerOnboarding } from './pages/PartnerOnboarding';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Analytics } from './components/Analytics';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';

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

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function SiteMetaInit() {
  useEffect(() => {
    supabase
      .from('site_settings')
      .select('site_title, meta_description, og_image_url')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const title = data.site_title || 'Green Funding Partner Portal';
        const desc = data.meta_description || '';
        const img = data.og_image_url || '';

        document.title = title;
        if (desc) {
          setMeta('description', desc);
          setMeta('og:description', desc, true);
          setMeta('twitter:description', desc);
        }
        setMeta('og:title', title, true);
        setMeta('twitter:title', title);
        if (img) {
          setMeta('og:image', img, true);
          setMeta('twitter:image', img);
        }
      });
  }, []);

  return null;
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
          <NotificationsProvider>
          <AppProvider>
            <SiteMetaInit />
            <AdminInit />
            <Analytics />
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<InstallerLogin />} />
              <Route path="/installer-login" element={<InstallerLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/setup-2fa" element={<Setup2FA />} />
              <Route path="/verify-2fa" element={<Verify2FA />} />
              <Route path="/onboarding" element={<PartnerOnboarding />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <InstallerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/calculators" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/my-account"
                element={
                  <ProtectedRoute>
                    <MyAccount />
                  </ProtectedRoute>
                }
              />
              <Route path="/submissions" element={<Navigate to="/dashboard" replace />} />
              <Route path="/submissions/:id" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <Contacts />
                  </ProtectedRoute>
                }
              />
              <Route path="/contacts" element={<Navigate to="/support" replace />} />
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
              <Route
                path="/quote-preview"
                element={
                  <ProtectedRoute>
                    <OnlineQuote />
                  </ProtectedRoute>
                }
              />
              <Route path="/review-quote/:id" element={<ReviewQuote />} />
              <Route path="/upload-documents/:token" element={<ClientUploadDocuments />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/reset-password" element={<AdminResetPassword />} />
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
          </NotificationsProvider>
        </AuthProvider>
      </AdminProvider>
    </BrowserRouter>
  );
}

export default App;
