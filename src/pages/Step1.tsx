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
  const [currentElectricityBill, setCurrentElectricityBill] = useState<number | undefined>(state.currentElectricityBill !== undefined ? state.currentElectricityBill / 12 : undefined);
  const [anticipatedElectricityBillWithSolar, setAnticipatedElectricityBillWithSolar] = useState<number | undefined>(state.anticipatedElectricityBillWithSolar !== undefined ? state.anticipatedElectricityBillWithSolar / 12 : undefined);
  const [systemSize, setSystemSize] = useState<string>(state.systemSize || '');
  const [showSpecialPricingModal, setShowSpecialPricingModal] = useState(false);
  const [specialPricingRequested, setSpecialPricingRequested] = useState(state.specialPricingRequested || false);
  const [hasShownModal, setHasShownModal] = useState(false);
  const [gstConfirmed, setGstConfirmed] = useState(false);
  const [residualPercentage, setResidualPercentage] = useState<number | undefined>(state.residualPercentage);
  const [paymentTiming, setPaymentTiming] = useState<'advance' | 'arrears'>(state.paymentTiming || 'arrears');
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [gstMode, setGstMode] = useState<'inc' | 'ex'>('inc');

  useEffect(() => {
    if (config && !state.projectCost) {
      setProjectCost(config.costSliderDefault || 100000);
    }
  }, [config]);


  const isSolarOnlyProject = () => {
    if (selectedAssets.length !== 1) return false;
    const solarAsset = assets.find(asset => asset.name === 'Solar System');
    return solarAsset && selectedAssets.includes(solarAsset.id);
  };

  const SAVINGS_ASSET_NAMES = ['Solar System', 'Microgrid', 'Decarbonising Technologies', 'Building Upgrade'];

  const hasEnergyGenerationAsset = () => {
    return SAVINGS_ASSET_NAMES.some(name => {
      const a = assets.find(asset => asset.name === name);
      return a && selectedAssets.includes(a.id);
    });
  };

  const isSolarOrMicrogridSelected = () => {
    return ['Solar System', 'Microgrid'].some(name => {
      const a = assets.find(asset => asset.name === name);
      return a && selectedAssets.includes(a.id);
    });
  };

  const isDecarbOrBuildingOnly = () => {
    if (isSolarOrMicrogridSelected()) return false;
    return ['Decarbonising Technologies', 'Building Upgrade'].some(name => {
      const a = assets.find(asset => asset.name === name);
      return a && selectedAssets.includes(a.id);
    });
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

      const hasSavingsAsset = SAVINGS_ASSET_NAMES.some(name => {
        const a = assets.find(asset => asset.name === name);
        return a && newSelection.includes(a.id);
      });

      if (!hasSavingsAsset) {
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

    if (!gstConfirmed) {
      alert('Please confirm whether the invoice amount includes or excludes GST before continuing.');
      return;
    }

    const projectCostIncGst = gstMode === 'ex' && config.gstEnabled
      ? Math.round(projectCost * (1 + (config.gstRate ?? 0.1)) * 100) / 100
      : projectCost;

    updateState({
      projectCost: projectCostIncGst,
      selectedAssetIds: selectedAssets,
      annualSolarGenerationKwh: (hasEnergyGenerationAsset() && !isDecarbOrBuildingOnly()) ? annualSolarGeneration : undefined,
      currentElectricityBill: hasEnergyGenerationAsset() ? (currentElectricityBill !== undefined ? currentElectricityBill * 12 : undefined) : undefined,
      anticipatedElectricityBillWithSolar: hasEnergyGenerationAsset() ? (anticipatedElectricityBillWithSolar !== undefined ? anticipatedElectricityBillWithSolar * 12 : undefined) : undefined,
      specialPricingRequested,
      residualPercentage: isCarOnlyProject() ? residualPercentage : undefined,
      paymentTiming,
      systemSize: systemSize.trim() || undefined,
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
    setSystemSize('');
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

      const projectCostIncGstModal = gstMode === 'ex' && config.gstEnabled
        ? Math.round(projectCost * (1 + (config.gstRate ?? 0.1)) * 100) / 100
        : projectCost;

      updateState({
        projectCost: projectCostIncGstModal,
        selectedAssetIds: selectedAssets,
        annualSolarGenerationKwh: (hasEnergyGenerationAsset() && !isDecarbOrBuildingOnly()) ? annualSolarGeneration : undefined,
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
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-base font-semibold text-[#3A475B]">
                    Invoice Amount ({gstMode === 'inc' ? 'inc. GST' : 'ex. GST'})
                  </label>
                  {config.gstEnabled && (
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          if (gstMode !== 'inc') {
                            const gstRate = config.gstRate ?? 0.1;
                            setProjectCost(Math.round(projectCost * (1 + gstRate) * 100) / 100);
                            setGstMode('inc');
                          }
                        }}
                        className={`px-3 py-1 rounded-md transition-all ${gstMode === 'inc' ? 'bg-[#34AC48] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Inc. GST
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (gstMode !== 'ex') {
                            const gstRate = config.gstRate ?? 0.1;
                            setProjectCost(Math.round((projectCost / (1 + gstRate)) * 100) / 100);
                            setGstMode('ex');
                          }
                        }}
                        className={`px-3 py-1 rounded-md transition-all ${gstMode === 'ex' ? 'bg-[#34AC48] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Ex. GST
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-[#34AC48] rounded-2xl p-4 mb-4 text-center">
                  <div className="text-white text-4xl font-bold mb-1">
                    {formatCurrency(projectCost)}
                  </div>
                  <div className="text-white/90 text-xs font-medium">
                    Total Invoice Amount
                  </div>
                </div>


                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Enter amount: $</span>
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
                        const rounded = Math.round(numValue * 100) / 100;
                        setProjectCost(rounded);
                        if (rounded > 1000000 && !hasShownModal) {
                          setShowSpecialPricingModal(true);
                          setHasShownModal(true);
                        }
                      }
                      setIsEditingInput(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-right font-semibold"
                  />
                </div>

                <div
                  className={`mt-3 flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${gstConfirmed ? 'border-[#28AA48] bg-[#28AA48]/5' : 'border-orange-300 bg-orange-50'}`}
                  onClick={() => setGstConfirmed(v => !v)}
                >
                  <input
                    type="checkbox"
                    checked={gstConfirmed}
                    onChange={e => setGstConfirmed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 text-[#28AA48] rounded border-gray-300 focus:ring-[#28AA48] cursor-pointer flex-shrink-0"
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="text-sm text-[#3A475B] font-medium leading-snug">
                    I confirm the total invoice amount above is{' '}
                    <strong>{gstMode === 'inc' ? 'including' : 'excluding'} GST</strong>
                  </span>
                </div>
              </div>

              {hasEnergyGenerationAsset() && !isDecarbOrBuildingOnly() && (
                <div>
                  <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                    System Size
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the total system size in kilowatts (kW).
                  </p>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#28AA48]/30 focus-within:border-[#28AA48] transition-colors">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={systemSize.replace(/\s*kW\s*$/i, '') || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setSystemSize(val === '' ? '' : `${val} kW`);
                      }}
                      placeholder="e.g. 20"
                      className="flex-1 px-4 py-3 text-right font-semibold text-lg outline-none bg-transparent"
                    />
                    <span className="px-4 py-3 text-sm text-gray-500 bg-gray-50 border-l border-gray-300 select-none font-medium">kW</span>
                  </div>
                </div>
              )}

              {hasEnergyGenerationAsset() && !isDecarbOrBuildingOnly() && (
                <div>
                  <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                    Annual Solar Generation
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
                      placeholder="e.g., 200,000"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-right font-semibold text-lg"
                    />
                    <span className="text-sm text-gray-600 font-medium">kWh/year</span>
                  </div>
                </div>
              )}

              {hasEnergyGenerationAsset() && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    {isDecarbOrBuildingOnly()
                      ? 'To enable the electricity savings chart, fill out the below information.'
                      : 'To enable the solar savings chart, fill out the below information.'}
                  </p>
                </div>
              )}

              {hasEnergyGenerationAsset() && (
                <div>
                  <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                    Current Electricity Bill
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter the client's current average monthly electricity bill.
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
                      placeholder="e.g., 1,500"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-right font-semibold text-lg"
                    />
                    <span className="text-sm text-gray-600 font-medium">per month</span>
                  </div>
                </div>
              )}

              {hasEnergyGenerationAsset() && (
                <div>
                  <label className="block text-lg font-semibold text-[#3A475B] mb-2">
                    Anticipated Electricity Bill
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    {isDecarbOrBuildingOnly()
                      ? 'Enter the anticipated monthly electricity bill after installation.'
                      : 'Enter the anticipated monthly electricity bill after solar is installed.'}
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
                    <span className="text-sm text-gray-600 font-medium">per month</span>
                  </div>
                </div>
              )}

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
