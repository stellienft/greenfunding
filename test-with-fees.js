// Test calculation with application fee and PPSR fee included

// Simulate the calculator logic
const projectCostIncGst = 160000;
const gstRate = 0.10;
const applicationFee = 649;
const ppsrFee = 6;
const originationFeePercent = 0.022;
const feeCapitalised = true;

// Step 1: Calculate ex-GST amount
const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);

console.log('=== Input Values ===');
console.log('Project Cost (inc GST):', projectCostIncGst.toFixed(2));
console.log('GST Rate:', (gstRate * 100).toFixed(0) + '%');
console.log('Application Fee:', applicationFee.toFixed(2));
console.log('PPSR Fee:', ppsrFee.toFixed(2));
console.log('Origination Fee %:', (originationFeePercent * 100).toFixed(2) + '%');
console.log('');

// Step 2: Calculate invoice amount ex-GST
console.log('=== Calculation Steps ===');
console.log('Invoice Amount Ex GST:', invoiceAmountExGst.toFixed(2));

// Step 3: Calculate origination fee
const originationFee = invoiceAmountExGst * originationFeePercent;
console.log('Origination Fee (2.2% of ex-GST):', originationFee.toFixed(2));

// Step 4: Calculate base loan amount
let baseLoanAmount = invoiceAmountExGst;

if (feeCapitalised) {
  baseLoanAmount += originationFee;
  console.log('Base Loan (after origination fee):', baseLoanAmount.toFixed(2));
}

baseLoanAmount += applicationFee + ppsrFee;
console.log('Base Loan (after app + PPSR fees):', baseLoanAmount.toFixed(2));

console.log('');
console.log('=== Final Base Loan Amount ===');
console.log('Invoice Ex GST:', invoiceAmountExGst.toFixed(2));
console.log('+ Origination Fee:', originationFee.toFixed(2));
console.log('+ Application Fee:', applicationFee.toFixed(2));
console.log('+ PPSR Fee:', ppsrFee.toFixed(2));
console.log('= Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('');

// Step 5: Calculate monthly payment at 7.99% for 5 years
const annualRate = 0.0799;
const monthlyRate = annualRate / 12;
const months = 60;

const pow = Math.pow(1 + monthlyRate, months);
const monthlyPaymentArrears = (baseLoanAmount * monthlyRate * pow) / (pow - 1);
const monthlyPaymentAdvance = monthlyPaymentArrears / (1 + monthlyRate);

console.log('=== Monthly Payment (5 years at 7.99%) ===');
console.log('Payment in Arrears:', monthlyPaymentArrears.toFixed(2));
console.log('Payment in Advance:', monthlyPaymentAdvance.toFixed(2));
