import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, installerProfile, loading, totpVerified } = useAuth();

  useEffect(() => {
    if (!loading) {
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
  }, [user, installerProfile, loading, totpVerified, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-lime-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
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
