// Test using the actual calculator logic to understand the discrepancy

const projectCostIncGst = 200000;
const gstRate = 0.10;
const commissionPercent = 0.022; // 2.2%
const applicationFeeExGst = 590; // $649 inc GST = $590 ex GST
const ppsrFeeExGst = 5.45; // $6 inc GST = $5.45 ex GST
const interestRate = 0.0949;
const termYears = 7; // 84 months
const commissionCapitalised = true;

console.log('=== Calculator Logic Test ===');
console.log('');

// Step 1: Calculate invoice ex-GST
const invoiceAmountExGst = projectCostIncGst / (1 + gstRate);
console.log('Invoice Amount (inc GST):', projectCostIncGst.toFixed(2));
console.log('Invoice Amount (ex GST):', invoiceAmountExGst.toFixed(2));
console.log('');

// Step 2: Calculate fees with GST
const applicationFee = applicationFeeExGst * (1 + gstRate);
const ppsrFee = ppsrFeeExGst * (1 + gstRate);

console.log('Application Fee (ex GST):', applicationFeeExGst.toFixed(2));
console.log('Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('PPSR Fee (ex GST):', ppsrFeeExGst.toFixed(2));
console.log('PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('');

// Step 3: Calculate commission
const commission = invoiceAmountExGst * commissionPercent;
const commissionWithGst = commission * (1 + gstRate);

console.log('Commission (ex GST):', commission.toFixed(2));
console.log('Commission (inc GST):', commissionWithGst.toFixed(2));
console.log('');

// Step 4: Build financed amount following calculator logic
let baseLoanAmount = invoiceAmountExGst;

// Add application fee and PPSR fee (with GST)
baseLoanAmount += applicationFee + ppsrFee;

console.log('=== Building Base Loan Amount ===');
console.log('Starting with invoice ex-GST:', invoiceAmountExGst.toFixed(2));
console.log('+ Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('+ PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('= Subtotal:', baseLoanAmount.toFixed(2));

// Add commission if capitalised
if (commissionCapitalised) {
  baseLoanAmount += commissionWithGst;
  console.log('+ Commission (inc GST):', commissionWithGst.toFixed(2));
}

console.log('= Total Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('');

// Step 5: Calculate monthly payment
const termMonths = termYears * 12;
const monthlyRate = interestRate / 12;
const n = termMonths;

const pow = Math.pow(1 + monthlyRate, n);
const paymentArrears = (baseLoanAmount * monthlyRate * pow) / (pow - 1);
const paymentAdvance = paymentArrears / (1 + monthlyRate);

console.log('=== Payment Calculation ===');
console.log('Term:', termMonths, 'months');
console.log('Interest Rate:', (interestRate * 100).toFixed(2) + '%');
console.log('Monthly Rate:', (monthlyRate * 100).toFixed(6) + '%');
console.log('Payment in Arrears:', paymentArrears.toFixed(2));
console.log('Payment in Advance:', paymentAdvance.toFixed(2));
console.log('');

console.log('=== Comparison ===');
console.log('Our calculation:', paymentAdvance.toFixed(2));
console.log('Portal shows:', '3021.90');
console.log('Difference:', (paymentAdvance - 3021.90).toFixed(2));
console.log('');

// Now test if portal doesn't add GST to commission
console.log('=== Alternative: Commission WITHOUT GST ===');
let baseLoanAmount2 = invoiceAmountExGst + applicationFee + ppsrFee;
if (commissionCapitalised) {
  baseLoanAmount2 += commission; // No GST on commission
}

console.log('Base Loan Amount (commission ex GST):', baseLoanAmount2.toFixed(2));

const pow2 = Math.pow(1 + monthlyRate, n);
const paymentArrears2 = (baseLoanAmount2 * monthlyRate * pow2) / (pow2 - 1);
const paymentAdvance2 = paymentArrears2 / (1 + monthlyRate);

console.log('Payment in Advance:', paymentAdvance2.toFixed(2));
console.log('Portal shows:', '3021.90');
console.log('Difference:', (paymentAdvance2 - 3021.90).toFixed(2));
