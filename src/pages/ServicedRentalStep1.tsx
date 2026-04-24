import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstallerLayout } from '../components/InstallerLayout';
import { Stepper } from '../components/Stepper';
import { useApp } from '../context/AppContext';
import { useCalculatorLayout } from '../context/CalculatorLayoutContext';
import * as Icons from 'lucide-react';
import { formatCurrency } from '../calculator';
import { X } from 'lucide-react';

export function ServicedRentalStep1() {
  const navigate = useNavigate();
  const { isAdminMode, onAdminNavigate } = useCalculatorLayout();
  const { state, updateState, resetState, config, assets, loadingConfig } = useApp();
  const [selectedAssets, setSelectedAssets] = useState<string[]>(state.selectedAssetIds);
  const [projectCost, setProjectCost] = useState(state.projectCost || 100000);
  const [inputValue, setInputValue] = useState('');
  const [isEditingInput, setIsEditingInput] = useState(false);
  const [annualSolarGeneration, setAnnualSolarGeneration] = useState<number | undefined>(state.annualSolarGenerationKwh);
  const [annualMaintenanceCost, setAnnualMaintenanceCost] = useState<number>(state.annualMaintenanceCost || 0);
  const [maintenanceInputValue, setMaintenanceInputValue] = useState('');
  const [isEditingMaintenanceInput, setIsEditingMaintenanceInput] = useState(false);
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
    const carAsset = assets.find(asset => asset.name === 'Electric Vehicles');
    return carAsset && selectedAssets.includes(carAsset.id);
  };

  const hasCarSelected = () => {
    const carAsset = assets.find(asset => asset.name === 'Electric Vehicles');
    return carAsset && selectedAssets.includes(carAsset.id);
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const carAsset = assets.find(asset => asset.name === 'Electric Vehicles');
      const clickedAsset = assets.find(asset => asset.id === assetId);

      const isCarAsset = carAsset && assetId === carAsset.id;
      const hasCarInSelection = carAsset && prev.includes(carAsset.id);

      if (isCarAsset && prev.includes(assetId)) {
        setResidualPercentage(undefined);
        return prev.filter(id => id !== assetId);
      }

      if (isCarAsset) {
        setResidualPercentage(30);
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
      }

      return newSelection;
    });
  };

  const handleContinue = () => {
    if (selectedAssets.length === 0) {
      alert('Please select at least one asset type');
      return;
    }

    if (annualMaintenanceCost <= 0) {
      alert('Please enter an annual maintenance cost');
      return;
    }

    updateState({
      projectCost,
      selectedAssetIds: selectedAssets,
      annualSolarGenerationKwh: hasEnergyGenerationAsset() ? annualSolarGeneration : undefined,
      specialPricingRequested,
      residualPercentage: isCarOnlyProject() ? residualPercentage : undefined,
      paymentTiming,
      annualMaintenanceCost,
      calculatorType: 'serviced_rental'
    });

    const dest = isAdminMode ? '/admin/step-3' : '/step-3';
    if (isAdminMode && onAdminNavigate) onAdminNavigate(dest); else navigate(dest);
  };

  const hasStarted = selectedAssets.length > 0 || projectCost !== (config?.costSliderDefault || 100000) || annualMaintenanceCost > 0;

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
    setAnnualMaintenanceCost(0);
    setAnnualSolarGeneration(undefined);
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

      if (annualMaintenanceCost <= 0) {
        alert('Please enter an annual maintenance cost before continuing');
        setShowSpecialPricingModal(false);
        return;
      }

      updateState({
        projectCost,
        selectedAssetIds: selectedAssets,
        annualSolarGenerationKwh: hasEnergyGenerationAsset() ? annualSolarGeneration : undefined,
        specialPricingRequested: true,
        loanTermYears: 7,
        annualMaintenanceCost,
        calculatorType: 'serviced_rental'
      });

      const dest2 = isAdminMode ? '/admin/step-3' : '/step-4';
      if (isAdminMode && onAdminNavigate) onAdminNavigate(dest2); else navigate(dest2);
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
              Tell us about your serviced rental project
            </h2>
            <p className="text-gray-600 mb-4">
              Select the equipment you need, your estimated project cost, and annual maintenance requirements
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
                    <div className="text-xs text-gray-600">First payment in 1 month</div>
                  </button>
                </div>
              </div>

              {isCarOnlyProject() && (
                <div>
                  <label className="block text-base font-semibold text-[#3A475B] mb-3">
                    Residual Value
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Specify the percentage of the car's value that will remain at the end of the lease term (0-100%).
                  </p>
                  <div className="mb-4">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={residualPercentage ?? 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (value >= 0 && value <= 100) {
                          setResidualPercentage(value);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={residualPercentage ?? 0}
                    onChange={(e) => setResidualPercentage(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#28AA48]"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-base font-semibold text-[#3A475B] mb-3">
                  What is your estimated project cost?
                </label>
                <div className="mb-4">
                  <input
                    type="text"
                    value={isEditingInput ? inputValue : formatCurrency(projectCost, true)}
                    onFocus={() => {
                      setIsEditingInput(true);
                      setInputValue(projectCost.toString());
                    }}
                    onBlur={() => {
                      setIsEditingInput(false);
                      const numValue = parseFloat(inputValue.replace(/[^0-9.]/g, ''));
                      if (!isNaN(numValue)) {
                        const clampedValue = Math.max(minCost, Math.min(maxCost, numValue));
                        setProjectCost(clampedValue);
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setInputValue(value);
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setProjectCost(Math.max(minCost, Math.min(maxCost, numValue)));
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]"
                  />
                </div>
                <input
                  type="range"
                  min={minCost}
                  max={maxCost}
                  step={step}
                  value={projectCost}
                  onChange={(e) => setProjectCost(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#28AA48]"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>{formatCurrency(minCost, true)}</span>
                  <span>{formatCurrency(maxCost, true)}</span>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <label className="block text-base font-semibold text-[#3A475B] mb-3">
                  Annual Maintenance Cost
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the annual cost for maintenance services. This will be included in the monthly amount paid by the client and paid to you monthly as the services are being provided. If the services cease or the client seeks those services elsewhere this amount will be redirected.
                </p>
                <div className="mb-4">
                  <input
                    type="text"
                    value={isEditingMaintenanceInput ? maintenanceInputValue : formatCurrency(annualMaintenanceCost, true)}
                    onFocus={() => {
                      setIsEditingMaintenanceInput(true);
                      setMaintenanceInputValue(annualMaintenanceCost.toString());
                    }}
                    onBlur={() => {
                      setIsEditingMaintenanceInput(false);
                      const numValue = parseFloat(maintenanceInputValue.replace(/[^0-9.]/g, ''));
                      if (!isNaN(numValue) && numValue >= 0) {
                        setAnnualMaintenanceCost(numValue);
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setMaintenanceInputValue(value);
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setAnnualMaintenanceCost(numValue);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]"
                    placeholder="$0"
                  />
                </div>
              </div>

              {hasEnergyGenerationAsset() && (
                <div>
                  <label className="block text-base font-semibold text-[#3A475B] mb-3">
                    Annual Energy Generation (kWh)
                    <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the expected annual energy generation in kilowatt-hours. This will be shown on your quote.
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={annualSolarGeneration ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setAnnualSolarGeneration(undefined);
                      } else {
                        const numValue = parseFloat(value);
                        if (numValue >= 0) {
                          setAnnualSolarGeneration(numValue);
                        }
                      }
                    }}
                    placeholder="e.g., 50000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#28AA48]"
                  />
                </div>
              )}

              <div className="flex justify-between items-center gap-3">
                <button
                  onClick={handleRestartClick}
                  className="px-5 py-3 text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-gray-200 hover:border-red-200"
                >
                  Restart Proposal
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 py-4 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg text-lg"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative">
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold text-[#3A475B] mb-4">
              Special Pricing Available
            </h3>
            <p className="text-gray-600 mb-6">
              For projects over $1,000,000, we offer customized pricing with a 7-year term. Would you like to proceed with special pricing or continue with the standard options?
            </p>

            <div className="flex items-center gap-2 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <input
                type="checkbox"
                id="specialPricingCheckbox"
                checked={specialPricingRequested}
                onChange={(e) => setSpecialPricingRequested(e.target.checked)}
                className="w-5 h-5 text-[#28AA48] rounded"
              />
              <label htmlFor="specialPricingCheckbox" className="text-[#3A475B] font-semibold">
                Yes, I want special pricing for this project
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleModalClose}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
              >
                Continue with Standard
              </button>
              <button
                onClick={handleModalContinue}
                disabled={!specialPricingRequested}
                className="flex-1 py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </InstallerLayout>
  );
}
