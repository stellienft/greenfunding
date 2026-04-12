import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { Stepper } from '../components/Stepper';
import { useApp } from '../context/AppContext';
import { useCalculatorLayout } from '../context/CalculatorLayoutContext';
import * as Icons from 'lucide-react';
import { formatCurrency } from '../calculator';
import { X } from 'lucide-react';

export function Step1() {
  const navigate = useNavigate();
  const { isAdminMode, onAdminNavigate } = useCalculatorLayout();
  const { state, updateState, resetState, config, assets, loadingConfig } = useApp();
  const [selectedAssets, setSelectedAssets] = useState<string[]>(state.selectedAssetIds);
  const [projectCost, setProjectCost] = useState(state.projectCost || 100000);
  const [inputValue, setInputValue] = useState('');
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [annualSolarGeneration, setAnnualSolarGeneration] = useState<number | undefined>(state.annualSolarGenerationKwh);
  const [currentElectricityBill, setCurrentElectricityBill] = useState<number | undefined>(state.currentElectricityBill);
  const [anticipatedElectricityBillWithSolar, setAnticipatedElectricityBillWithSolar] = useState<number | undefined>(state.anticipatedElectricityBillWithSolar);
  const [showSpecialPricingModal, setShowSpecialPricingModal] = useState(false);
  const [specialPricingRequested, setSpecialPricingRequested] = useState(state.specialPricingRequested || false);
  const [hasShownModal, setHasShownModal] = useState(false);
  const [residualPercentage, setResidualPercentage] = useState<number | undefined>(state.residualPercentage);
  const [paymentTiming, setPaymentTiming] = useState<'advance' | 'arrears'>(state.paymentTiming || 'arrears');
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  useEffect(() => {
    if (config && !state.projectCost) {
      setProjectCost(config.costSliderDefault || 100000);
    }
  }, [config]);

  useEffect(() => {
    if (projectCost > 1000000 && !hasShownModal) {
      setShowSpecialPricingModal(true);
      setHasShownModal(true);
    }
  }, [projectCost, hasShownModal]);

  const isSolarOnlyProject = () => {
    if (selectedAssets.length !== 1) return false;
    const solarAsset = assets.find(asset => asset.name === 'Solar System');
    return solarAsset && selectedAssets.includes(solarAsset.id);
  };

  const hasEnergyGenerationAsset = () => {
    const solarAsset = assets.find(asset => asset.name === 'Solar System');
    const wasteToEnergyAsset = assets.find(asset => asset.name === 'Waste to Energy');
    return (solarAsset && selectedAssets.includes(solarAsset.id)) ||
           (wasteToEnergyAsset && selectedAssets.includes(wasteToEnergyAsset.id));
  };

  const isCarOnlyProject = () => {
    if (selectedAssets.length !== 1) return false;
    const carAsset = assets.find(asset => asset.name === 'EV');
    return carAsset && selectedAssets.includes(carAsset.id);
  };

  const hasCarSelected = () => {
    const carAsset = assets.find(asset => asset.name === 'EV');
    return carAsset && selectedAssets.includes(carAsset.id);
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const carAsset = assets.find(asset => asset.name === 'EV');
      const clickedAsset = assets.find(asset => asset.id === assetId);

      const isCarAsset = carAsset && assetId === carAsset.id;
      const hasCarInSelection = carAsset && prev.includes(carAsset.id);

      if (isCarAsset && prev.includes(assetId)) {
        setResidualPercentage(undefined);
        return prev.filter(id => id !== assetId);
      }

      if (isCarAsset) {
        setResidualPercentage(0);
        return [assetId];
      }

      if (hasCarInSelection) {
        return prev;
      }

      const newSelection = prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId];

      const solarAsset = assets.find(asset => asset.name === 'Solar System');
      const wasteToEnergyAsset = assets.find(asset => asset.name === 'Waste to Energy');
      const hasEnergyAsset = (solarAsset && newSelection.includes(solarAsset.id)) ||
                             (wasteToEnergyAsset && newSelection.includes(wasteToEnergyAsset.id));

      if (!hasEnergyAsset) {
        setAnnualSolarGeneration(undefined);
        setCurrentElectricityBill(undefined);
        setAnticipatedElectricityBillWithSolar(undefined);
      }

      return newSelection;
    });
  };

  const handleContinue = () => {
    if (selectedAssets.length === 0) {
      alert('Please select at least one asset type');
      return;
    }

    updateState({
      projectCost,
      selectedAssetIds: selectedAssets,
      annualSolarGenerationKwh: hasEnergyGenerationAsset() ? annualSolarGeneration : undefined,
      currentElectricityBill: hasEnergyGenerationAsset() ? currentElectricityBill : undefined,
      anticipatedElectricityBillWithSolar: hasEnergyGenerationAsset() ? anticipatedElectricityBillWithSolar : undefined,
      specialPricingRequested,
      residualPercentage: isCarOnlyProject() ? residualPercentage : undefined,
      paymentTiming,
    });

    const dest = isAdminMode ? '/admin/step-3' : '/step-3';
    if (isAdminMode && onAdminNavigate) onAdminNavigate(dest); else navigate(dest);
    window.scrollTo(0, 0);
  };

  const hasStarted = selectedAssets.length > 0 || projectCost !== (config?.costSliderDefault || 100000);

  const handleRestartClick = () => {
    if (hasStarted) {
      setShowRestartConfirm(true);
    } else {
      doRestart();
    }
  };

  const doRestart = () => {
    resetState();
    setSelectedAssets([]);
    setProjectCost(config?.costSliderDefault || 100000);
    setInputValue('');
    setAnnualSolarGeneration(undefined);
    setCurrentElectricityBill(undefined);
    setAnticipatedElectricityBillWithSolar(undefined);
    setSpecialPricingRequested(false);
    setResidualPercentage(undefined);
    setPaymentTiming('arrears');
    setShowRestartConfirm(false);
  };

  const handleModalClose = () => {
    setShowSpecialPricingModal(false);
  };

  const handleModalContinue = () => {
    if (specialPricingRequested) {
      if (selectedAssets.length === 0) {
        alert('Please select at least one asset type before continuing');
        setShowSpecialPricingModal(false);
        return;
      }

      updateState({
        projectCost,
        selectedAssetIds: selectedAssets,
        annualSolarGenerationKwh: hasEnergyGenerationAsset() ? annualSolarGeneration : undefined,
        specialPricingRequested: true,
        loanTermYears: 7
      });

      const dest2 = isAdminMode ? '/admin/step-3' : '/step-4';
      if (isAdminMode && onAdminNavigate) onAdminNavigate(dest2); else navigate(dest2);
      window.scrollTo(0, 0);
    } else {
      setShowSpecialPricingModal(false);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.Package;
    return Icon;
  };

  if (loadingConfig || !config) {
    return (
      <InstallerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Loading...</div>
        </div>
      </InstallerLayout>
    );
  }

  const minCost = config.costSliderMin || 10000;
  const maxCost = config.costSliderMax || 5000000;
  const step = config.costSliderStep || 5000;

  return (
    <InstallerLayout>
      <Stepper currentStep={1} />

      <div className="container mx-auto px-4 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-[#3A475B] mb-2">
              Tell us about your project
            </h2>
            <p className="text-gray-600 mb-4">
              Select the equipment you need and your estimated project cost
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-[#3A475B] mb-3">
                  What equipment do you need?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assets.map(asset => {
                    const Icon = getIcon(asset.icon);
                    const isSelected = selectedAssets.includes(asset.id);

                    return (
                      <button
                        key={asset.id}
                        onClick={() => toggleAsset(asset.id)}
                        className={`
                          p-4 rounded-xl border-2 transition-all text-left touch-manipulation
                          ${
                            isSelected
                              ? 'border-[#28AA48] bg-[#28AA48]/5 shadow-md'
                              : 'border-gray-200 hover:border-[#28AA48]/50 hover:shadow-md'
                          }
                        `}
                      >
                        <Icon
                          className={`
                            w-6 h-6 mb-2
                            ${isSelected ? 'text-[#28AA48]' : 'text-gray-400'}
                          `}
                        />
                        <h3 className="font-semibold text-[#3A475B] mb-1 text-sm sm:text-base">
                          {asset.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">{asset.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-[#3A475B] mb-3">
                  Payment Timing
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Choose when your first payment is due. Advance means your first payment is due at settlement, while Arrears means your first payment is due in 1 month.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentTiming('advance')}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-center touch-manipulation
                      ${
                        paymentTiming === 'advance'
                          ? 'border-[#28AA48] bg-[#28AA48]/5 shadow-md'
                          : 'border-gray-200 hover:border-[#28AA48]/50 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="font-semibold text-[#3A475B] mb-1">Advance</div>
                    <div className="text-xs text-gray-600">First payment at settlement</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentTiming('arrears')}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-center touch-manipulation
                      ${
                        paymentTiming === 'arrears'
                          ? 'border-[#28AA48] bg-[#28AA48]/5 shadow-md'
                          : 'border-gray-200 hover:border-[#28AA48]/50 hover:shadow-md'
                      }
                    `}
                  >
                    <div className="font-semibold text-[#3A475B] mb-1">Arrears</div>
                    <div className="text-xs text-gray-600">First payment after one month</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-base font-semibold text-[#3A475B] mb-3">
                  Invoice Amount (inc. GST)
                </label>

                <div className="bg-[#34AC48] rounded-2xl p-4 mb-4 text-center">
                  <div className="text-white text-4xl font-bold mb-1">
                    {formatCurrency(projectCost)}
                  </div>
                  <div className="text-white/90 text-xs font-medium">
                    Total Invoice Amount
                  </div>
                </div>

                <div className="mb-4">
                  <input
                    type="range"
                    value={projectCost}
                    onChange={e => setProjectCost(Number(e.target.value))}
                    min={minCost}
                    max={maxCost}
                    step={step}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>{formatCurrency(minCost)}</span>
                    <span>{config.costSliderMaxLabel || formatCurrency(maxCost)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Or enter amount: $</span>
                  <input
                    type="text"
                    value={isEditingInput ? inputValue : projectCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    onFocus={() => {
                      setIsEditingInput(true);
                      setInputValue(projectCost.toString());
                    }}
                    onChange={e => {
                      setInputValue(e.target.value);
                    }}
                    onBlur={() => {
                      const value = inputValue.replace(/,/g, '');
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setProjectCost(Math.round(numValue * 100) / 100);
                      }
                      setIsEditingInput(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-right font-semibold"
                  />
                </div>
              </div>

              {hasEnergyGenerationAsset() && (
                <div>
                  <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                    Annual Solar Generation <span className="text-sm font-normal text-gray-500">(Optional)</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the expected annual solar generation in kWh to calculate an equivalent cost per kWh for comparison purposes.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={annualSolarGeneration ? annualSolarGeneration.toLocaleString('en-US') : ''}
                      onChange={e => {
                        const value = e.target.value.replace(/,/g, '');
                        const numValue = Number(value);
                        if (value === '') {
                          setAnnualSolarGeneration(undefined);
                        } else if (!isNaN(numValue)) {
                          setAnnualSolarGeneration(numValue);
                        }
                      }}
                      placeholder="e.g., 204,000"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-right font-semibold text-lg"
                    />
                    <span className="text-sm text-gray-600 font-medium">kWh/year</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                  Current Electricity Bill <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the client's current annual electricity bill. This will increase 3% each year over the 25-year savings projection.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">$</span>
                  <input
                    type="text"
                    value={currentElectricityBill ? currentElectricityBill.toLocaleString('en-US') : ''}
                    onChange={e => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = Number(value);
                      if (value === '') {
                        setCurrentElectricityBill(undefined);
                      } else if (!isNaN(numValue) && numValue >= 0) {
                        setCurrentElectricityBill(numValue);
                      }
                    }}
                    placeholder="e.g., 20,000"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-right font-semibold text-lg"
                  />
                  <span className="text-sm text-gray-600 font-medium">per year</span>
                </div>
              </div>

              <div>
                <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                  Anticipated Electricity Bill with Solar <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the anticipated annual electricity bill after solar is installed. This will also increase 3% each year over the 25-year projection.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">$</span>
                  <input
                    type="text"
                    value={anticipatedElectricityBillWithSolar ? anticipatedElectricityBillWithSolar.toLocaleString('en-US') : ''}
                    onChange={e => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = Number(value);
                      if (value === '') {
                        setAnticipatedElectricityBillWithSolar(undefined);
                      } else if (!isNaN(numValue) && numValue >= 0) {
                        setAnticipatedElectricityBillWithSolar(numValue);
                      }
                    }}
                    placeholder="e.g., 1,200"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-right font-semibold text-lg"
                  />
                  <span className="text-sm text-gray-600 font-medium">per year</span>
                </div>
              </div>

              {isCarOnlyProject() && (
                <div>
                  <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                    Balloon/Residual Percentage <span className="text-sm font-normal text-gray-500">(Optional, Max 30%)</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the residual percentage for the vehicle. The residual amount will be paid at the end of the loan term.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={residualPercentage !== undefined ? residualPercentage : ''}
                      onChange={e => {
                        const value = e.target.value;
                        if (value === '') {
                          setResidualPercentage(0);
                        } else {
                          const numValue = Number(value);
                          if (!isNaN(numValue) && numValue >= 0 && numValue <= 30) {
                            setResidualPercentage(numValue);
                          }
                        }
                      }}
                      placeholder="0"
                      min="0"
                      max="30"
                      step="1"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-right font-semibold text-lg"
                    />
                    <span className="text-sm text-gray-600 font-medium">%</span>
                  </div>
                  {residualPercentage !== undefined && residualPercentage > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>Residual Amount:</strong> {formatCurrency(projectCost * (residualPercentage / 100))}
                        <br />
                        <strong>Amount to Finance:</strong> {formatCurrency(projectCost * (1 - residualPercentage / 100))}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center gap-3">
              <button
                onClick={handleRestartClick}
                className="px-5 py-3 text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-gray-200 hover:border-red-200"
              >
                Restart Proposal
              </button>
              <button
                onClick={handleContinue}
                className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-base sm:text-lg touch-manipulation"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 28px;
          height: 28px;
          background: #28AA48;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: #28AA48;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <h3 className="text-lg font-bold text-[#3A475B] mb-2">Restart Proposal?</h3>
            <p className="text-gray-500 text-sm mb-6">
              You have already started a proposal. Restarting will clear all your current selections and start fresh.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doRestart}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Yes, Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {showSpecialPricingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold text-[#3A475B] mb-4">
              Special Pricing Available
            </h3>
            <p className="text-gray-600 mb-6">
              For funding over $1,000,000, we offer customized pricing tailored to your specific needs.
              Our team will get back to you within 24-48 hours with a personalized quote.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={specialPricingRequested}
                  onChange={(e) => setSpecialPricingRequested(e.target.checked)}
                  className="mt-1 w-5 h-5 text-[#28AA48] rounded border-gray-300 focus:ring-[#28AA48] touch-manipulation"
                />
                <span className="text-sm text-[#3A475B]">
                  Yes, I'm interested in special pricing for deals over $1,000,000.
                  Please contact me within 24-48 hours.
                </span>
              </label>
            </div>

            <button
              onClick={handleModalContinue}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </InstallerLayout>
  );
}
