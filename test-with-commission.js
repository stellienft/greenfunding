// Test if adding commission explains the difference
const projectCost = 145720.45;
const originationFeeRate = 0.022;
const annualRate = 0.0949;
const paymentTiming = 'advance';
const loanTermYears = 7;

// Calculate origination fee and base loan
const originationFee = projectCost * originationFeeRate;
const baseLoanAmount = projectCost + originationFee;

console.log('Project Cost:', projectCost.toFixed(2));
console.log('Origination Fee:', originationFee.toFixed(2));
console.log('Base Loan Amount (no commission):', baseLoanAmount.toFixed(2));

// Calculate approval amount (assuming 110% multiplier from config)
const approvalMultiplier = 1.1;
const approvalAmount = projectCost * approvalMultiplier;
console.log('\nApproval Amount:', approvalAmount.toFixed(2));

// Calculate commission using tiered structure
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

const gstRate = 0.10;
const commissionWithGst = commission * (1 + gstRate);

console.log('Commission (ex GST):', commission.toFixed(2));
console.log('Commission (inc GST):', commissionWithGst.toFixed(2));

// Now calculate with commission added to loan
const loanWithCommission = baseLoanAmount + commissionWithGst;
console.log('\n--- IF COMMISSION IS ADDED TO LOAN ---');
console.log('Loan Amount + Commission:', loanWithCommission.toFixed(2));

// Calculate monthly payment WITH commission
const n = loanTermYears * 12;
const i = annualRate / 12;
const pow = Math.pow(1 + i, n);
let paymentWithCommission = (loanWithCommission * i * pow) / (pow - 1);

if (paymentTiming === 'advance') {
  paymentWithCommission = paymentWithCommission / (1 + i);
}

console.log('Monthly Payment (with commission):', paymentWithCommission.toFixed(2));

// Calculate monthly payment WITHOUT commission (baseline)
let paymentWithoutCommission = (baseLoanAmount * i * pow) / (pow - 1);
if (paymentTiming === 'advance') {
  paymentWithoutCommission = paymentWithoutCommission / (1 + i);
}

console.log('Monthly Payment (no commission):', paymentWithoutCommission.toFixed(2));

console.log('\n--- COMPARISON ---');
console.log('Your App Shows:', '2467.00');
console.log('Angle Finance Shows:', '2655.62');
console.log('Calculated (no commission):', paymentWithoutCommission.toFixed(2));
console.log('Calculated (with commission):', paymentWithCommission.toFixed(2));
console.log('\nDifference if commission added:', (paymentWithCommission - paymentWithoutCommission).toFixed(2));
