export interface CommissionTier {
  minAmount: number;
  maxAmount: number | null;
  percentage: number;
}

export interface InterestRateTier {
  minAmount: number;
  maxAmount: number | null;
  rate: number;
}

export interface ProgressPayment {
  percentage: number;
  daysAfterStart: number;
}

export interface CalculatorConfig {
  interestRateMin: number;
  interestRateMax: number;
  rateUsedStrategy: 'min' | 'max' | 'midpoint' | 'custom' | 'term_based' | 'amount_based';
  customRateUsed: number;
  rateUnder5Years: number;
  rate5YearsAndAbove: number;
  interestRateTiers: InterestRateTier[];
  repaymentType: 'amortised' | 'interest_only';
  paymentTiming?: 'advance' | 'arrears';
  feesEnabled: boolean;
  originationFeeType: 'percent' | 'fixed';
  originationFeeValue: number;
  feeCapitalised: boolean;
  monthlyFee: number;
  balloonEnabled: boolean;
  balloonType: 'percent' | 'fixed';
  balloonValue: number;
  approvalMode: 'multiplier' | 'ltv';
  approvalMultiplier: number;
  maxLTV: number;
  approvalFloor?: number;
  approvalCeiling?: number;
  commissionEnabled: boolean;
  commissionTiers: CommissionTier[];
  commissionCapitalised: boolean;
  gstEnabled: boolean;
  gstRate: number;
  applicationFee: number;
  ppsrFee: number;
}

export interface CalculationInputs {
  projectCost: number;
  loanTermYears: number;
  selectedAssetIds?: string[];
  assetRiskAdjustments?: Record<string, number>;
  residualPercentage?: number;
  paymentTiming?: 'advance' | 'arrears';
  progressPayments?: ProgressPayment[];
  annualMaintenanceFee?: number;
}

export interface CalculationResults {
  rateUsed: number;
  baseLoanAmount: number;
  originationFee: number;
  monthlyRepayment: number;
  balloonAmount: number;
  totalRepayment: number;
  approvalAmount: number;
  commission: number;
  commissionWithGst: number;
  applicationFee: number;
  ppsrFee: number;
  invoiceAmountExGst: number;
  progressPaymentBreakdown?: ProgressPaymentBreakdown[];
  monthlyMaintenanceFee?: number;
}

export interface ProgressPaymentBreakdown {
  drawdownNumber: number;
  percentage: number;
  amount: number;
  daysAfterStart: number;
  monthsRemaining: number;
  includesCommission: boolean;
  includesFees: boolean;
  financedAmount: number;
  monthlyPayment: number;
}

export function calculateRateUsed(config: CalculatorConfig, loanTermYears?: number, projectCost?: number): number {
  switch (config.rateUsedStrategy) {
    case 'min':
      return config.interestRateMin;
    case 'max':
      return config.interestRateMax;
    case 'midpoint':
      return (config.interestRateMin + config.interestRateMax) / 2;
    case 'custom':
      return config.customRateUsed;
    case 'term_based':
      if (loanTermYears !== undefined && loanTermYears <= 5) {
        return config.rateUnder5Years;
      }
      return config.rate5YearsAndAbove;
    case 'amount_based':
      if (projectCost !== undefined && config.interestRateTiers && config.interestRateTiers.length > 0) {
        for (const tier of config.interestRateTiers) {
          if (projectCost >= tier.minAmount && (tier.maxAmount === null || projectCost <= tier.maxAmount)) {
            let baseRate = tier.rate;

            // For amounts over $100k: if term is over 5 years, add 1.5% to the base rate
            if (projectCost > 100000 && loanTermYears !== undefined && loanTermYears > 5) {
              baseRate += 0.015;
            }

            return baseRate;
          }
        }
      }
      return config.interestRateMin;
    default:
      return config.interestRateMin;
  }
}

export function calculateOriginationFee(
  projectCost: number,
  config: CalculatorConfig
): number {
  if (!config.feesEnabled) return 0;

  if (config.originationFeeType === 'percent') {
    return projectCost * config.originationFeeValue;
  } else {
    return config.originationFeeValue;
  }
}

