import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CalculatorConfig } from '../../calculator';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ConfigEditorProps {
  config: CalculatorConfig;
  onUpdate: () => void;
}

type CalculatorType = 'rental' | 'serviced_rental' | 'progress_payment_rental';

interface CalculatorTypeState {
  enabled: boolean;
}

export function ConfigEditor({ config: initialConfig, onUpdate }: ConfigEditorProps) {
  const [activeCalculatorType, setActiveCalculatorType] = useState<CalculatorType>('rental');
  const [config, setConfig] = useState(initialConfig);
  const [calculatorStates, setCalculatorStates] = useState<Record<CalculatorType, CalculatorTypeState>>({
    rental: { enabled: false },
    serviced_rental: { enabled: false },
    progress_payment_rental: { enabled: false }
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { refreshConfig } = useApp();

  const updateConfig = (updates: Partial<CalculatorConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const loadConfigForType = async (type: CalculatorType) => {
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from('calculator_config')
        .select('config, enabled')
        .eq('calculator_type', type)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig(data.config as CalculatorConfig);
        setCalculatorStates(prev => ({
          ...prev,
          [type]: { enabled: data.enabled || false }
        }));
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Failed to load config: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadAllCalculatorStates = async () => {
    try {
      const { data, error } = await supabase
        .from('calculator_config')
        .select('calculator_type, enabled');

      if (error) throw error;
      if (data) {
        const states: Record<CalculatorType, CalculatorTypeState> = {
          rental: { enabled: false },
          serviced_rental: { enabled: false },
          progress_payment_rental: { enabled: false }
        };

        data.forEach(row => {
          if (row.calculator_type in states) {
            states[row.calculator_type as CalculatorType] = { enabled: row.enabled || false };
          }
        });

        setCalculatorStates(states);
      }
    } catch (error: any) {
      console.error('Failed to load calculator states:', error);
    }
  };

  useEffect(() => {
    loadAllCalculatorStates();
  }, []);

  useEffect(() => {
    loadConfigForType(activeCalculatorType);
  }, [activeCalculatorType]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: configRow } = await supabase
        .from('calculator_config')
        .select('id')
        .eq('calculator_type', activeCalculatorType)
        .maybeSingle();

      if (!configRow?.id) {
        throw new Error('Configuration not found');
      }

      const { error } = await supabase.rpc('update_calculator_config', {
        p_type: activeCalculatorType,
        p_config: config,
        p_enabled: calculatorStates[activeCalculatorType].enabled
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Configuration saved successfully!' });

      if (activeCalculatorType === 'rental') {
        await refreshConfig();
      }

      onUpdate();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = (type: CalculatorType, enabled: boolean) => {
    setCalculatorStates(prev => ({
      ...prev,
      [type]: { enabled }
    }));
  };

  const calculatorTabs = [
    { id: 'rental' as CalculatorType, label: 'Rental' },
    { id: 'serviced_rental' as CalculatorType, label: 'Serviced Rental' },
    { id: 'progress_payment_rental' as CalculatorType, label: 'Progress Payment Rental' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#3A475B]">Calculator Configuration</h2>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-all shadow-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div
          className={`
            p-4 rounded-lg flex items-center gap-2
            ${message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
            }
          `}
        >
          <AlertCircle className="w-5 h-5" />
          {message.text}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {calculatorTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCalculatorType(tab.id)}
              disabled={loading}
              className={`
                px-4 py-3 font-semibold whitespace-nowrap transition-colors
                ${activeCalculatorType === tab.id
                  ? 'border-b-2 border-[#28AA48] text-[#28AA48]'
                  : 'text-gray-600 hover:text-[#3A475B]'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeCalculatorType !== 'rental' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This calculator type is not yet implemented. You can configure settings here, but they won't be used until the calculator is developed.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading configuration...</div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#3A475B] mb-1">
                  {calculatorTabs.find(t => t.id === activeCalculatorType)?.label} Calculator
                </h3>
                <p className="text-sm text-gray-600">
                  {calculatorStates[activeCalculatorType].enabled
                    ? 'This calculator is currently visible to users'
                    : 'This calculator is currently hidden from users'}
                </p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-sm font-semibold text-[#3A475B]">
                  {calculatorStates[activeCalculatorType].enabled ? 'Enabled' : 'Disabled'}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={calculatorStates[activeCalculatorType].enabled}
                    onChange={e => handleToggleEnabled(activeCalculatorType, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:bg-[#28AA48] transition-colors"></div>
                  <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Interest Rates</h3>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Minimum Interest Rate
                </label>
                <input
                  type="number"
                  value={config.interestRateMin}
                  onChange={e => updateConfig({ interestRateMin: Number(e.target.value) })}
                  step="0.001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Maximum Interest Rate
                </label>
                <input
                  type="number"
                  value={config.interestRateMax}
                  onChange={e => updateConfig({ interestRateMax: Number(e.target.value) })}
                  step="0.001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Rate Strategy
                </label>
                <select
                  value={config.rateUsedStrategy}
                  onChange={e => updateConfig({ rateUsedStrategy: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                  <option value="midpoint">Midpoint</option>
                  <option value="custom">Custom</option>
                  <option value="term_based">Term-Based</option>
                  <option value="amount_based">Amount-Based</option>
                </select>
              </div>

              {config.rateUsedStrategy === 'custom' && (
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Custom Rate Used
                  </label>
                  <input
                    type="number"
                    value={config.customRateUsed}
                    onChange={e => updateConfig({ customRateUsed: Number(e.target.value) })}
                    step="0.001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {config.rateUsedStrategy === 'term_based' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                      Rate for Loans Under 5 Years
                    </label>
                    <input
                      type="number"
                      value={config.rateUnder5Years}
                      onChange={e => updateConfig({ rateUnder5Years: Number(e.target.value) })}
                      step="0.0001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Currently: {(config.rateUnder5Years * 100).toFixed(2)}%
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                      Rate for 5 Years and Above
                    </label>
                    <input
                      type="number"
                      value={config.rate5YearsAndAbove}
                      onChange={e => updateConfig({ rate5YearsAndAbove: Number(e.target.value) })}
                      step="0.0001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Currently: {(config.rate5YearsAndAbove * 100).toFixed(2)}%
                    </p>
                  </div>
                </>
              )}

              {config.rateUsedStrategy === 'amount_based' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-[#3A475B]">Interest Rate Tiers</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newTiers = [...(config.interestRateTiers || [])];
                        const lastTier = newTiers[newTiers.length - 1];
                        const newMinAmount = lastTier?.maxAmount ? lastTier.maxAmount + 1 : 100001;
                        newTiers.push({
                          minAmount: newMinAmount,
                          maxAmount: null,
                          rate: 0.0799
                        });
                        updateConfig({ interestRateTiers: newTiers });
                      }}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-[#28AA48] text-white rounded-lg hover:bg-[#229639]"
                    >
                      <Plus className="w-4 h-4" />
                      Add Tier
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(config.interestRateTiers || []).map((tier, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                        <div className="col-span-4">
                          <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                            Min Amount ($)
                          </label>
                          <input
                            type="number"
                            value={tier.minAmount}
                            onChange={e => {
                              const newTiers = [...(config.interestRateTiers || [])];
                              newTiers[index].minAmount = Number(e.target.value);
                              updateConfig({ interestRateTiers: newTiers });
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                            Max Amount ($) {index === (config.interestRateTiers || []).length - 1 && '(null = unlimited)'}
                          </label>
                          <input
                            type="number"
                            value={tier.maxAmount || ''}
                            onChange={e => {
                              const newTiers = [...(config.interestRateTiers || [])];
                              newTiers[index].maxAmount = e.target.value ? Number(e.target.value) : null;
                              updateConfig({ interestRateTiers: newTiers });
                            }}
                            placeholder="Unlimited"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                            Rate (%)
                          </label>
                          <input
                            type="number"
                            value={(tier.rate * 100).toFixed(2)}
                            onChange={e => {
                              const newTiers = [...(config.interestRateTiers || [])];
                              newTiers[index].rate = Number(e.target.value) / 100;
                              updateConfig({ interestRateTiers: newTiers });
                            }}
                            step="0.01"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newTiers = (config.interestRateTiers || []).filter((_, i) => i !== index);
                              updateConfig({ interestRateTiers: newTiers });
                            }}
                            className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            disabled={(config.interestRateTiers || []).length === 1}
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Repayment Type</h3>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Repayment Type
                </label>
                <select
                  value={config.repaymentType}
                  onChange={e => updateConfig({ repaymentType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="amortised">Amortised</option>
                  <option value="interest_only">Interest Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="feesEnabled"
                  checked={config.feesEnabled}
                  onChange={e => updateConfig({ feesEnabled: e.target.checked })}
                  className="w-5 h-5 text-[#28AA48] rounded"
                />
                <label htmlFor="feesEnabled" className="font-semibold text-[#3A475B]">
                  Enable Fees
                </label>
              </div>

              {config.feesEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                      Origination Fee Type
                    </label>
                    <select
                      value={config.originationFeeType}
                      onChange={e => updateConfig({ originationFeeType: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="percent">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                      Origination Fee Value
                    </label>
                    <input
                      type="number"
                      value={config.originationFeeValue}
                      onChange={e => updateConfig({ originationFeeValue: Number(e.target.value) })}
                      step="0.001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="feeCapitalised"
                      checked={config.feeCapitalised}
                      onChange={e => updateConfig({ feeCapitalised: e.target.checked })}
                      className="w-5 h-5 text-[#28AA48] rounded"
                    />
                    <label htmlFor="feeCapitalised" className="font-semibold text-[#3A475B]">
                      Capitalise Fee
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                      Monthly Fee
                    </label>
                    <input
                      type="number"
                      value={config.monthlyFee}
                      onChange={e => updateConfig({ monthlyFee: Number(e.target.value) })}
                      step="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Balloon Payment</h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="balloonEnabled"
                  checked={config.balloonEnabled}
                  onChange={e => updateConfig({ balloonEnabled: e.target.checked })}
                  className="w-5 h-5 text-[#28AA48] rounded"
                />
                <label htmlFor="balloonEnabled" className="font-semibold text-[#3A475B]">
                  Enable Balloon Payment
                </label>
              </div>

              {config.balloonEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                      Balloon Type
                    </label>
                    <select
                      value={config.balloonType}
                      onChange={e => updateConfig({ balloonType: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="percent">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                      Balloon Value
                    </label>
                    <input
                      type="number"
                      value={config.balloonValue}
                      onChange={e => updateConfig({ balloonValue: Number(e.target.value) })}
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Approval Settings</h3>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Approval Mode
                </label>
                <select
                  value={config.approvalMode}
                  onChange={e => updateConfig({ approvalMode: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="multiplier">Multiplier</option>
                  <option value="ltv">Loan-to-Value (LTV)</option>
                </select>
              </div>

              {config.approvalMode === 'multiplier' ? (
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Approval Multiplier
                  </label>
                  <input
                    type="number"
                    value={config.approvalMultiplier}
                    onChange={e => updateConfig({ approvalMultiplier: Number(e.target.value) })}
                    step="0.1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                    Maximum LTV
                  </label>
                  <input
                    type="number"
                    value={config.maxLTV}
                    onChange={e => updateConfig({ maxLTV: Number(e.target.value) })}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Approval Floor (optional)
                </label>
                <input
                  type="number"
                  value={config.approvalFloor || ''}
                  onChange={e => updateConfig({ approvalFloor: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Approval Ceiling (optional)
                </label>
                <input
                  type="number"
                  value={config.approvalCeiling || ''}
                  onChange={e => updateConfig({ approvalCeiling: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Energy Savings</h3>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Default Monthly Energy Savings
                </label>
                <input
                  type="number"
                  value={config.defaultMonthlyEnergySavings}
                  onChange={e => updateConfig({ defaultMonthlyEnergySavings: Number(e.target.value) })}
                  step="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowOverride"
                  checked={config.allowUserEnergySavingsOverride}
                  onChange={e => updateConfig({ allowUserEnergySavingsOverride: e.target.checked })}
                  className="w-5 h-5 text-[#28AA48] rounded"
                />
                <label htmlFor="allowOverride" className="font-semibold text-[#3A475B]">
                  Allow User Override
                </label>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Cost Slider Settings</h3>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Minimum Cost
                </label>
                <input
                  type="text"
                  value={config.costSliderMin.toLocaleString('en-US')}
                  onChange={e => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                      updateConfig({ costSliderMin: numValue });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Maximum Cost
                </label>
                <input
                  type="text"
                  value={config.costSliderMax.toLocaleString('en-US')}
                  onChange={e => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                      updateConfig({ costSliderMax: numValue });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Default Cost
                </label>
                <input
                  type="text"
                  value={config.costSliderDefault.toLocaleString('en-US')}
                  onChange={e => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                      updateConfig({ costSliderDefault: numValue });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Step Size
                </label>
                <input
                  type="text"
                  value={config.costSliderStep.toLocaleString('en-US')}
                  onChange={e => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                      updateConfig({ costSliderStep: numValue });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                  Max Label
                </label>
                <input
                  type="text"
                  value={config.costSliderMaxLabel}
                  onChange={e => updateConfig({ costSliderMaxLabel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Commission Structure</h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="commissionEnabled"
                  checked={config.commissionEnabled}
                  onChange={e => updateConfig({ commissionEnabled: e.target.checked })}
                  className="w-5 h-5 text-[#28AA48] rounded"
                />
                <label htmlFor="commissionEnabled" className="font-semibold text-[#3A475B]">
                  Enable Commission Calculation
                </label>
              </div>

              {config.commissionEnabled && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="gstEnabled"
                      checked={config.gstEnabled}
                      onChange={e => updateConfig({ gstEnabled: e.target.checked })}
                      className="w-5 h-5 text-[#28AA48] rounded"
                    />
                    <label htmlFor="gstEnabled" className="font-semibold text-[#3A475B]">
                      Add GST to Commission
                    </label>
                  </div>

                  {config.gstEnabled && (
                    <div>
                      <label className="block text-sm font-semibold text-[#3A475B] mb-2">
                        GST Rate
                      </label>
                      <input
                        type="number"
                        value={config.gstRate}
                        onChange={e => updateConfig({ gstRate: Number(e.target.value) })}
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Currently: {(config.gstRate * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-[#3A475B] mb-2">
                      Application Fee (inc. GST)
                    </label>
                    <input
                      type="number"
                      value={config.applicationFee || 649}
                      onChange={e => updateConfig({ applicationFee: Number(e.target.value) })}
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This fee is automatically added to all loans but hidden from public quotes
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#3A475B] mb-2">
                      PPSR Fee (inc. GST)
                    </label>
                    <input
                      type="number"
                      value={config.ppsrFee || 6}
                      onChange={e => updateConfig({ ppsrFee: Number(e.target.value) })}
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This fee is automatically added to all loans but hidden from public quotes
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="commissionCapitalised"
                      checked={config.commissionCapitalised}
                      onChange={e => updateConfig({ commissionCapitalised: e.target.checked })}
                      className="w-5 h-5 text-[#28AA48] rounded"
                    />
                    <label htmlFor="commissionCapitalised" className="font-semibold text-[#3A475B]">
                      Add Commission to Loan Amount
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 -mt-3 ml-7">
                    When enabled, commission will be added to the total financed amount and included in monthly payments.
                  </p>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-[#3A475B]">Commission Tiers</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newTiers = [...config.commissionTiers];
                          const lastTier = newTiers[newTiers.length - 1];
                          const newMinAmount = lastTier?.maxAmount || 0;
                          newTiers.push({
                            minAmount: newMinAmount,
                            maxAmount: newMinAmount + 50000,
                            percentage: 0.01
                          });
                          updateConfig({ commissionTiers: newTiers });
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-[#28AA48] text-white rounded-lg hover:bg-[#229639]"
                      >
                        <Plus className="w-4 h-4" />
                        Add Tier
                      </button>
                    </div>

                    <div className="space-y-3">
                      {config.commissionTiers.map((tier, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                          <div className="col-span-4">
                            <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                              Min Amount ($)
                            </label>
                            <input
                              type="number"
                              value={tier.minAmount}
                              onChange={e => {
                                const newTiers = [...config.commissionTiers];
                                newTiers[index].minAmount = Number(e.target.value);
                                updateConfig({ commissionTiers: newTiers });
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="col-span-4">
                            <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                              Max Amount ($) {index === config.commissionTiers.length - 1 && '(null = unlimited)'}
                            </label>
                            <input
                              type="number"
                              value={tier.maxAmount || ''}
                              onChange={e => {
                                const newTiers = [...config.commissionTiers];
                                newTiers[index].maxAmount = e.target.value ? Number(e.target.value) : null;
                                updateConfig({ commissionTiers: newTiers });
                              }}
                              placeholder="Unlimited"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-xs font-semibold text-[#3A475B] mb-1">
                              Rate (%)
                            </label>
                            <input
                              type="number"
                              value={Math.round(tier.percentage * 100 * 100) / 100}
                              onChange={e => {
                                const newTiers = [...config.commissionTiers];
                                newTiers[index].percentage = Number(e.target.value) / 100;
                                updateConfig({ commissionTiers: newTiers });
                              }}
                              step="0.01"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="col-span-1">
                            <button
                              type="button"
                              onClick={() => {
                                const newTiers = config.commissionTiers.filter((_, i) => i !== index);
                                updateConfig({ commissionTiers: newTiers });
                              }}
                              className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              disabled={config.commissionTiers.length === 1}
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="md:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-[#3A475B]">Disclaimer Text</h3>

              <div>
                <textarea
                  value={config.disclaimerText}
                  onChange={e => updateConfig({ disclaimerText: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
