import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AdminCalculatorLayoutProps {
  children: ReactNode;
}

export function AdminCalculatorLayout({ children }: AdminCalculatorLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
        <button
          onClick={() => navigate('/admin?tab=calculator')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#4d8a25] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <img src="/image.png" alt="Green Funding" className="h-8" />
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