export function calculateBaseLoanAmount(
  projectCost: number,
  config: CalculatorConfig
): number {
  const originationFee = calculateOriginationFee(projectCost, config);

  if (config.feesEnabled && config.feeCapitalised) {
    return projectCost + originationFee;
  }

  return projectCost;
}

export function calculateBalloonAmount(
  principal: number,
  config: CalculatorConfig,
  userResidualPercentage?: number
): number {
  if (userResidualPercentage !== undefined && userResidualPercentage > 0) {
    return principal * (userResidualPercentage / 100);
  }

  if (!config.balloonEnabled) return 0;

  if (config.balloonType === 'percent') {
    return principal * config.balloonValue;
  } else {
    return config.balloonValue;
  }
}

export function calculateMonthlyRepayment(
  principal: number,
  rateUsed: number,
  loanTermYears: number,
  config: CalculatorConfig,
  userResidualPercentage?: number,
  userPaymentTiming?: 'advance' | 'arrears',
  balloonAmountOverride?: number
): number {
  const n = loanTermYears * 12;
  const i = rateUsed / 12;

  let payment = 0;
  const paymentTiming = userPaymentTiming || config.paymentTiming || 'arrears';

  if (config.repaymentType === 'interest_only') {
    payment = (principal * rateUsed) / 12;
  } else {
    const balloonAmount = balloonAmountOverride !== undefined
      ? balloonAmountOverride
      : calculateBalloonAmount(principal, config, userResidualPercentage);

    if (balloonAmount === 0) {
      if (i === 0) {
        payment = principal / n;
      } else {
        payment = (principal * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
        if (paymentTiming === 'advance') {
          payment = payment / (1 + i);
        }
      }
    } else {
      if (i === 0) {
        payment = (principal - balloonAmount) / n;
      } else {
        const presentValueOfBalloon = balloonAmount / Math.pow(1 + i, n);
        const adjustedPrincipal = principal - presentValueOfBalloon;
        payment = (adjustedPrincipal * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
        if (paymentTiming === 'advance') {
          payment = payment / (1 + i);
        }
      }
    }
  }

  const paymentWithFee = payment + config.monthlyFee;

  return Math.round(paymentWithFee * 100) / 100;
}

export function calculateTotalRepayment(
  monthlyRepayment: number,
  loanTermYears: number,
  principal: number,
  config: CalculatorConfig,
  userResidualPercentage?: number,
  balloonAmountOverride?: number
): number {
  const n = loanTermYears * 12;
  const monthlyPaymentWithoutFee = monthlyRepayment - config.monthlyFee;
  const totalMonthlyPayments = monthlyPaymentWithoutFee * n;
  const totalFees = config.monthlyFee * n;

  let balloonAmount = 0;

  if (balloonAmountOverride !== undefined) {
    balloonAmount = balloonAmountOverride;
  } else if (config.repaymentType === 'interest_only') {
    balloonAmount = principal;
  } else if (userResidualPercentage !== undefined && userResidualPercentage > 0) {
    balloonAmount = calculateBalloonAmount(principal, config, userResidualPercentage);
  } else if (config.balloonEnabled) {
    balloonAmount = calculateBalloonAmount(principal, config);
  }

  return totalMonthlyPayments + totalFees + balloonAmount;
}

export function calculateApprovalAmount(
  projectCost: number,
  config: CalculatorConfig,
  selectedAssetIds: string[] = [],
  assetRiskAdjustments: Record<string, number> = {}
): number {
  let approval = 0;

  if (config.approvalMode === 'multiplier') {
    approval = projectCost * config.approvalMultiplier;
  } else {
    approval = projectCost * config.maxLTV;

    if (selectedAssetIds.length > 0) {
      const avgRiskAdjustment = selectedAssetIds.reduce((sum, id) => {
        return sum + (assetRiskAdjustments[id] || 1.0);
      }, 0) / selectedAssetIds.length;

      approval = approval * avgRiskAdjustment;
    }
  }

  if (config.approvalFloor !== undefined && approval < config.approvalFloor) {
    approval = config.approvalFloor;
  }

  if (config.approvalCeiling !== undefined && approval > config.approvalCeiling) {
    approval = config.approvalCeiling;
  }

  return approval;
}

export function calculateCommission(
  invoiceAmountIncGst: number,
  config: CalculatorConfig
): { commission: number; commissionWithGst: number } {
  if (!config.commissionEnabled || !config.commissionTiers || config.commissionTiers.length === 0) {
    return { commission: 0, commissionWithGst: 0 };
  }

  const sortedTiers = [...config.commissionTiers].sort((a, b) => a.minAmount - b.minAmount);

  let applicableTier = sortedTiers[0];
  for (const tier of sortedTiers) {
    if (invoiceAmountIncGst >= tier.minAmount && (tier.maxAmount === null || invoiceAmountIncGst <= tier.maxAmount)) {
      applicableTier = tier;
      break;
    }
  }

  const totalCommission = invoiceAmountIncGst * applicableTier.percentage;

  const commissionWithGst = config.gstEnabled
    ? totalCommission * (1 + config.gstRate)
    : totalCommission;

  return {
    commission: totalCommission,
    commissionWithGst
  };
}

export function calculateAll(
  inputs: CalculationInputs,
  config: CalculatorConfig
): CalculationResults {
  const invoiceAmountIncGst = inputs.projectCost;
  const invoiceAmountExGst = config.gstEnabled
    ? invoiceAmountIncGst / (1 + config.gstRate)
    : invoiceAmountIncGst;

  // Application fee and PPSR fee are stored as inc-GST values
  // Add them to the loan as inc-GST amounts
  const applicationFee = config.applicationFee || 0;
  const ppsrFee = config.ppsrFee || 0;

  const rateUsed = calculateRateUsed(config, inputs.loanTermYears, invoiceAmountExGst);
  const originationFee = calculateOriginationFee(invoiceAmountExGst, config);

  let baseLoanAmount = invoiceAmountExGst;

  if (config.feesEnabled && config.feeCapitalised) {
    baseLoanAmount += originationFee;
  }

  baseLoanAmount += applicationFee + ppsrFee;

  const approvalAmount = calculateApprovalAmount(
    invoiceAmountExGst,
    config,
    inputs.selectedAssetIds,
    inputs.assetRiskAdjustments
  );
  const { commission, commissionWithGst } = calculateCommission(invoiceAmountIncGst, config);

  // Commission is financed WITH GST
  if (config.commissionEnabled && config.commissionCapitalised) {
    baseLoanAmount += commissionWithGst;
  }

  const balloonAmount = calculateBalloonAmount(invoiceAmountExGst, config, inputs.residualPercentage);
  const monthlyRepayment = calculateMonthlyRepayment(
    baseLoanAmount,
    rateUsed,
    inputs.loanTermYears,
    config,
    inputs.residualPercentage,
    inputs.paymentTiming,
    balloonAmount
  );
  const totalRepayment = calculateTotalRepayment(
    monthlyRepayment,
    inputs.loanTermYears,
    baseLoanAmount,
    config,
    inputs.residualPercentage,
    balloonAmount
  );

  return {
    rateUsed,
    baseLoanAmount,
    originationFee,
    monthlyRepayment,
    balloonAmount,
    totalRepayment,
    approvalAmount,
    commission,
    commissionWithGst,
    applicationFee,
    ppsrFee,
    invoiceAmountExGst
  };
}

export function formatCurrency(amount: number, decimals: boolean = false): string {
  if (decimals) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } else {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function calculateCostPerKwh(
  monthlyRepayment: number,
  annualGenerationKwh: number
): number | null {
  if (!annualGenerationKwh || annualGenerationKwh <= 0) {
    return null;
  }

  const monthlyGenerationKwh = annualGenerationKwh / 12;

  if (monthlyGenerationKwh === 0) {
    return null;
  }

  const costPerKwh = monthlyRepayment / monthlyGenerationKwh;
  const costPerKwhInCents = costPerKwh * 100;

  return Math.round(costPerKwhInCents * 1000) / 1000;
}

export function formatCostPerKwh(costInCents: number): string {
  return `${costInCents.toFixed(3)}¢`;
}

export function calculateProgressPayment(
  inputs: CalculationInputs,
  config: CalculatorConfig
): CalculationResults {
  const invoiceAmountIncGst = inputs.projectCost;
  const invoiceAmountExGst = config.gstEnabled
    ? invoiceAmountIncGst / (1 + config.gstRate)
    : invoiceAmountIncGst;

  const applicationFee = config.applicationFee || 0;
  const ppsrFee = config.ppsrFee || 0;
  const rateUsed = calculateRateUsed(config, inputs.loanTermYears, invoiceAmountExGst);

  const approvalAmount = calculateApprovalAmount(
    invoiceAmountExGst,
    config,
    inputs.selectedAssetIds,
    inputs.assetRiskAdjustments
  );

  const { commission, commissionWithGst } = calculateCommission(invoiceAmountIncGst, config);

  if (!inputs.progressPayments || inputs.progressPayments.length === 0) {
    return calculateAll(inputs, config);
  }

  const progressPayments = inputs.progressPayments.sort((a, b) => a.daysAfterStart - b.daysAfterStart);
  const totalMonths = inputs.loanTermYears * 12;

  let totalBaseLoanAmount = 0;
  let totalMonthlyPayment = 0;
  const breakdowns: ProgressPaymentBreakdown[] = [];

  progressPayments.forEach((payment, index) => {
    const drawdownNumber = index + 1;
    const amount = invoiceAmountExGst * (payment.percentage / 100);

    const monthsElapsed = Math.floor(payment.daysAfterStart / 30);
    const monthsRemaining = totalMonths - monthsElapsed;

    let financedAmount = amount;
    let includesCommission = false;
    let includesFees = false;

    if (index === 0) {
      financedAmount += applicationFee + ppsrFee;
      includesFees = true;

      if (config.commissionEnabled && config.commissionCapitalised) {
        financedAmount += commissionWithGst;
        includesCommission = true;
      }
    }

    const monthlyPayment = calculateMonthlyRepaymentForDrawdown(
      financedAmount,
      rateUsed,
      monthsRemaining,
      config,
      inputs.paymentTiming
    );

    totalBaseLoanAmount += financedAmount;
    totalMonthlyPayment += monthlyPayment;

    breakdowns.push({
      drawdownNumber,
      percentage: payment.percentage,
      amount,
      daysAfterStart: payment.daysAfterStart,
      monthsRemaining,
      includesCommission,
      includesFees,
      financedAmount,
      monthlyPayment
    });
  });

  const monthlyMaintenanceFee = inputs.annualMaintenanceFee
    ? inputs.annualMaintenanceFee / 12
    : 0;

  const totalMonthlyPaymentWithMaintenance = totalMonthlyPayment + monthlyMaintenanceFee;

  const totalRepayment = totalMonthlyPaymentWithMaintenance * totalMonths;

  return {
    rateUsed,
    baseLoanAmount: totalBaseLoanAmount,
    originationFee: 0,
    monthlyRepayment: totalMonthlyPaymentWithMaintenance,
    balloonAmount: 0,
    totalRepayment,
    approvalAmount,
    commission,
    commissionWithGst,
    applicationFee,
    ppsrFee,
    invoiceAmountExGst,
    progressPaymentBreakdown: breakdowns,
    monthlyMaintenanceFee
  };
}

function calculateMonthlyRepaymentForDrawdown(
  principal: number,
  rateUsed: number,
  months: number,
  config: CalculatorConfig,
  userPaymentTiming?: 'advance' | 'arrears'
): number {
  if (months <= 0) return 0;

  const i = rateUsed / 12;
  let payment = 0;
  const paymentTiming = userPaymentTiming || config.paymentTiming || 'arrears';

  if (config.repaymentType === 'interest_only') {
    payment = (principal * rateUsed) / 12;
  } else {
    if (i === 0) {
      payment = principal / months;
    } else {
      payment = (principal * i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
      if (paymentTiming === 'advance') {
        payment = payment / (1 + i);
      }
    }
  }

  return Math.round(payment * 100) / 100;
}
