import { Calculator, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const CALCULATORS = [
  {
    id: 'rental' as const,
    title: 'Rental',
    description: 'Calculate financing options for a range of different renewable services.',
    icon: Calculator,
    path: '/calculator/step1',
  },
  {
    id: 'serviced_rental' as const,
    title: 'Serviced Rental',
    description: 'Includes full service and maintenance packages with your rental agreement.',
    icon: TrendingUp,
    path: '/calculator/serviced-rental-step1',
  },
  {
    id: 'progress_payment_rental' as const,
    title: 'Progress Payment Rental',
    description: 'Flexible payment structure tied to project milestones and completion stages.',
    icon: Users,
    path: '/calculator/step1',
  },
];

export function AdminCalculatorPicker() {
  const navigate = useNavigate();
  const { updateState, resetState } = useApp();

  const handleOpen = (id: typeof CALCULATORS[number]['id'], path: string) => {
    resetState();
    updateState({ calculatorType: id });
    navigate(path);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-[#3A475B] mb-1">Calculator</h1>
        <p className="text-gray-500 text-sm">Run any calculator to test calculations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CALCULATORS.map((calc) => {
          const Icon = calc.icon;
          return (
            <div
              key={calc.id}
              className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 hover:border-[#6EAE3C] hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleOpen(calc.id, calc.path)}
            >
              <div className="p-7">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F]">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#3A475B] mb-2">{calc.title}</h3>
                <p className="text-gray-500 text-sm mb-6 min-h-[44px]">{calc.description}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpen(calc.id, calc.path); }}
                  className="w-full bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold py-2.5 px-5 rounded-lg hover:shadow-md transition-all text-sm"
                >
                  Open Calculator
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
