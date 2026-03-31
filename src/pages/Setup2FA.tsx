import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { TwoFactorSetup } from '../components/TwoFactorSetup';
import { useAuth } from '../context/AuthContext';

export function Setup2FA() {
  const navigate = useNavigate();
  const { user, installerProfile, refreshProfile, markTotpSetupPrompted } = useAuth();

  if (!user || !installerProfile) {
    navigate('/login', { replace: true });
    return null;
  }

  async function handleComplete() {
    await refreshProfile();
    navigate('/dashboard', { replace: true });
  }

  async function handleSkip() {
    await markTotpSetupPrompted();
    navigate('/dashboard', { replace: true });
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
            <TwoFactorSetup
              userId={user.id}
              userType="installer"
              email={installerProfile.email}
              onComplete={handleComplete}
              onSkip={handleSkip}
              accentColor="#6EAE3C"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
