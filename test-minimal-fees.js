// Test with minimal fees to understand what's being financed
const projectCostIncGst = 275000;
const gstRate = 0.1;

const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);
console.log('Invoice ex-GST:', invoiceAmountExGst);

const originationFeeRate = 0.022;
const originationFee = invoiceAmountExGst * originationFeeRate;
console.log('Origination fee (2.2%):', originationFee);

// Try ONLY invoice + origination fee
let baseLoanAmount = invoiceAmountExGst + originationFee;
console.log('Loan = Invoice + Origination:', baseLoanAmount);

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

console.log(`\n5 years: $${payment5.toFixed(2)} (expected: $5,101.77)`);
console.log(`7 years: $${payment7.toFixed(2)} (expected: $4,106.91)`);
console.log(`10 years: $${payment10.toFixed(2)} (expected: $3,251.14)`);

console.log('\n--- Working backwards from expected payments ---');

function findPrincipal(monthlyPayment, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const n = years * 12;

  const paymentArrears = monthlyPayment * (1 + monthlyRate);
  const pvFactor = (1 - Math.pow(1 + monthlyRate, -n)) / monthlyRate;
  const principal = paymentArrears * pvFactor;

  return principal;
}

const principal5 = findPrincipal(5101.77, 0.0799, 5);
const principal7 = findPrincipal(4106.91, 0.0949, 7);
const principal10 = findPrincipal(3251.14, 0.0949, 10);

console.log(`Principal for 5yr @ $5,101.77: $${principal5.toFixed(2)}`);
console.log(`Principal for 7yr @ $4,106.91: $${principal7.toFixed(2)}`);
console.log(`Principal for 10yr @ $3,251.14: $${principal10.toFixed(2)}`);

console.log('\n--- What would this mean? ---');
const avgPrincipal = (principal5 + principal7 + principal10) / 3;
console.log(`Average principal: $${avgPrincipal.toFixed(2)}`);
console.log(`Invoice ex-GST: $${invoiceAmountExGst.toFixed(2)}`);
console.log(`Difference: $${(avgPrincipal - invoiceAmountExGst).toFixed(2)}`);
console.log(`As % of invoice: ${((avgPrincipal - invoiceAmountExGst) / invoiceAmountExGst * 100).toFixed(2)}%`);
