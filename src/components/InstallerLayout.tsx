import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, LayoutDashboard, User, FileText,
  LifeBuoy, Menu, X, ChevronRight, Building2, Calculator
} from 'lucide-react';

interface InstallerLayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, matchPrefix: '/dashboard' },
  { path: '/calculator/step1', label: 'Calculator', icon: Calculator, matchPrefix: '/calculator' },
  { path: '/quotes', label: 'My Quotes', icon: FileText },
  { path: '/my-account', label: 'My Account', icon: User },
  { path: '/support', label: 'Support', icon: LifeBuoy },
];

export function InstallerLayout({ children }: InstallerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { installerProfile, signOut, refreshProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleApplicationSubmitted = () => refreshProfile();
    window.addEventListener('applicationSubmitted', handleApplicationSubmitted);
    return () => window.removeEventListener('applicationSubmitted', handleApplicationSubmitted);
  }, [refreshProfile]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return location.pathname.startsWith(item.matchPrefix);
    }
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const initials = installerProfile?.full_name
    ? installerProfile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <img
          src="/image.png"
          alt="Green Funding"
          className="h-9 mb-1 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        />
        <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Installer Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? 'bg-[#6EAE3C]/10 text-[#4d8a25] border border-[#6EAE3C]/20'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#6EAE3C]' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-[#6EAE3C]" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-100 pt-4">
        {installerProfile && (
          <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#3A475B] truncate">{installerProfile.full_name}</div>
              <div className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5" />
                {installerProfile.company_name}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30 shadow-sm">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-white shadow-xl flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:ml-56 min-w-0">
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/image.png" alt="Green Funding" className="h-8" />
          {installerProfile && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] rounded-full flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>

        <footer className="px-6 lg:px-8 py-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <a href="https://greenfunding.com.au" target="_blank" rel="noopener noreferrer">
              <img src="/image copy copy.png" alt="Green Funding" className="h-5 opacity-70 hover:opacity-100 transition-opacity" />
            </a>
            <span className="text-xs text-gray-400">Green Funding Installer Portal</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
