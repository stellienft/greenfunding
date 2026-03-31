import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, TrendingUp, Users } from 'lucide-react';
import { Layout } from '../components/Layout';
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

  const calculators = [
    {
      id: 'rental',
      title: 'Rental',
      description: 'Calculate financing options for a range of different renewable services.',
      icon: Calculator,
      available: calculatorStates.rental && isAllowed('rental'),
      calcType: 'rental' as const,
      path: '/calculator/step1'
    },
    {
      id: 'serviced_rental',
      title: 'Serviced Rental',
      description: 'Includes full service and maintenance packages with your rental agreement.',
      icon: TrendingUp,
      available: calculatorStates.serviced_rental && isAllowed('serviced_rental'),
      calcType: 'serviced_rental' as const,
      path: '/calculator/serviced-rental-step1'
    },
    {
      id: 'progress_payment_rental',
      title: 'Progress Payment Rental',
      description: 'Flexible payment structure tied to project milestones and completion stages.',
      icon: Users,
      available: calculatorStates.progress_payment_rental && isAllowed('progress_payment_rental'),
      calcType: 'progress_payment_rental' as const,
      path: '/calculator/step1'
    }
  ].filter(c => isAllowed(c.id));

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-[#3A475B] mb-4">
              Select a Calculator
            </h1>
            <p className="text-gray-600 text-lg">
              Choose the financing calculator that best suits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {calculators.map((calc) => {
              const Icon = calc.icon;
              return (
                <div
                  key={calc.id}
                  className={`bg-white rounded-2xl shadow-lg border-2 transition-all ${
                    calc.available
                      ? 'border-gray-200 hover:border-[#6EAE3C] hover:shadow-xl cursor-pointer'
                      : 'border-gray-100 opacity-75'
                  }`}
                >
                  <div className="p-8">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                        calc.available
                          ? 'bg-gradient-to-br from-[#6EAE3C] to-[#8BC83F]'
                          : 'bg-gray-300'
                      }`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-xl font-bold text-[#3A475B] text-center mb-3">
                      {calc.title}
                    </h3>

                    <p className="text-gray-600 text-center mb-6 min-h-[48px]">
                      {calc.description}
                    </p>

                    {calc.available ? (
                      <button
                        onClick={() => handleCalculatorClick(calc.calcType, calc.path)}
                        className="w-full bg-gradient-to-r from-[#6EAE3C] to-[#8BC83F] text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all"
                      >
                        Open Calculator
                      </button>
                    ) : (
                      <div className="text-center">
                        <span className="inline-block bg-gray-100 text-gray-500 font-semibold py-3 px-6 rounded-lg">
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
      </div>
    </Layout>
  );
}
