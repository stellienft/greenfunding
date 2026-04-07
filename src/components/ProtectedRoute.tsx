import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, installerProfile, loading, totpVerified } = useAuth();
  const { admin, loading: adminLoading, totpVerified: adminTotpVerified } = useAdmin();

  const combinedLoading = loading || adminLoading;
  const isAdminUser = !!(admin && adminTotpVerified);

  useEffect(() => {
    if (!combinedLoading) {
      if (isAdminUser) return;
      if (!user) {
        navigate('/login');
      } else if (installerProfile?.needs_password_reset) {
        navigate('/reset-password');
      } else if (installerProfile?.totp_enabled && !totpVerified) {
        navigate('/verify-2fa');
      } else if (installerProfile && !installerProfile.totp_setup_prompted) {
        navigate('/setup-2fa');
      }
    }
  }, [user, installerProfile, combinedLoading, totpVerified, navigate, isAdminUser]);

  if (combinedLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-lime-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (isAdminUser) {
    return <>{children}</>;
  }

  if (
    !user ||
    installerProfile?.needs_password_reset ||
    (installerProfile?.totp_enabled && !totpVerified) ||
    (installerProfile && !installerProfile.totp_setup_prompted)
  ) {
    return null;
  }

  return <>{children}</>;
}
