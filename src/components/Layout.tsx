import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import { LogOut, User, FileCheck, Calculator, Home, Send, FileText, Shield } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export function Layout({ children, showHeader = true }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, installerProfile, signOut, refreshProfile } = useAuth();
  const { admin, logout: adminLogout, totpVerified: adminTotpVerified } = useAdmin();

  const isAdminUser = !!(admin && adminTotpVerified);

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  useEffect(() => {
    const handleApplicationSubmitted = () => {
      refreshProfile();
    };

    window.addEventListener('applicationSubmitted', handleApplicationSubmitted);
    return () => {
      window.removeEventListener('applicationSubmitted', handleApplicationSubmitted);
    };
  }, [refreshProfile]);

  const handleLogout = async () => {
    if (isAdminUser) {
      adminLogout();
      window.location.href = '/admin/login';
      return;
    }
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const showNav = (user && installerProfile) || isAdminUser;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {showHeader && (
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex flex-col items-center text-center mb-4">
              <img
                src="/image.png"
                alt="Green Funding"
                className="h-10 sm:h-12 mb-2 cursor-pointer"
                onClick={() => navigate('/dashboard')}
              />
              <h1 className="text-lg sm:text-xl font-bold text-[#3A475B] mb-1">
                Green Funding Installer Portal
              </h1>
              <p className="text-xs text-gray-600 max-w-2xl px-4">
                Calculate your green energy project financing with flexible terms and competitive rates
              </p>
            </div>

            {showNav && (
              <>
                <nav className="flex justify-center mb-4">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    <button
                      onClick={() => navigate('/dashboard')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        isActivePath('/dashboard')
                          ? 'bg-white text-[#6EAE3C] shadow-sm'
                          : 'text-gray-700 hover:bg-white/50'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      <span className="hidden sm:inline">Calculators</span>
                    </button>
                    {!isAdminUser && (
                      <>
                        <button
                          onClick={() => navigate('/my-account')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            isActivePath('/my-account')
                              ? 'bg-white text-[#6EAE3C] shadow-sm'
                              : 'text-gray-700 hover:bg-white/50'
                          }`}
                        >
                          <User className="w-4 h-4" />
                          <span className="hidden sm:inline">My Account</span>
                        </button>
                        <button
                          onClick={() => navigate('/submissions')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            isActivePath('/submissions')
                              ? 'bg-white text-[#6EAE3C] shadow-sm'
                              : 'text-gray-700 hover:bg-white/50'
                          }`}
                        >
                          <FileCheck className="w-4 h-4" />
                          <span className="hidden sm:inline">Submissions</span>
                        </button>
                        <button
                          onClick={() => navigate('/quotes')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            isActivePath('/quotes')
                              ? 'bg-white text-[#6EAE3C] shadow-sm'
                              : 'text-gray-700 hover:bg-white/50'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="hidden sm:inline">My Quotes</span>
                        </button>
                        <button
                          onClick={() => navigate('/contacts')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            isActivePath('/contacts')
                              ? 'bg-white text-[#6EAE3C] shadow-sm'
                              : 'text-gray-700 hover:bg-white/50'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Contacts</span>
                        </button>
                      </>
                    )}
                    {isAdminUser && (
                      <button
                        onClick={() => navigate('/admin')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          isActivePath('/admin')
                            ? 'bg-white text-[#6EAE3C] shadow-sm'
                            : 'text-gray-700 hover:bg-white/50'
                        }`}
                      >
                        <Shield className="w-4 h-4" />
                        <span className="hidden sm:inline">Admin Panel</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-white/50 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                </nav>

                <div className="flex justify-center">
                  <div className="flex items-center gap-4 bg-gray-50 px-6 py-3 rounded-lg">
                    {isAdminUser ? (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Shield className="w-4 h-4 text-[#094325]" />
                        <div>
                          <div className="font-semibold">{admin.email}</div>
                          <div className="text-xs text-gray-500">Administrator</div>
                        </div>
                      </div>
                    ) : installerProfile && (
                      <>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="w-4 h-4" />
                          <div>
                            <div className="font-semibold">{installerProfile.full_name}</div>
                            <div className="text-xs text-gray-500">{installerProfile.company_name}</div>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-gray-300"></div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calculator className="w-4 h-4 text-[#3B82F6]" />
                          <div>
                            <div className="font-bold text-[#3B82F6]">{installerProfile.quote_count || 0}</div>
                            <div className="text-xs text-gray-500">Quotes</div>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-gray-300"></div>
                        <div className="flex items-center gap-2 text-sm">
                          <FileCheck className="w-4 h-4 text-[#28AA48]" />
                          <div>
                            <div className="font-bold text-[#28AA48]">{installerProfile.application_count || 0}</div>
                            <div className="text-xs text-gray-500">Submitted</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
      )}
      <div className="flex-1">
        {children}
      </div>
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <a
              href="https://greenfunding.com.au"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              <img
                src="/image copy copy.png"
                alt="Green Funding"
                className="h-6 sm:h-8 mb-3"
              />
            </a>
            <p className="text-xs sm:text-sm text-gray-600">
              Green Funding Installer Portal
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
