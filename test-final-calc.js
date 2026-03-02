const projectCostIncGST = 275000;
const gstRate = 0.10;

console.log('=== CORRECTED CALCULATION ===\n');
console.log('1. Project cost (inc GST): $' + projectCostIncGST.toLocaleString());

const invoiceExGST = projectCostIncGST / (1 + gstRate);
console.log('2. Invoice (ex GST): $' + invoiceExGST.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));

const originationFee = invoiceExGST * 0.01;
console.log('3. Origination fee (1%): $' + originationFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));

const appFeeIncGST = 649;
const ppsrFeeIncGST = 6;
console.log('4. Application fee (inc GST): $' + appFeeIncGST);
console.log('   PPSR fee (inc GST): $' + ppsrFeeIncGST);

const baseLoanAmount = invoiceExGST + originationFee + appFeeIncGST + ppsrFeeIncGST;
console.log('\nBase Loan Amount: $' + baseLoanAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
console.log('  = $' + invoiceExGST.toFixed(2) + ' (invoice ex-GST)');
console.log('  + $' + originationFee.toFixed(2) + ' (origination)');
console.log('  + $' + appFeeIncGST + ' (app fee inc-GST)');
console.log('  + $' + ppsrFeeIncGST + ' (PPSR fee inc-GST)');

const approvalAmount = invoiceExGST * 1.2;
console.log('\n5. Approval amount: $' + approvalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));

console.log('\n6. Commission calculation:');
const tiers = [
  { min: 0, max: 25000, rate: 0.08 },
  { min: 25000, max: 50000, rate: 0.06 },
  { min: 50000, max: 100000, rate: 0.04 },
  { min: 100000, max: 250000, rate: 0.022 },
  { min: 250000, max: Infinity, rate: 0.01 }
];

let commission = 0;
for (const tier of tiers) {
  if (approvalAmount > tier.min) {
    const amountInTier = Math.min(approvalAmount, tier.max) - tier.min;
    const tierCommission = amountInTier * tier.rate;
    commission += tierCommission;
    console.log('   Tier $' + tier.min.toLocaleString() + '-$' + (tier.max === Infinity ? '∞' : tier.max.toLocaleString()) +
                ': $' + amountInTier.toFixed(2) + ' @ ' + (tier.rate * 100).toFixed(2) + '% = $' + tierCommission.toFixed(2));
  }
}

const commissionWithGST = commission * (1 + gstRate);
console.log('\n   Commission (ex-GST): $' + commission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
console.log('   Commission (inc-GST): $' + commissionWithGST.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));

const finalLoanWithCommission = baseLoanAmount + commissionWithGST;
console.log('\n=== FINAL LOAN AMOUNTS ===');
console.log('Without commission: $' + baseLoanAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
console.log('With commission (inc-GST): $' + finalLoanWithCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));

console.log('\n=== MONTHLY PAYMENTS (7 years @ 9.49%) ===');
const years = 7;
const rate = 0.0949;
const n = years * 12;
const i = rate / 12;

// Without commission
const paymentWithoutCommArrears = (baseLoanAmount * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const paymentWithoutCommAdvance = paymentWithoutCommArrears / (1 + i);
console.log('Without commission: $' + (Math.round(paymentWithoutCommAdvance * 100) / 100).toFixed(2));

// With commission
const paymentWithCommArrears = (finalLoanWithCommission * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const paymentWithCommAdvance = paymentWithCommArrears / (1 + i);
console.log('With commission: $' + (Math.round(paymentWithCommAdvance * 100) / 100).toFixed(2));

console.log('\n=== BREAKDOWN ===');
console.log('✓ Input is inc-GST');
console.log('✓ Calculations based on ex-GST invoice');
console.log('✓ Application & PPSR fees added as inc-GST');
console.log('✓ Commission calculated on approval amount');
console.log('✓ Commission added WITH GST');
