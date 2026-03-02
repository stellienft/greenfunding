// Test with current database configuration
const projectCost = 148926.30;
const loanTermYears = 7;

// From database config
const config = {
  originationFeeType: 'percent',
  originationFeeValue: 0.022,
  feeCapitalised: true,
  rateUsedStrategy: 'term_based',
  rate5YearsAndAbove: 0.0949,
  paymentTiming: 'advance',
  repaymentType: 'amortised',
  monthlyFee: 0,
  balloonEnabled: false,
  commissionEnabled: true,
  approvalMultiplier: 1.2,
};

console.log('=== INPUT ===');
console.log('Project Cost:', projectCost.toFixed(2));
console.log('Loan Term:', loanTermYears, 'years');
console.log('');

// Calculate origination fee
let originationFee = 0;
if (config.originationFeeType === 'percent') {
  originationFee = projectCost * config.originationFeeValue;
}
console.log('=== FEES ===');
console.log('Origination Fee (2.2%):', originationFee.toFixed(2));
console.log('');

// Calculate base loan amount
let baseLoanAmount = projectCost;
if (config.feeCapitalised) {
  baseLoanAmount = projectCost + originationFee;
}
console.log('=== LOAN AMOUNT ===');
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('');

// Get rate
const rateUsed = loanTermYears >= 5 ? config.rate5YearsAndAbove : 0.0799;
console.log('=== INTEREST RATE ===');
console.log('Rate Used:', (rateUsed * 100).toFixed(2) + '%');
console.log('');

// Calculate monthly payment
const n = loanTermYears * 12;
const i = rateUsed / 12;

const pow = Math.pow(1 + i, n);
let payment = (baseLoanAmount * i * pow) / (pow - 1);

// Adjust for advance timing
if (config.paymentTiming === 'advance') {
  payment = payment / (1 + i);
}

// Add monthly fee
payment = payment + config.monthlyFee;

console.log('=== MONTHLY PAYMENT ===');
console.log('Months:', n);
console.log('Monthly Rate:', (i * 100).toFixed(4) + '%');
console.log('Payment Timing:', config.paymentTiming);
console.log('Monthly Payment:', payment.toFixed(2));
console.log('');

// Calculate total repayment
const totalRepayment = payment * n;
console.log('=== TOTAL REPAYMENT ===');
console.log('Total Repayment:', totalRepayment.toFixed(2));
console.log('Total Interest:', (totalRepayment - baseLoanAmount).toFixed(2));
console.log('');

// Calculate approval and commission
const approvalAmount = projectCost * config.approvalMultiplier;
console.log('=== APPROVAL & COMMISSION ===');
console.log('Approval Amount:', approvalAmount.toFixed(2));

const tiers = [
  { min: 0, max: 25000, rate: 0.08 },
  { min: 25000, max: 50000, rate: 0.06 },
  { min: 50000, max: 100000, rate: 0.04 },
  { min: 100000, max: 250000, rate: 0.02 },
  { min: 250000, max: null, rate: 0.01 }
];

let commission = 0;
for (const tier of tiers) {
  if (approvalAmount <= tier.min) break;

  const tierMax = tier.max || Infinity;
  if (approvalAmount > tier.min) {
    const amountInTier = Math.min(approvalAmount, tierMax) - tier.min;
    commission += amountInTier * tier.rate;
  }
}

const commissionWithGst = commission * 1.10;
console.log('Commission (ex GST):', commission.toFixed(2));
console.log('Commission (inc GST):', commissionWithGst.toFixed(2));
console.log('');

console.log('=== COMPARISON ===');
console.log('Angle Finance Shows:', '2655.62');
console.log('Our Calculation Shows:', payment.toFixed(2));
console.log('Difference:', (2655.62 - payment).toFixed(2));
console.log('');

console.log('=== NOTE ===');
console.log('If we were to add commission to the loan:');
const loanWithCommission = baseLoanAmount + commissionWithGst;
const powWithComm = Math.pow(1 + i, n);
let paymentWithComm = (loanWithCommission * i * powWithComm) / (powWithComm - 1);
if (config.paymentTiming === 'advance') {
  paymentWithComm = paymentWithComm / (1 + i);
}
console.log('Monthly Payment (with commission):', paymentWithComm.toFixed(2));
console.log('Difference from Angle:', (2655.62 - paymentWithComm).toFixed(2));
