import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Stepper } from '../components/Stepper';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { calculateAll, calculateProgressPayment, formatCurrency, calculateCostPerKwh, formatCostPerKwh, ProgressPaymentBreakdown } from '../calculator';
import { Calendar, Check, Plus, Trash2, DollarSign } from 'lucide-react';

interface LoanTermOption {
  years: number;
  monthlyPayment: number;
  interestRate: number;
  totalFinanced: number;
  costPerKwh?: number | null;
  progressPaymentBreakdown?: ProgressPaymentBreakdown[];
  monthlyMaintenanceFee?: number;
}

export function Step3() {
  const navigate = useNavigate();
  const { state, updateState, config, assets } = useApp();
  const { user, refreshProfile } = useAuth();
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [termOptions, setTermOptions] = useState<LoanTermOption[]>([]);
  const [showMoreTerms, setShowMoreTerms] = useState(false);
  const [additionalTermOptions, setAdditionalTermOptions] = useState<LoanTermOption[]>([]);
  const [progressPayments, setProgressPayments] = useState<Array<{ percentage: number; daysAfterStart: number }>>(
    state.progressPayments || [
      { percentage: 50, daysAfterStart: 0 },
      { percentage: 25, daysAfterStart: 30 },
      { percentage: 25, daysAfterStart: 60 }
    ]
  );
  const [annualMaintenanceFee, setAnnualMaintenanceFee] = useState<number>(state.annualMaintenanceFee || 0);

  const isSolarOnlyProject = () => {
    if (state.selectedAssetIds.length !== 1) return false;
    const solarAsset = assets.find(asset => asset.name === 'Solar Panels');
    return solarAsset && state.selectedAssetIds.includes(solarAsset.id);
  };

  const showCostPerKwh = isSolarOnlyProject() && state.annualSolarGenerationKwh;

  useEffect(() => {
    if (!config || !state.projectCost || state.selectedAssetIds.length === 0) {
      navigate('/');
      return;
    }

    const selectedAssets = assets.filter(asset =>
      state.selectedAssetIds.includes(asset.id)
    );

    const carAsset = assets.find(asset => asset.name === 'EV');
    const hasCarSelected = carAsset && state.selectedAssetIds.includes(carAsset.id);

    let maxAllowedTerm: number;
    if (hasCarSelected) {
      maxAllowedTerm = 7;
    } else {
      maxAllowedTerm = Math.max(
        ...selectedAssets.map(asset => asset.max_loan_term)
      );
    }

    let terms: number[];
    if (maxAllowedTerm >= 10) {
      terms = [5, 7, 10];
    } else {
      terms = [3, 5, 7];
    }

    const assetRiskAdjustments: Record<string, number> = {};
    assets.forEach(asset => {
      assetRiskAdjustments[asset.id] = asset.risk_adjustment;
    });

    const isProgressPayment = state.calculatorType === 'progress_payment_rental';
    const isServicedRental = state.calculatorType === 'serviced_rental';
    const calculationFunction = isProgressPayment ? calculateProgressPayment : calculateAll;

    const options = terms.map(years => {
      let adjustedProjectCost = state.projectCost;

      if (isServicedRental && state.annualMaintenanceCost) {
        const totalMaintenanceCost = state.annualMaintenanceCost * years;
        adjustedProjectCost = state.projectCost + totalMaintenanceCost;
      }

      const results = calculationFunction(
        {
          projectCost: adjustedProjectCost,
          loanTermYears: years,
          selectedAssetIds: state.selectedAssetIds,
          assetRiskAdjustments,
          residualPercentage: state.residualPercentage,
          paymentTiming: state.paymentTiming,
          progressPayments: isProgressPayment ? progressPayments : undefined,
          annualMaintenanceFee: isProgressPayment ? annualMaintenanceFee : undefined
        },
        config
      );

      const costPerKwh = state.annualSolarGenerationKwh
        ? calculateCostPerKwh(results.monthlyRepayment, state.annualSolarGenerationKwh)
        : null;

      return {
        years,
        monthlyPayment: results.monthlyRepayment,
        interestRate: results.rateUsed,
        totalFinanced: results.baseLoanAmount,
        costPerKwh,
        progressPaymentBreakdown: results.progressPaymentBreakdown,
        monthlyMaintenanceFee: results.monthlyMaintenanceFee
      };
    });

    setTermOptions(options);

    const additionalTerms = [2, 3, 4, 6, 8, 9].filter(year => year <= maxAllowedTerm);

    const additionalOptions = additionalTerms.map(years => {
      let adjustedProjectCost = state.projectCost;

      if (isServicedRental && state.annualMaintenanceCost) {
        const totalMaintenanceCost = state.annualMaintenanceCost * years;
        adjustedProjectCost = state.projectCost + totalMaintenanceCost;
      }

      const results = calculationFunction(
        {
          projectCost: adjustedProjectCost,
          loanTermYears: years,
          selectedAssetIds: state.selectedAssetIds,
          assetRiskAdjustments,
          residualPercentage: state.residualPercentage,
          paymentTiming: state.paymentTiming,
          progressPayments: isProgressPayment ? progressPayments : undefined,
          annualMaintenanceFee: isProgressPayment ? annualMaintenanceFee : undefined
        },
        config
      );

      const costPerKwh = state.annualSolarGenerationKwh
        ? calculateCostPerKwh(results.monthlyRepayment, state.annualSolarGenerationKwh)
        : null;

      return {
        years,
        monthlyPayment: results.monthlyRepayment,
        interestRate: results.rateUsed,
        totalFinanced: results.baseLoanAmount,
        costPerKwh,
        progressPaymentBreakdown: results.progressPaymentBreakdown,
        monthlyMaintenanceFee: results.monthlyMaintenanceFee
      };
    });

    setAdditionalTermOptions(additionalOptions);
  }, [config, state, assets, navigate, progressPayments, annualMaintenanceFee]);

  useEffect(() => {
    const trackQuoteView = async () => {
      if (!user) return;

      const sessionKey = `quote_tracked_${user.id}`;
      const hasTrackedThisSession = sessionStorage.getItem(sessionKey);

      if (hasTrackedThisSession) return;

      try {
        const { error } = await supabase.rpc('increment_quote_count', {
          user_id: user.id
        });

        if (!error) {
          sessionStorage.setItem(sessionKey, 'true');
          refreshProfile();
        }
      } catch (error) {
        console.error('Error tracking quote view:', error);
      }
    };

    trackQuoteView();
  }, [user, refreshProfile]);

  const handleContinue = () => {
    if (selectedTerm === null) {
      alert('Please select a loan term');
      return;
    }

    if (state.calculatorType === 'progress_payment_rental') {
      const totalPercentage = progressPayments.reduce((sum, p) => sum + p.percentage, 0);
      if (totalPercentage !== 100) {
        alert('Progress payments must total 100%');
        return;
      }
    }

    updateState({
      loanTermYears: selectedTerm,
      progressPayments: state.calculatorType === 'progress_payment_rental' ? progressPayments : undefined,
      annualMaintenanceFee: state.calculatorType === 'progress_payment_rental' ? annualMaintenanceFee : undefined
    });

    navigate('/step-4');
  };

  const handleBack = () => {
    navigate('/');
  };

  if (!config || termOptions.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Stepper currentStep={2} />

      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-[#3A475B] mb-2">
              Your Financing Quote
            </h2>
            <p className="text-gray-600 mb-8">
              Choose the loan term that works best for you
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {termOptions.map(option => (
                <button
                  key={option.years}
                  onClick={() => setSelectedTerm(option.years)}
                  className={`
                    relative p-6 rounded-xl border-2 transition-all text-left hover:shadow-lg
                    ${
                      selectedTerm === option.years
                        ? 'border-[#28AA48] bg-[#28AA48]/5 shadow-lg'
                        : 'border-gray-200 hover:border-[#28AA48]/50'
                    }
                  `}
                >
                  {selectedTerm === option.years && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-[#28AA48] rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className={`w-5 h-5 ${selectedTerm === option.years ? 'text-[#28AA48]' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${selectedTerm === option.years ? 'text-[#28AA48]' : 'text-gray-600'}`}>
                      Loan Term
                    </span>
                  </div>

                  <div className="text-4xl font-bold text-[#3A475B] mb-2">
                    {option.years}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    {option.years === 1 ? 'Year' : 'Years'}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Monthly Payment</div>
                    <div className={`text-2xl font-bold ${selectedTerm === option.years ? 'text-[#28AA48]' : 'text-[#3A475B]'}`}>
                      {formatCurrency(option.monthlyPayment, true)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">ex. GST per month</div>
                    <div className="text-sm text-gray-600 mt-2">
                      {formatCurrency(option.monthlyPayment * 1.10, true)} <span className="text-xs">(inc. GST)</span>
                    </div>

                    {showCostPerKwh && option.costPerKwh && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-600 mb-1">Cost per kWh</div>
                        <div className="text-lg font-bold text-[#3A475B]">
                          {formatCostPerKwh(option.costPerKwh)}
                        </div>
                        <div className="text-xs text-gray-500 italic">*equivalent cents per kWh</div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {additionalTermOptions.length > 0 && (
              <div className="mb-8">
                <button
                  onClick={() => setShowMoreTerms(!showMoreTerms)}
                  className="w-full mb-4 px-6 py-3 bg-gray-100 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  {showMoreTerms ? 'Hide' : 'Show'} More Loan Term Options
                  <span className={`transition-transform ${showMoreTerms ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {showMoreTerms && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {additionalTermOptions.map(option => (
                      <button
                        key={option.years}
                        onClick={() => setSelectedTerm(option.years)}
                        className={`
                          relative p-6 rounded-xl border-2 transition-all text-left hover:shadow-lg
                          ${
                            selectedTerm === option.years
                              ? 'border-[#28AA48] bg-[#28AA48]/5 shadow-lg'
                              : 'border-gray-200 hover:border-[#28AA48]/50'
                          }
                        `}
                      >
                        {selectedTerm === option.years && (
                          <div className="absolute top-4 right-4 w-8 h-8 bg-[#28AA48] rounded-full flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                          <Calendar className={`w-5 h-5 ${selectedTerm === option.years ? 'text-[#28AA48]' : 'text-gray-400'}`} />
                          <span className={`text-sm font-medium ${selectedTerm === option.years ? 'text-[#28AA48]' : 'text-gray-600'}`}>
                            Loan Term
                          </span>
                        </div>

                        <div className="text-4xl font-bold text-[#3A475B] mb-2">
                          {option.years}
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          {option.years === 1 ? 'Year' : 'Years'}
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">Monthly Payment</div>
                          <div className={`text-2xl font-bold ${selectedTerm === option.years ? 'text-[#28AA48]' : 'text-[#3A475B]'}`}>
                            {formatCurrency(option.monthlyPayment, true)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">ex. GST per month</div>
                          <div className="text-sm text-gray-600 mt-2">
                            {formatCurrency(option.monthlyPayment * 1.10, true)} <span className="text-xs">(inc. GST)</span>
                          </div>

                          {showCostPerKwh && option.costPerKwh && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="text-xs text-gray-600 mb-1">Cost per kWh</div>
                              <div className="text-lg font-bold text-[#3A475B]">
                                {formatCostPerKwh(option.costPerKwh)}
                              </div>
                              <div className="text-xs text-gray-500 italic">*equivalent cents per kWh</div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showCostPerKwh && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-2">Cost per kWh Calculation Note:</p>
                <p className="text-sm text-blue-900">
                  This calculation shows equivalent cents per kWh for comparison purposes only.
                  Actual billing is based on fixed monthly installments, not per-kWh usage.
                  This metric is provided to help installers communicate value to customers for comparison purposes only based solely on your generation input.
                </p>
              </div>
            )}

            {state.calculatorType === 'progress_payment_rental' && selectedTerm !== null && (
              <div className="mt-6 p-6 bg-blue-50 border-2 border-blue-300 rounded-xl">
                <h3 className="text-xl font-bold text-[#3A475B] mb-4">Progress Payment Breakdown</h3>
                {(() => {
                  const selectedOption = [...termOptions, ...additionalTermOptions].find(opt => opt.years === selectedTerm);
                  if (!selectedOption?.progressPaymentBreakdown) return null;

                  const breakdown = selectedOption.progressPaymentBreakdown;
                  const monthlyLoanPayment = selectedOption.monthlyPayment - (selectedOption.monthlyMaintenanceFee || 0);

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {breakdown.map((payment) => (
                          <div key={payment.drawdownNumber} className="bg-white rounded-lg p-4 border-2 border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-bold text-blue-600">Drawdown {payment.drawdownNumber}</span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {payment.percentage}%
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-semibold text-[#3A475B]">{formatCurrency(payment.amount, true)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Day:</span>
                                <span className="font-semibold text-[#3A475B]">{payment.daysAfterStart}</span>
                              </div>
                              {payment.includesCommission && (
                                <div className="text-xs text-green-600 mt-2 pt-2 border-t border-green-100">
                                  + Full commission (inc. GST)
                                </div>
                              )}
                              <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="text-gray-600">Financed:</span>
                                <span className="font-bold text-[#3A475B]">{formatCurrency(payment.financedAmount, true)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Months:</span>
                                <span className="font-semibold text-[#3A475B]">{payment.monthsRemaining}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t border-blue-200 bg-blue-50 -mx-4 px-4 py-2 mt-2">
                                <span className="text-gray-700 font-medium">Monthly:</span>
                                <span className="font-bold text-[#28AA48]">{formatCurrency(payment.monthlyPayment, true)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Total Amount Financed</div>
                            <div className="text-2xl font-bold text-[#3A475B]">
                              {formatCurrency(selectedOption.totalFinanced, true)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Combined Monthly Payment</div>
                            <div className="text-2xl font-bold text-[#28AA48]">
                              {formatCurrency(monthlyLoanPayment, true)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Sum of all drawdowns</div>
                          </div>
                          {selectedOption.monthlyMaintenanceFee && selectedOption.monthlyMaintenanceFee > 0 && (
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Monthly Maintenance</div>
                              <div className="text-2xl font-bold text-[#3A475B]">
                                {formatCurrency(selectedOption.monthlyMaintenanceFee, true)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Added to payment</div>
                            </div>
                          )}
                        </div>
                        {selectedOption.monthlyMaintenanceFee && selectedOption.monthlyMaintenanceFee > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-semibold text-gray-700">Total Monthly Payment:</span>
                              <span className="text-3xl font-bold text-[#28AA48]">
                                {formatCurrency(selectedOption.monthlyPayment, true)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {state.calculatorType === 'progress_payment_rental' && (
              <div className="mt-6 p-6 bg-gray-50 border-2 border-gray-300 rounded-xl">
                <h3 className="text-xl font-bold text-[#3A475B] mb-4">Progress Payment Schedule</h3>

                <div className="space-y-3 mb-4">
                  {progressPayments.map((payment, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 bg-white rounded-lg border border-gray-200">
                      <div className="col-span-1 text-center font-bold text-[#3A475B]">
                        {index + 1}
                      </div>
                      <div className="col-span-4">
                        <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                          Percentage
                        </label>
                        <input
                          type="number"
                          value={payment.percentage}
                          onChange={(e) => {
                            const updated = [...progressPayments];
                            updated[index].percentage = Number(e.target.value);
                            setProgressPayments(updated);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="col-span-5">
                        <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                          Days After Start
                        </label>
                        <input
                          type="number"
                          value={payment.daysAfterStart}
                          onChange={(e) => {
                            const updated = [...progressPayments];
                            updated[index].daysAfterStart = Number(e.target.value);
                            setProgressPayments(updated);
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
                          min="0"
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <button
                          onClick={() => {
                            if (progressPayments.length > 1) {
                              setProgressPayments(progressPayments.filter((_, i) => i !== index));
                            }
                          }}
                          disabled={progressPayments.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div className={`text-sm font-semibold ${progressPayments.reduce((sum, p) => sum + p.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {progressPayments.reduce((sum, p) => sum + p.percentage, 0)}%
                    {progressPayments.reduce((sum, p) => sum + p.percentage, 0) !== 100 && ' (must equal 100%)'}
                  </div>
                  <button
                    onClick={() => {
                      const lastPayment = progressPayments[progressPayments.length - 1];
                      const newDays = lastPayment ? lastPayment.daysAfterStart + 30 : 0;
                      setProgressPayments([...progressPayments, { percentage: 0, daysAfterStart: newDays }]);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#28AA48] text-white rounded-lg hover:bg-[#229639] transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-300">
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Annual Maintenance Fee (Optional)
                  </label>
                  <div className="relative max-w-xs">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={annualMaintenanceFee}
                      onChange={(e) => setAnnualMaintenanceFee(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#28AA48] focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This will be divided by 12 and added to the monthly payment
                  </p>
                </div>
              </div>
            )}

            {config.disclaimerText && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-900">{config.disclaimerText}</p>
              </div>
            )}

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 font-semibold mb-2">Next Steps:</p>
              <p className="text-sm text-green-900">
                Intro Green Funding via email{' '}
                <a href="mailto:solutions@greenfunding.com.au" className="text-[#28AA48] hover:underline font-medium">
                  solutions@greenfunding.com.au
                </a>
                {' '}or Continue to Application
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={handleBack}
                className="px-6 sm:px-8 py-3 sm:py-3.5 bg-gray-100 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-200 transition-colors touch-manipulation order-2 sm:order-1"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={selectedTerm === null}
                className="px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-base sm:text-lg touch-manipulation order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
