import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAdmin } from '../context/AdminContext';
import { supabase } from '../lib/supabase';
import { CalculatorConfig } from '../calculator';
import { ConfigEditor } from '../components/admin/ConfigEditor';
import { AssetsManager } from '../components/admin/AssetsManager';
import { DocumentsManager } from '../components/admin/DocumentsManager';
import { ApplicationsList } from '../components/admin/ApplicationsList';
import { PreviewTool } from '../components/admin/PreviewTool';
import { UserManagement } from '../components/admin/UserManagement';
import { SiteSettings } from '../components/admin/SiteSettings';
import { EmailTemplates } from '../components/admin/EmailTemplates';
import { LogOut, Settings, Package, FileText, Inbox, Eye, Users, Globe, Mail } from 'lucide-react';

type Tab = 'config' | 'assets' | 'documents' | 'applications' | 'preview' | 'users' | 'site' | 'email';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { admin, logout } = useAdmin();
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [config, setConfig] = useState<CalculatorConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) {
      navigate('/admin/login');
      return;
    }
    loadConfig();
  }, [admin, navigate]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calculator_config')
        .select('config')
        .eq('calculator_type', 'rental')
        .maybeSingle();

      if (error) throw error;
      if (data) setConfig(data.config as CalculatorConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/admin/login';
  };

  const tabs = [
    { id: 'config' as Tab, label: 'Calculator Config', icon: Settings },
    { id: 'assets' as Tab, label: 'Assets', icon: Package },
    { id: 'documents' as Tab, label: 'Documents', icon: FileText },
    { id: 'applications' as Tab, label: 'Applications', icon: Inbox },
    { id: 'users' as Tab, label: 'User Management', icon: Users },
    { id: 'site' as Tab, label: 'Site Settings', icon: Globe },
    { id: 'email' as Tab, label: 'Email Templates', icon: Mail },
    { id: 'preview' as Tab, label: 'Preview Tool', icon: Eye },
  ];

  if (!admin) {
    return null;
  }

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-[#3A475B]">Admin Panel</h1>
                <p className="text-sm text-gray-600">Logged in as {admin.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-[#3A475B] hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex overflow-x-auto">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 px-6 py-4 font-semibold whitespace-nowrap transition-colors
                        ${
                          activeTab === tab.id
                            ? 'border-b-2 border-[#28AA48] text-[#28AA48]'
                            : 'text-gray-600 hover:text-[#3A475B]'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="text-center py-12 text-gray-600">Loading...</div>
              ) : (
                <>
                  {activeTab === 'config' && config && (
                    <ConfigEditor config={config} onUpdate={loadConfig} />
                  )}
                  {activeTab === 'assets' && <AssetsManager />}
                  {activeTab === 'documents' && <DocumentsManager />}
                  {activeTab === 'applications' && <ApplicationsList />}
                  {activeTab === 'users' && <UserManagement />}
                  {activeTab === 'site' && <SiteSettings />}
                  {activeTab === 'email' && <EmailTemplates />}
                  {activeTab === 'preview' && config && (
                    <PreviewTool config={config} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
