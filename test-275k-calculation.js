const projectCost = 275000;
const loanTermYears = 7;

console.log('=== Testing $275,000 Project Cost ===\n');

const gstRate = 0.1;
const applicationFeeIncGst = 649;
const ppsrFeeIncGst = 6;
const rateUsed = 0.0949;
const commissionPercentage = 0.01;

const invoiceAmountExGst = projectCost / (1 + gstRate);
console.log('1. Invoice Amount Ex-GST:', invoiceAmountExGst.toFixed(2));

const applicationFee = applicationFeeIncGst / (1 + gstRate);
const ppsrFee = ppsrFeeIncGst / (1 + gstRate);
console.log('2. Application Fee (ex-GST):', applicationFee.toFixed(2));
console.log('3. PPSR Fee (ex-GST):', ppsrFee.toFixed(2));

const originationFeeRate = 0.022;
const originationFee = invoiceAmountExGst * originationFeeRate;
console.log('4. Origination Fee (2.2%):', originationFee.toFixed(2));

let baseLoanAmount = invoiceAmountExGst;
baseLoanAmount += originationFee;
baseLoanAmount += applicationFee + ppsrFee;
console.log('5. Base Loan Amount (before commission):', baseLoanAmount.toFixed(2));

const approvalAmount = invoiceAmountExGst * 1.2;
console.log('6. Approval Amount:', approvalAmount.toFixed(2));

const commission = approvalAmount * commissionPercentage;
console.log('7. Commission (1% of approval):', commission.toFixed(2));

const commissionWithGst = commission * (1 + gstRate);
console.log('8. Commission with GST:', commissionWithGst.toFixed(2));

console.log('\n--- Is commission capitalised? ---');
const commissionCapitalised = false;
console.log('Commission Capitalised:', commissionCapitalised);

if (commissionCapitalised) {
  baseLoanAmount += commission;
  console.log('9. Final Loan Amount (with commission):', baseLoanAmount.toFixed(2));
} else {
  console.log('9. Final Loan Amount (no commission):', baseLoanAmount.toFixed(2));
}

console.log('\n=== Monthly Payment Calculation ===');
const n = loanTermYears * 12;
const i = rateUsed / 12;
const monthlyFee = 0;

console.log('Principal:', baseLoanAmount.toFixed(2));
console.log('Monthly Rate (i):', (i * 100).toFixed(6) + '%');
console.log('Number of Payments (n):', n);

const payment = (baseLoanAmount * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
console.log('Payment Formula Result:', payment.toFixed(2));

const paymentInAdvance = payment / (1 + i);
console.log('Payment in Advance:', paymentInAdvance.toFixed(2));

const paymentWithFee = paymentInAdvance + monthlyFee;
const roundedPayment = Math.ceil(paymentWithFee * 10) / 10;
console.log('Rounded Payment (to nearest $0.10):', roundedPayment.toFixed(2));

console.log('\n=== Expected vs Actual ===');
console.log('Expected (Portal):', '$3,251.14');
console.log('Current Calculator:', '$3,286.50');
console.log('Our Test Calculation:', '$' + roundedPayment.toFixed(2));

console.log('\n=== Let\'s test with commission capitalised ===');
const loanWithCommission = baseLoanAmount + commission;
console.log('Loan Amount with Commission:', loanWithCommission.toFixed(2));
const paymentWithComm = (loanWithCommission * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const paymentWithCommInAdvance = paymentWithComm / (1 + i);
const roundedPaymentWithComm = Math.ceil(paymentWithCommInAdvance * 10) / 10;
console.log('Monthly Payment (with comm capitalised):', '$' + roundedPaymentWithComm.toFixed(2));

console.log('\n=== Let\'s test backwards from $3,251.14 ===');
const targetPayment = 3251.14;
const targetPaymentInArrears = targetPayment * (1 + i);
const principal = (targetPaymentInArrears * (Math.pow(1 + i, n) - 1)) / (i * Math.pow(1 + i, n));
console.log('If payment is $3,251.14, the principal would be:', principal.toFixed(2));
console.log('Difference from our base loan:', (principal - baseLoanAmount).toFixed(2));
console.log('This difference is close to commission?', commission.toFixed(2));
