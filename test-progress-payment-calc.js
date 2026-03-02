const config = {
  baseInterestRate: 0.0799,
  gstRate: 0.10,
  gstEnabled: true,
  commissionEnabled: true,
  commissionCapitalised: true,
  commissionTiers: [
    { minAmount: 0, maxAmount: null, percentage: 0.01 }
  ],
  feesEnabled: false,
  feeCapitalised: false,
  originationFeeRate: 0,
  applicationFee: 649,
  ppsrFee: 6,
  repaymentType: 'principal_and_interest',
  paymentTiming: 'arrears'
};

function calculateCommission(approvalAmount, config) {
  let totalCommission = 0;
  const sortedTiers = [...config.commissionTiers].sort((a, b) => a.minAmount - b.minAmount);

  for (const tier of sortedTiers) {
    if (approvalAmount <= tier.minAmount) break;
    const tierMin = tier.minAmount;
    const tierMax = tier.maxAmount || Infinity;
    if (approvalAmount > tierMin) {
      const amountInTier = Math.min(approvalAmount, tierMax) - tierMin;
      totalCommission += amountInTier * tier.percentage;
    }
  }

  const commissionWithGst = config.gstEnabled
    ? totalCommission * (1 + config.gstRate)
    : totalCommission;

  return { commission: totalCommission, commissionWithGst };
}

function calculateMonthlyRepayment(principal, rate, months) {
  if (months <= 0) return 0;
  const i = rate / 12;
  if (i === 0) return principal / months;
  const payment = (principal * i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);
  return Math.round(payment * 100) / 100;
}

const projectCostIncGst = 1000000;
const projectCostExGst = projectCostIncGst / 1.10;
const loanTermYears = 10;
const totalMonths = loanTermYears * 12;

console.log('\n=== Progress Payment Calculation Test ===');
console.log(`Project Cost (inc GST): $${projectCostIncGst.toLocaleString()}`);
console.log(`Project Cost (ex GST): $${projectCostExGst.toLocaleString()}`);
console.log(`Loan Term: ${loanTermYears} years (${totalMonths} months)`);
console.log(`Interest Rate: ${(config.baseInterestRate * 100).toFixed(2)}%`);

const approvalAmount = projectCostExGst;
const { commission, commissionWithGst } = calculateCommission(approvalAmount, config);

console.log(`\nCommission on $${approvalAmount.toLocaleString()}:`);
console.log(`  Base: $${commission.toLocaleString()}`);
console.log(`  With GST: $${commissionWithGst.toLocaleString()}`);

const progressPayments = [
  { percentage: 50, daysAfterStart: 0 },
  { percentage: 25, daysAfterStart: 30 },
  { percentage: 25, daysAfterStart: 60 }
];

console.log('\n=== Drawdown Calculations ===\n');

let totalMonthlyPayment = 0;
let totalFinanced = 0;

progressPayments.forEach((payment, index) => {
  const drawdownAmount = projectCostExGst * (payment.percentage / 100);
  const monthsElapsed = Math.floor(payment.daysAfterStart / 30);
  const monthsRemaining = totalMonths - monthsElapsed;

  let financedAmount = drawdownAmount;

  if (index === 0) {
    financedAmount += config.applicationFee + config.ppsrFee + commissionWithGst;
  }

  const monthlyPayment = calculateMonthlyRepayment(
    financedAmount,
    config.baseInterestRate,
    monthsRemaining
  );

  totalMonthlyPayment += monthlyPayment;
  totalFinanced += financedAmount;

  console.log(`Drawdown ${index + 1} (${payment.percentage}% at day ${payment.daysAfterStart}):`);
  console.log(`  Drawdown Amount: $${drawdownAmount.toLocaleString()}`);
  if (index === 0) {
    console.log(`  + Application Fee: $${config.applicationFee}`);
    console.log(`  + PPSR Fee: $${config.ppsrFee}`);
    console.log(`  + Commission (on full $1M): $${commissionWithGst.toLocaleString()}`);
  }
  console.log(`  = Total Financed: $${financedAmount.toLocaleString()}`);
  console.log(`  Months Remaining: ${monthsRemaining}`);
  console.log(`  Monthly Payment: $${monthlyPayment.toLocaleString()}`);
  console.log('');
});

console.log('=== Summary ===');
console.log(`Total Amount Financed: $${totalFinanced.toLocaleString()}`);
console.log(`Total Monthly Payment: $${totalMonthlyPayment.toLocaleString()}`);
console.log(`Total Repayment: $${(totalMonthlyPayment * totalMonths).toLocaleString()}`);

const annualMaintenanceFee = 1200;
const monthlyMaintenanceFee = annualMaintenanceFee / 12;
console.log(`\nWith Annual Maintenance Fee: $${annualMaintenanceFee.toLocaleString()}`);
console.log(`Monthly Maintenance: $${monthlyMaintenanceFee}`);
console.log(`Final Monthly Payment: $${(totalMonthlyPayment + monthlyMaintenanceFee).toLocaleString()}`);
