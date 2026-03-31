import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { TwoFactorManager } from '../TwoFactorManager';
import { User, Mail } from 'lucide-react';

interface AdminProfile {
  id: string;
  email: string;
  totp_enabled: boolean;
}

export function AdminAccount() {
  const { admin } = useAdmin();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (admin) loadProfile();
  }, [admin]);

  async function loadProfile() {
    if (!admin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, email, totp_enabled')
        .eq('id', admin.id)
        .maybeSingle();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error loading admin profile:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-gray-500 py-8 text-center">Loading...</div>;
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-[#3A475B]">My Account</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-[#3A475B]">Account Details</h3>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <User className="w-5 h-5 text-[#28AA48]" />
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Role</div>
            <div className="font-semibold text-[#3A475B]">Administrator</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Mail className="w-5 h-5 text-[#28AA48]" />
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Email Address</div>
            <div className="font-semibold text-[#3A475B]">{profile.email}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-[#3A475B]">Security</h3>
        <TwoFactorManager
          userId={profile.id}
          userType="admin"
          email={profile.email}
          totpEnabled={profile.totp_enabled}
          onStatusChange={loadProfile}
          accentColor="#094325"
        />
      </div>
    </div>
  );
}
