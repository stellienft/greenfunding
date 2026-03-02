// Test calculation with commission including GST

const projectCostIncGst = 160000;
const gstRate = 0.10;
const applicationFeeExGst = 649;
const ppsrFeeExGst = 6;
const originationFeePercent = 0.022;
const feeCapitalised = true;
const commissionRate = 0.22; // 22%
const commissionCapitalised = true;

// Step 1: Calculate ex-GST amount
const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);

console.log('=== Input Values ===');
console.log('Project Cost (inc GST):', projectCostIncGst.toFixed(2));
console.log('GST Rate:', (gstRate * 100).toFixed(0) + '%');
console.log('Commission Rate:', (commissionRate * 100).toFixed(0) + '%');
console.log('');

// Step 2: Calculate approval amount (assuming 1:1 for simplicity)
const approvalAmount = invoiceAmountExGst;

console.log('=== Commission Calculation ===');
console.log('Approval Amount:', approvalAmount.toFixed(2));

// Step 3: Calculate commission
const commissionExGst = approvalAmount * commissionRate;
const commissionIncGst = commissionExGst * (1 + gstRate);

console.log('Commission (ex GST):', commissionExGst.toFixed(2));
console.log('Commission GST:', (commissionIncGst - commissionExGst).toFixed(2));
console.log('Commission (inc GST):', commissionIncGst.toFixed(2));
console.log('');

// Step 4: Apply GST to other fees
const applicationFee = applicationFeeExGst * (1 + gstRate);
const ppsrFee = ppsrFeeExGst * (1 + gstRate);

console.log('=== All Fees with GST ===');
console.log('Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('');

// Step 5: Calculate origination fee
const originationFee = invoiceAmountExGst * originationFeePercent;
console.log('=== Origination Fee ===');
console.log('Origination Fee (2.2% of ex-GST):', originationFee.toFixed(2));
console.log('');

// Step 6: Calculate base loan amount
let baseLoanAmount = invoiceAmountExGst;

if (feeCapitalised) {
  baseLoanAmount += originationFee;
}

baseLoanAmount += applicationFee + ppsrFee;

if (commissionCapitalised) {
  baseLoanAmount += commissionIncGst;
}

console.log('=== Final Base Loan Amount ===');
console.log('Invoice Ex GST:', invoiceAmountExGst.toFixed(2));
console.log('+ Origination Fee:', originationFee.toFixed(2));
console.log('+ Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('+ PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('+ Commission (inc GST):', commissionIncGst.toFixed(2));
console.log('= Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('');

// Step 7: Calculate monthly payment at 7.99% for 5 years
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

// Show the GST impact
const totalGST = (commissionIncGst - commissionExGst) + (applicationFee - applicationFeeExGst) + (ppsrFee - ppsrFeeExGst);
console.log('=== Total GST Financed ===');
console.log('GST on Commission:', (commissionIncGst - commissionExGst).toFixed(2));
console.log('GST on Application Fee:', (applicationFee - applicationFeeExGst).toFixed(2));
console.log('GST on PPSR Fee:', (ppsrFee - ppsrFeeExGst).toFixed(2));
console.log('Total GST Financed:', totalGST.toFixed(2));
