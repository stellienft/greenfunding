import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCalculatorLayout } from '../context/CalculatorLayoutContext';
import { useNotifications } from '../context/NotificationsContext';
import {
  LogOut, LayoutDashboard, FileText,
  LifeBuoy, Menu, X, ChevronRight, Building2, Calculator,
  Bell, User, Settings, ChevronDown
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
  { path: '/quotes', label: 'My Proposals', icon: FileText },
  { path: '/support', label: 'Support', icon: LifeBuoy },
];

export function InstallerLayout({ children }: InstallerLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { installerProfile, signOut, refreshProfile } = useAuth();
  const { isAdminMode } = useCalculatorLayout();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handleApplicationSubmitted = () => refreshProfile();
    window.addEventListener('applicationSubmitted', handleApplicationSubmitted);
    return () => window.removeEventListener('applicationSubmitted', handleApplicationSubmitted);
  }, [refreshProfile]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isAdminMode) {
    return <>{children}</>;
  }

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
        <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Partner Portal</p>
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

      <div className="px-4 pb-4 pt-3 border-t border-gray-100">
        {installerProfile && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-[10px] font-bold text-white">{initials}</span>
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
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
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

      <div className="flex-1 flex flex-col lg:ml-56 min-w-0 h-screen overflow-hidden">
        {/* Shared header — shown on all screen sizes */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/image.png" alt="Green Funding" className="h-8 lg:hidden" />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notification bell */}
          <button
            onClick={() => navigate('/dashboard?tab=notifications')}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#28AA48] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F] rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-[11px] font-bold text-white">{initials}</span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {installerProfile?.full_name?.split(' ')[0] || 'Account'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50">
                {installerProfile && (
                  <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
                    <p className="text-xs font-semibold text-[#1e2d3d] truncate">{installerProfile.full_name}</p>
                    <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-2.5 h-2.5" />
                      {installerProfile.company_name}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/my-account'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  My Account
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/dashboard?tab=notification-settings'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Notification Settings
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={async () => { setUserMenuOpen(false); await signOut(); navigate('/login'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>

        <footer className="flex-shrink-0 px-6 lg:px-8 py-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <a href="https://greenfunding.com.au" target="_blank" rel="noopener noreferrer">
              <img src="/image copy copy.png" alt="Green Funding" className="h-5 opacity-70 hover:opacity-100 transition-opacity" />
            </a>
            <span className="text-xs text-gray-400">Partner Portal</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
