import { useState } from 'react';
import { CalculatorConfig, calculateAll, formatCurrency, formatPercent } from '../../calculator';
import { Calculator } from 'lucide-react';

interface PreviewToolProps {
  config: CalculatorConfig;
}

export function PreviewTool({ config }: PreviewToolProps) {
  const [projectCost, setProjectCost] = useState(100000);
  const [loanTerm, setLoanTerm] = useState(5);
  const [energySavings, setEnergySavings] = useState(config.defaultMonthlyEnergySavings);

  const results = calculateAll(
    {
      projectCost,
      loanTermYears: loanTerm,
      monthlyEnergySavings: energySavings
    },
    config
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#3A475B] mb-2">Preview Tool</h2>
        <p className="text-gray-600">
          Test your calculator configuration with different inputs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-[#3A475B] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#28AA48]" />
            Input Parameters
          </h3>

          <div>
            <label className="block text-sm font-semibold text-[#3A475B] mb-2">
              Project Cost
            </label>
            <input
              type="text"
              value={projectCost.toLocaleString('en-US')}
              onChange={e => {
                const value = e.target.value.replace(/,/g, '');
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  setProjectCost(numValue);
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#3A475B] mb-2">
              Loan Term (Years)
            </label>
            <select
              value={loanTerm}
              onChange={e => setLoanTerm(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold"
            >
              {(config.loanTermOptions || [1, 2, 3, 5, 7]).map(term => (
                <option key={term} value={term}>
                  {term} {term === 1 ? 'Year' : 'Years'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#3A475B] mb-2">
              Monthly Energy Savings
            </label>
            <input
              type="text"
              value={energySavings.toLocaleString('en-US')}
              onChange={e => {
                const value = e.target.value.replace(/,/g, '');
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                  setEnergySavings(numValue);
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-bold text-[#3A475B]">Current Config</h4>
            <div className="grid grid-cols-2 gap-2 text-[#3A475B]">
              <div>Rate Strategy:</div>
              <div className="font-semibold">{config.rateUsedStrategy}</div>
              <div>Repayment Type:</div>
              <div className="font-semibold">{config.repaymentType}</div>
              <div>Fees Enabled:</div>
              <div className="font-semibold">{config.feesEnabled ? 'Yes' : 'No'}</div>
              <div>Balloon Enabled:</div>
              <div className="font-semibold">{config.balloonEnabled ? 'Yes' : 'No'}</div>
              <div>Approval Mode:</div>
              <div className="font-semibold">{config.approvalMode}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-[#3A475B]">Calculated Results</h3>

          <div className="bg-gradient-to-br from-[#094325] to-[#28AA48] rounded-xl p-6 text-white">
            <div className="text-sm opacity-90 mb-2">Estimated Monthly Repayment</div>
            <div className="text-4xl font-bold mb-1">
              {formatCurrency(results.monthlyRepayment, true)}
            </div>
            <div className="text-sm opacity-75">per month</div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Interest Rate Used</div>
              <div className="text-2xl font-bold text-[#3A475B]">
                {formatPercent(results.rateUsed)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Base Loan Amount</div>
              <div className="text-2xl font-bold text-[#3A475B]">
                {formatCurrency(results.baseLoanAmount)}
              </div>
              {config.feesEnabled && (
                <div className="text-xs text-gray-600 mt-1">
                  Includes {formatCurrency(results.originationFee)} origination fee
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Repayment</div>
              <div className="text-2xl font-bold text-[#3A475B]">
                {formatCurrency(results.totalRepayment)}
              </div>
              {config.balloonEnabled && (
                <div className="text-xs text-gray-600 mt-1">
                  Includes {formatCurrency(results.balloonAmount)} balloon payment
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Potential Approval Amount</div>
              <div className="text-2xl font-bold text-[#28AA48]">
                {formatCurrency(results.approvalAmount)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-100 rounded-lg p-4">
              <div className="text-sm text-[#3A475B] mb-3 font-semibold">
                Cash Flow Analysis
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <div className="text-gray-600">Savings</div>
                  <div className="font-bold text-[#28AA48]">
                    {formatCurrency(results.monthlyEnergySavings)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Payment</div>
                  <div className="font-bold text-[#3A475B]">
                    {formatCurrency(results.monthlyRepayment, true)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Net</div>
                  <div
                    className={`font-bold ${
                      results.netMonthlyCashflow >= 0
                        ? 'text-green-700'
                        : 'text-orange-700'
                    }`}
                  >
                    {formatCurrency(results.netMonthlyCashflow)}
                  </div>
                </div>
              </div>
              {results.netMonthlyCashflow >= 0 ? (
                <div className="text-xs text-green-800 bg-green-100 rounded p-2">
                  Positive cashflow - Savings exceed payments
                </div>
              ) : (
                <div className="text-xs text-orange-800 bg-orange-100 rounded p-2">
                  Negative cashflow - Additional funds needed
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
