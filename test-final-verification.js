// Final verification test with updated calculation logic
const projectCostIncGst = 275000;
const gstRate = 0.1;

console.log('=== CALCULATION BREAKDOWN ===\n');

// Step 1: Calculate ex-GST
const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);
console.log('1. Project cost (inc GST):', projectCostIncGst);
console.log('   Invoice ex-GST:', invoiceAmountExGst.toFixed(2));

// Step 2: Origination fee (1% of ex-GST)
const originationFeeRate = 0.01;
const originationFee = invoiceAmountExGst * originationFeeRate;
console.log('\n2. Origination fee (1% of ex-GST):', originationFee.toFixed(2));

// Step 3: Application and PPSR fees (inc-GST amounts)
const applicationFee = 649;
const ppsrFee = 6;
console.log('\n3. Application fee (inc GST):', applicationFee);
console.log('   PPSR fee (inc GST):', ppsrFee);

// Step 4: Build base loan amount
let baseLoanAmount = invoiceAmountExGst;
baseLoanAmount += originationFee;
baseLoanAmount += applicationFee + ppsrFee;

console.log('\n=== BASE LOAN AMOUNT ===');
console.log('Invoice ex-GST:         ', invoiceAmountExGst.toFixed(2));
console.log('+ Origination fee:      ', originationFee.toFixed(2));
console.log('+ Application fee:      ', applicationFee.toFixed(2));
console.log('+ PPSR fee:             ', ppsrFee.toFixed(2));
console.log('--------------------------------');
console.log('Total loan amount:      ', baseLoanAmount.toFixed(2));

// Step 5: Calculate approval amount
const approvalMultiplier = 1.2;
const approvalAmount = invoiceAmountExGst * approvalMultiplier;
console.log('\n=== COMMISSION CALCULATION ===');
console.log('Approval amount (1.2x):', approvalAmount.toFixed(2));

// Calculate commission using tiers
let commission = 0;
const tiers = [
  { min: 0, max: 25000, rate: 0.08 },
  { min: 25000, max: 50000, rate: 0.06 },
  { min: 50000, max: 100000, rate: 0.04 },
  { min: 100000, max: 250000, rate: 0.022 },
  { min: 250000, max: null, rate: 0.01 }
];

for (const tier of tiers) {
  if (approvalAmount <= tier.min) break;

  const tierMin = tier.min;
  const tierMax = tier.max || Infinity;

  if (approvalAmount > tierMin) {
    const amountInTier = Math.min(approvalAmount, tierMax) - tierMin;
    const tierCommission = amountInTier * tier.rate;
    commission += tierCommission;
    console.log(`  Tier $${tierMin.toLocaleString()}-${tierMax === Infinity ? '∞' : '$' + tierMax.toLocaleString()}: $${amountInTier.toFixed(2)} @ ${(tier.rate * 100).toFixed(2)}% = $${tierCommission.toFixed(2)}`);
  }
}

console.log('Total commission (ex-GST):', commission.toFixed(2));
console.log('Commission with GST:      ', (commission * (1 + gstRate)).toFixed(2));
console.log('\n** Commission is NOT capitalised (not added to loan) **');

// Step 6: Calculate monthly payments
function calculateMonthlyPayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const n = years * 12;

  const pvFactor = (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
  const paymentArrears = principal / pvFactor;
  const paymentAdvance = paymentArrears / (1 + monthlyRate);

  return Math.ceil(paymentAdvance * 100) / 100;
}

console.log('\n=== MONTHLY PAYMENTS ===');
const rate5Years = 0.0799;
const rate7Years = 0.0949;
const rate10Years = 0.0949;

const payment5 = calculateMonthlyPayment(baseLoanAmount, rate5Years, 5);
const payment7 = calculateMonthlyPayment(baseLoanAmount, rate7Years, 7);
const payment10 = calculateMonthlyPayment(baseLoanAmount, rate10Years, 10);

console.log(`5 years @ ${(rate5Years * 100).toFixed(2)}%:  $${payment5.toFixed(2)} (expected: $5,101.77) - diff: $${(payment5 - 5101.77).toFixed(2)}`);
console.log(`7 years @ ${(rate7Years * 100).toFixed(2)}%:  $${payment7.toFixed(2)} (expected: $4,106.91) - diff: $${(payment7 - 4106.91).toFixed(2)}`);
console.log(`10 years @ ${(rate10Years * 100).toFixed(2)}%: $${payment10.toFixed(2)} (expected: $3,251.14) - diff: $${(payment10 - 3251.14).toFixed(2)}`);

console.log('\n=== VERIFICATION ===');
if (Math.abs(payment5 - 5101.77) < 5 && Math.abs(payment7 - 4106.91) < 5 && Math.abs(payment10 - 3251.14) < 5) {
  console.log('✓ All calculations within $5 of expected values');
} else {
  console.log('✗ Calculations do not match expected values');
}
