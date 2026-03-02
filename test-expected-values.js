// Test to verify expected monthly payments match requirements
// For a $275,000 project cost (inc GST):
// 5 years should be $5,101.77
// 7 years should be $4,106.91
// 10 years should be $3,251.14

const projectCostIncGst = 275000;
const gstRate = 0.1;

// Step 1: Calculate ex-GST
const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);
console.log('Invoice ex-GST:', invoiceAmountExGst);

// Step 2: Add application fee ($649) + PPSR fee ($6) - both inc GST, need ex-GST
const applicationFeeIncGst = 649;
const ppsrFeeIncGst = 6;
const applicationFee = applicationFeeIncGst / (1 + gstRate);
const ppsrFee = ppsrFeeIncGst / (1 + gstRate);
console.log('Application fee ex-GST:', applicationFee);
console.log('PPSR fee ex-GST:', ppsrFee);

// Step 3: Calculate origination fee (2.2% of ex-GST invoice)
const originationFeeRate = 0.022;
const originationFee = invoiceAmountExGst * originationFeeRate;
console.log('Origination fee:', originationFee);

// Step 4: Calculate approval amount (1.2x multiplier)
const approvalMultiplier = 1.2;
const approvalAmount = invoiceAmountExGst * approvalMultiplier;
console.log('Approval amount:', approvalAmount);

// Step 5: Calculate commission using tiers
// Tiers: 0-25k @ 8%, 25k-50k @ 6%, 50k-100k @ 4%, 100k-250k @ 2.2%, 250k+ @ 1%
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
    console.log(`Tier ${tierMin}-${tierMax}: ${amountInTier} @ ${tier.rate * 100}% = ${tierCommission}`);
  }
}

console.log('Total commission (ex-GST):', commission);
console.log('Commission with GST:', commission * (1 + gstRate));

// Step 6: Build the loan amount
let baseLoanAmount = invoiceAmountExGst;
baseLoanAmount += originationFee; // Capitalised
baseLoanAmount += applicationFee + ppsrFee;
baseLoanAmount += commission; // Capitalised (ex-GST)

console.log('\n=== Base Loan Amount ===');
console.log('Total loan amount:', baseLoanAmount);

// Step 7: Calculate monthly payments for different terms
function calculateMonthlyPayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const n = years * 12;

  if (monthlyRate === 0) {
    return principal / n;
  }

  // Standard amortization formula (payment in advance)
  const pvFactor = (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
  const paymentArrears = principal / pvFactor;
  const paymentAdvance = paymentArrears / (1 + monthlyRate);

  return Math.ceil(paymentAdvance * 100) / 100;
}

console.log('\n=== Monthly Payments ===');
const rate5Years = 0.0799;
const rate7Years = 0.0949;
const rate10Years = 0.0949;

const payment5 = calculateMonthlyPayment(baseLoanAmount, rate5Years, 5);
const payment7 = calculateMonthlyPayment(baseLoanAmount, rate7Years, 7);
const payment10 = calculateMonthlyPayment(baseLoanAmount, rate10Years, 10);

console.log(`5 years @ ${rate5Years * 100}%: $${payment5.toFixed(2)} (expected: $5,101.77)`);
console.log(`7 years @ ${rate7Years * 100}%: $${payment7.toFixed(2)} (expected: $4,106.91)`);
console.log(`10 years @ ${rate10Years * 100}%: $${payment10.toFixed(2)} (expected: $3,251.14)`);

console.log('\n=== Differences ===');
console.log(`5 years diff: $${(payment5 - 5101.77).toFixed(2)}`);
console.log(`7 years diff: $${(payment7 - 4106.91).toFixed(2)}`);
console.log(`10 years diff: $${(payment10 - 3251.14).toFixed(2)}`);
