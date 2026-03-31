import React from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { TwoFactorManager } from '../components/TwoFactorManager';
import { User, Building2, Mail, Phone, Calendar } from 'lucide-react';

export function MyAccount() {
  const { installerProfile, refreshProfile } = useAuth();

  if (!installerProfile) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] px-8 py-6">
              <h1 className="text-3xl font-bold text-white mb-2">My Account</h1>
              <p className="text-white/90">View your account details and statistics</p>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-[#3A475B] mb-4">Personal Information</h2>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-[#6EAE3C] mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Full Name</div>
                      <div className="font-semibold text-[#3A475B]">{installerProfile.full_name}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-[#6EAE3C] mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Email Address</div>
                      <div className="font-semibold text-[#3A475B]">{installerProfile.email}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-[#6EAE3C] mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Company Name</div>
                      <div className="font-semibold text-[#3A475B]">{installerProfile.company_name}</div>
                    </div>
                  </div>

                  {installerProfile.phone_number && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Phone className="w-5 h-5 text-[#6EAE3C] mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Phone Number</div>
                        <div className="font-semibold text-[#3A475B]">{installerProfile.phone_number}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#6EAE3C] mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Member Since</div>
                      <div className="font-semibold text-[#3A475B]">
                        {new Date(installerProfile.created_at).toLocaleDateString('en-AU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-[#3A475B] mb-4">Activity Statistics</h2>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-blue-700">Total Quotes Generated</div>
                    </div>
                    <div className="text-4xl font-bold text-blue-700">
                      {installerProfile.quote_count || 0}
                    </div>
                    <div className="text-sm text-blue-600 mt-2">
                      Financing calculations created
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-green-700">Applications Submitted</div>
                    </div>
                    <div className="text-4xl font-bold text-green-700">
                      {installerProfile.application_count || 0}
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      Full applications sent for review
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">Account Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-gray-700">Active</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-[#3A475B] mb-4">Security</h3>
                <TwoFactorManager
                  userId={installerProfile.id}
                  userType="installer"
                  email={installerProfile.email}
                  totpEnabled={installerProfile.totp_enabled}
                  onStatusChange={refreshProfile}
                  accentColor="#6EAE3C"
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-[#3A475B] mb-4">Need Help?</h3>
                <p className="text-gray-600 mb-4">
                  If you need to update your account information or have any questions, please contact your administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
