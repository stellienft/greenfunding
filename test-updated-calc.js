const projectCostIncGST = 275000;
const gstRate = 0.10;

console.log('=== CALCULATION TEST ===\n');
console.log('Input: $' + projectCostIncGST.toFixed(2) + ' (inc GST)');

const invoiceExGST = projectCostIncGST / (1 + gstRate);
console.log('Invoice ex-GST: $' + invoiceExGST.toFixed(2));

const appFeeIncGST = 649;
const ppsrFeeIncGST = 6;
const appFeeExGST = appFeeIncGST / (1 + gstRate);
const ppsrFeeExGST = ppsrFeeIncGST / (1 + gstRate);

console.log('\nFees (inc GST → ex GST):');
console.log('  Application: $' + appFeeIncGST + ' → $' + appFeeExGST.toFixed(2));
console.log('  PPSR: $' + ppsrFeeIncGST + ' → $' + ppsrFeeExGST.toFixed(2));

const originationFee = invoiceExGST * 0.01;
console.log('  Origination (1%): $' + originationFee.toFixed(2));

const baseLoanExGST = invoiceExGST + originationFee + appFeeExGST + ppsrFeeExGST;
console.log('\nBase Loan (ex GST): $' + baseLoanExGST.toFixed(2));

const approvalAmount = invoiceExGST * 1.2;
console.log('\nApproval Amount: $' + approvalAmount.toFixed(2));

console.log('\nCommission Tiers:');
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
    console.log('  $' + tier.min + '-$' + (tier.max === Infinity ? '∞' : tier.max) +
                ': $' + amountInTier.toFixed(2) + ' @ ' + (tier.rate * 100).toFixed(2) + '% = $' + tierCommission.toFixed(2));
  }
}

console.log('\nTotal Commission (ex GST): $' + commission.toFixed(2));
console.log('Commission with GST: $' + (commission * 1.1).toFixed(2));

console.log('\n=== FINAL AMOUNTS ===');
console.log('Loan (ex GST, no commission): $' + baseLoanExGST.toFixed(2));
console.log('Loan (ex GST, with commission): $' + (baseLoanExGST + commission).toFixed(2));

console.log('\n=== MONTHLY PAYMENTS ===');
const rates = [
  { years: 5, rate: 0.0799 },
  { years: 7, rate: 0.0949 },
  { years: 10, rate: 0.0949 }
];

for (const { years, rate } of rates) {
  const n = years * 12;
  const i = rate / 12;
  const paymentArrears = (baseLoanExGST * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  const paymentAdvance = paymentArrears / (1 + i);
  const payment = Math.round(paymentAdvance * 100) / 100;

  console.log(years + ' years @ ' + (rate * 100).toFixed(2) + '%: $' + payment.toFixed(2));
}
