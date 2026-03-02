// Test with 1% origination fee
const projectCostIncGst = 275000;
const gstRate = 0.1;

const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);
console.log('Invoice ex-GST:', invoiceAmountExGst);

// 1% origination fee
const originationFeeRate = 0.01;
const originationFee = invoiceAmountExGst * originationFeeRate;
console.log('Origination fee (1%):', originationFee);

// Application + PPSR fees (inc GST)
const applicationFeeIncGst = 649;
const ppsrFeeIncGst = 6;
console.log('Application fee (inc GST):', applicationFeeIncGst);
console.log('PPSR fee (inc GST):', ppsrFeeIncGst);

// Build loan with inc-GST fees
let baseLoanAmount = invoiceAmountExGst;
baseLoanAmount += originationFee;
baseLoanAmount += applicationFeeIncGst + ppsrFeeIncGst;

console.log('\nBase Loan Amount:', baseLoanAmount);

function calculateMonthlyPayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const n = years * 12;

  const pvFactor = (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
  const paymentArrears = principal / pvFactor;
  const paymentAdvance = paymentArrears / (1 + monthlyRate);

  return Math.ceil(paymentAdvance * 100) / 100;
}

const payment5 = calculateMonthlyPayment(baseLoanAmount, 0.0799, 5);
const payment7 = calculateMonthlyPayment(baseLoanAmount, 0.0949, 7);
const payment10 = calculateMonthlyPayment(baseLoanAmount, 0.0949, 10);

console.log(`\n5 years: $${payment5.toFixed(2)} (expected: $5,101.77) - diff: $${(payment5 - 5101.77).toFixed(2)}`);
console.log(`7 years: $${payment7.toFixed(2)} (expected: $4,106.91) - diff: $${(payment7 - 4106.91).toFixed(2)}`);
console.log(`10 years: $${payment10.toFixed(2)} (expected: $3,251.14) - diff: $${(payment10 - 3251.14).toFixed(2)}`);
