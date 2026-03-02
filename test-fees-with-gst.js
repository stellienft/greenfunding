// Test calculation with GST applied to application fee and PPSR fee

const projectCostIncGst = 160000;
const gstRate = 0.10;
const applicationFeeExGst = 649;
const ppsrFeeExGst = 6;
const originationFeePercent = 0.022;
const feeCapitalised = true;

// Step 1: Calculate ex-GST amount
const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);

console.log('=== Input Values ===');
console.log('Project Cost (inc GST):', projectCostIncGst.toFixed(2));
console.log('GST Rate:', (gstRate * 100).toFixed(0) + '%');
console.log('Application Fee (ex GST):', applicationFeeExGst.toFixed(2));
console.log('PPSR Fee (ex GST):', ppsrFeeExGst.toFixed(2));
console.log('Origination Fee %:', (originationFeePercent * 100).toFixed(2) + '%');
console.log('');

// Step 2: Apply GST to fees
const applicationFee = applicationFeeExGst * (1 + gstRate);
const ppsrFee = ppsrFeeExGst * (1 + gstRate);

console.log('=== Fees with GST ===');
console.log('Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('');

// Step 3: Calculate invoice amount ex-GST
console.log('=== Calculation Steps ===');
console.log('Invoice Amount Ex GST:', invoiceAmountExGst.toFixed(2));

// Step 4: Calculate origination fee
const originationFee = invoiceAmountExGst * originationFeePercent;
console.log('Origination Fee (2.2% of ex-GST):', originationFee.toFixed(2));

// Step 5: Calculate base loan amount
let baseLoanAmount = invoiceAmountExGst;

if (feeCapitalised) {
  baseLoanAmount += originationFee;
  console.log('Base Loan (after origination fee):', baseLoanAmount.toFixed(2));
}

baseLoanAmount += applicationFee + ppsrFee;
console.log('Base Loan (after app + PPSR fees inc GST):', baseLoanAmount.toFixed(2));

console.log('');
console.log('=== Final Base Loan Amount ===');
console.log('Invoice Ex GST:', invoiceAmountExGst.toFixed(2));
console.log('+ Origination Fee:', originationFee.toFixed(2));
console.log('+ Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('+ PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('= Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('');

// Step 6: Calculate monthly payment at 7.99% for 5 years
const annualRate = 0.0799;
const monthlyRate = annualRate / 12;
const months = 60;

const pow = Math.pow(1 + monthlyRate, months);
const monthlyPaymentArrears = (baseLoanAmount * monthlyRate * pow) / (pow - 1);
const monthlyPaymentAdvance = monthlyPaymentArrears / (1 + monthlyRate);

console.log('=== Monthly Payment (5 years at 7.99%) ===');
console.log('Payment in Arrears:', monthlyPaymentArrears.toFixed(2));
console.log('Payment in Advance:', monthlyPaymentAdvance.toFixed(2));
console.log('');

// Show the difference
const oldBaseLoan = invoiceAmountExGst + originationFee + applicationFeeExGst + ppsrFeeExGst;
const gstOnFees = (applicationFee - applicationFeeExGst) + (ppsrFee - ppsrFeeExGst);
console.log('=== GST Impact ===');
console.log('Old base loan (fees without GST):', oldBaseLoan.toFixed(2));
console.log('New base loan (fees with GST):', baseLoanAmount.toFixed(2));
console.log('Additional GST financed:', gstOnFees.toFixed(2));
