import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, Users } from 'lucide-react';
import { InstallerLayout } from '../components/InstallerLayout';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export function CalculatorDashboard() {
  const navigate = useNavigate();
  const { updateState, resetState } = useApp();
  const { installerProfile } = useAuth();
  const [calculatorStates, setCalculatorStates] = useState<Record<string, boolean>>({
    rental: true,
    serviced_rental: false,
    progress_payment_rental: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalculatorStates();
  }, []);

  const loadCalculatorStates = async () => {
    try {
      const { data, error } = await supabase
        .from('calculator_config')
        .select('calculator_type, enabled');

      if (error) throw error;

      if (data) {
        const states: Record<string, boolean> = {};
        data.forEach(row => {
          states[row.calculator_type] = row.enabled || false;
        });
        setCalculatorStates(states);
      }
    } catch (error) {
      console.error('Error loading calculator states:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatorClick = (calcType: 'rental' | 'progress_payment_rental' | 'serviced_rental', path: string) => {
    resetState();
    updateState({ calculatorType: calcType });
    navigate(path);
  };

  const allowedCalcs = installerProfile?.allowed_calculators;

  const isAllowed = (key: string) =>
    !allowedCalcs || allowedCalcs.length === 0 || allowedCalcs.includes(key);

  const allCalcDefs = [
    {
      id: 'rental',
      title: 'Rental',
      description: 'Calculate financing options for a range of different renewable services.',
      icon: Calculator,
      calcType: 'rental' as const,
      path: '/calculator/step1'
    },
    {
      id: 'serviced_rental',
      title: 'Serviced Rental',
      description: 'Includes full service and maintenance packages with your rental agreement.',
      icon: TrendingUp,
      calcType: 'serviced_rental' as const,
      path: '/calculator/serviced-rental-step1'
    },
    {
      id: 'progress_payment_rental',
      title: 'Progress Payment Rental',
      description: 'Flexible payment structure tied to project milestones and completion stages.',
      icon: Users,
      calcType: 'progress_payment_rental' as const,
      path: '/calculator/step1'
    }
  ];

  const calculators = allCalcDefs
    .filter(c => isAllowed(c.id))
    .map(c => ({ ...c, available: calculatorStates[c.id] ?? false }));

  useEffect(() => {
    if (!loading && calculators.length === 1 && calculators[0].available) {
      handleCalculatorClick(calculators[0].calcType, calculators[0].path);
    }
  }, [loading]);

  if (loading) {
    return (
      <InstallerLayout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>
      </InstallerLayout>
    );
  }

  if (calculators.length === 1 && calculators[0].available) {
    return null;
  }

  return (
    <InstallerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#3A475B] mb-1">Calculator</h1>
          <p className="text-gray-500 text-sm">Choose the financing calculator that best suits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {calculators.map((calc) => {
            const Icon = calc.icon;
            return (
              <div
                key={calc.id}
                className={`bg-white rounded-2xl shadow-sm border-2 transition-all ${
                  calc.available
                    ? 'border-gray-200 hover:border-[#6EAE3C] hover:shadow-md cursor-pointer'
                    : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="p-7">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${
                      calc.available
                        ? 'bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F]'
                        : 'bg-gray-200'
                    }`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-lg font-bold text-[#3A475B] mb-2">{calc.title}</h3>

                  <p className="text-gray-500 text-sm mb-6 min-h-[44px]">{calc.description}</p>

                  {calc.available ? (
                    <button
                      onClick={() => handleCalculatorClick(calc.calcType, calc.path)}
                      className="w-full bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold py-2.5 px-5 rounded-lg hover:shadow-md transition-all text-sm"
                    >
                      Open Calculator
                    </button>
                  ) : (
                    <div className="text-center">
                      <span className="inline-block bg-gray-100 text-gray-400 font-semibold py-2.5 px-5 rounded-lg text-sm">
                        Coming Soon
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </InstallerLayout>
  );
}
