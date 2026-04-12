import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAdmin } from '../context/AdminContext';
import { supabase } from '../lib/supabase';
import { CalculatorConfig } from '../calculator';
import { ConfigEditor } from '../components/admin/ConfigEditor';
import { AssetsManager } from '../components/admin/AssetsManager';
import { DocumentsManager } from '../components/admin/DocumentsManager';
import { AdminQuotesList } from '../components/admin/AdminQuotesList';
import { AdminCalculatorPicker } from '../components/admin/AdminCalculatorPicker';
import { UserManagement } from '../components/admin/UserManagement';
import { SiteSettings } from '../components/admin/SiteSettings';
import { EmailTemplates } from '../components/admin/EmailTemplates';
import { AdminAccount } from '../components/admin/AdminAccount';
import { AcceptedQuotes } from '../components/admin/AcceptedQuotes';
import { AnalyticsDashboard } from '../components/admin/analytics/AnalyticsDashboard';
import { PlatformDashboard } from '../components/admin/PlatformDashboard';
import { Step1 } from './Step1';
import { ServicedRentalStep1 } from './ServicedRentalStep1';
import { Step3 } from './Step3';
import { AdminCalculatorProvider } from '../context/CalculatorLayoutContext';
import { LogOut, Settings, Package, FileText, Calculator, Users, Globe, Mail, CircleUser as UserCircle, Send, ChevronRight, Menu, BarChart2, LayoutDashboard, CheckSquare } from 'lucide-react';

type CalcView = 'picker' | 'step1' | 'serviced-rental-step1' | 'step3';

type Tab = 'dashboard' | 'config' | 'assets' | 'documents' | 'quotes' | 'accepted-quotes' | 'calculator' | 'users' | 'site' | 'email' | 'account' | 'analytics';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Calculator',
    items: [
      { id: 'config' as Tab, label: 'Calculator Config', icon: Settings },
      { id: 'assets' as Tab, label: 'Assets', icon: Package },
      { id: 'calculator' as Tab, label: 'Calculator', icon: Calculator },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Activity',
    items: [
      { id: 'quotes' as Tab, label: 'Quotes', icon: Send },
      { id: 'accepted-quotes' as Tab, label: 'Accepted Quotes', icon: CheckSquare },
      { id: 'documents' as Tab, label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'users' as Tab, label: 'User Management', icon: Users },
      { id: 'site' as Tab, label: 'Site Settings', icon: Globe },
      { id: 'email' as Tab, label: 'Email Templates', icon: Mail },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'account' as Tab, label: 'My Account', icon: UserCircle },
    ],
  },
];

export function AdminDashboard() {
  const navigate = useNavigate();
  const { admin, logout } = useAdmin();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [calcView, setCalcView] = useState<CalcView>('picker');
  const [config, setConfig] = useState<CalculatorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === activeTab)?.label ?? '';

  const handleAdminCalcNavigate = (path: string) => {
    if (path.includes('step1') && path.includes('serviced-rental')) {
      setCalcView('serviced-rental-step1');
    } else if (path.includes('step1')) {
      setCalcView('step1');
    } else if (path.includes('step-3')) {
      setCalcView('step3');
    } else {
      setCalcView('picker');
    }
  };

  const handleCalcPickerOpen = (_id: string, path: string) => {
    handleAdminCalcNavigate(path);
  };

  if (!admin) {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1">
          <img src="/favicon-_3.png" alt="Logo" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-base font-bold text-[#3A475B]">Admin Panel</span>
        </div>
        <p className="text-xs text-gray-400 truncate">{admin.email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setSidebarOpen(false); if (item.id === 'calculator') setCalcView('picker'); }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-[#28AA48]/10 text-[#28AA48]'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-[#3A475B]'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#28AA48]' : 'text-gray-400'}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#28AA48]" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-gray-400" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <Layout showHeader={false}>
      <div className="min-h-screen bg-gray-50 flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 shadow-lg flex flex-col
            transition-transform duration-200
            lg:static lg:translate-x-0 lg:shadow-none lg:flex
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <SidebarContent />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-[#3A475B]">{activeLabel}</h2>
            </div>
            <button
              onClick={handleLogout}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </header>

          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            {activeTab === 'dashboard' ? (
              <PlatformDashboard onNavigate={(tab) => setActiveTab(tab as Tab)} />
            ) : activeTab === 'analytics' ? (
              <AnalyticsDashboard />
            ) : loading ? (
              <div className="text-center py-12 text-gray-600">Loading...</div>
            ) : (
              <>
                {activeTab === 'config' && config && (
                  <ConfigEditor config={config} onUpdate={loadConfig} />
                )}
                {activeTab === 'assets' && <AssetsManager />}
                {activeTab === 'documents' && <DocumentsManager />}
                {activeTab === 'quotes' && <AdminQuotesList />}
                {activeTab === 'accepted-quotes' && <AcceptedQuotes />}
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'site' && <SiteSettings />}
                {activeTab === 'email' && <EmailTemplates />}
                {activeTab === 'calculator' && (
                  <AdminCalculatorProvider onNavigate={handleAdminCalcNavigate}>
                    {calcView === 'picker' && (
                      <AdminCalculatorPicker onOpen={handleCalcPickerOpen} />
                    )}
                    {calcView === 'step1' && <Step1 />}
                    {calcView === 'serviced-rental-step1' && <ServicedRentalStep1 />}
                    {calcView === 'step3' && <Step3 />}
                  </AdminCalculatorProvider>
                )}
                {activeTab === 'account' && <AdminAccount />}
              </>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
}
