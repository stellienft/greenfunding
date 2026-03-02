// Test WITHOUT capitalising commission
const projectCostIncGst = 275000;
const gstRate = 0.1;

const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);
console.log('Invoice ex-GST:', invoiceAmountExGst);

const applicationFeeIncGst = 649;
const ppsrFeeIncGst = 6;
const applicationFee = applicationFeeIncGst / (1 + gstRate);
const ppsrFee = ppsrFeeIncGst / (1 + gstRate);

const originationFeeRate = 0.022;
const originationFee = invoiceAmountExGst * originationFeeRate;

// Build loan WITHOUT commission
let baseLoanAmount = invoiceAmountExGst;
baseLoanAmount += originationFee;
baseLoanAmount += applicationFee + ppsrFee;
// NOT adding commission

console.log('Base Loan Amount (no commission):', baseLoanAmount);

function calculateMonthlyPayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const n = years * 12;

  const pvFactor = (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
  const paymentArrears = principal / pvFactor;
  const paymentAdvance = paymentArrears / (1 + monthlyRate);

  return Math.ceil(paymentAdvance * 100) / 100;
}

const rate5Years = 0.0799;
const rate7Years = 0.0949;
const rate10Years = 0.0949;

const payment5 = calculateMonthlyPayment(baseLoanAmount, rate5Years, 5);
const payment7 = calculateMonthlyPayment(baseLoanAmount, rate7Years, 7);
const payment10 = calculateMonthlyPayment(baseLoanAmount, rate10Years, 10);

console.log(`\n5 years: $${payment5.toFixed(2)} (expected: $5,101.77)`);
console.log(`7 years: $${payment7.toFixed(2)} (expected: $4,106.91)`);
console.log(`10 years: $${payment10.toFixed(2)} (expected: $3,251.14)`);
