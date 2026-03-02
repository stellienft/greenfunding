// Test if application and PPSR fees are NOT capitalised

const GST_RATE = 0.10;
const PROJECT_COST_INC_GST = 275000;
const INVOICE_EX_GST = PROJECT_COST_INC_GST / (1 + GST_RATE);
const ORIGINATION_FEE_PERCENT = 0.022;
const ANNUAL_RATE = 0.0949;
const LOAN_TERM_YEARS = 10;

console.log('=== Testing WITHOUT Application & PPSR Fees Capitalised ===\n');

console.log('1. Invoice Amount Ex-GST:', INVOICE_EX_GST.toFixed(2));

const originationFee = INVOICE_EX_GST * ORIGINATION_FEE_PERCENT;
console.log('2. Origination Fee (2.2%):', originationFee.toFixed(2));

// Only invoice + origination fee financed
const principal = INVOICE_EX_GST + originationFee;
console.log('3. Total Principal (no app/PPSR fees):', principal.toFixed(2));

const n = LOAN_TERM_YEARS * 12;
const i = ANNUAL_RATE / 12;

console.log('\n=== Monthly Payment Calculation ===');
console.log('Monthly Rate (i):', (i * 100).toFixed(6) + '%');
console.log('Number of Payments (n):', n);

const paymentArrears = (principal * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
console.log('Payment (arrears):', paymentArrears.toFixed(2));

const paymentAdvance = paymentArrears / (1 + i);
console.log('Payment (in advance):', paymentAdvance.toFixed(2));

const roundedPayment = Math.ceil(paymentAdvance * 10) / 10;
console.log('Rounded Payment (to $0.10):', roundedPayment.toFixed(2));

console.log('\n=== Expected vs Actual ===');
console.log('Expected: $3,251.15');
console.log('Our Calculation: $' + roundedPayment.toFixed(2));
console.log('Difference: $' + (roundedPayment - 3251.15).toFixed(2));

// Try different rounding
console.log('\n=== Testing Different Rounding Methods ===');
const roundedCent = Math.ceil(paymentAdvance * 100) / 100;
console.log('Rounded to cent:', roundedCent.toFixed(2));

const rounded5cent = Math.ceil(paymentAdvance * 20) / 20;
console.log('Rounded to 5 cents:', rounded5cent.toFixed(2));

const roundNormal = Math.round(paymentAdvance * 100) / 100;
console.log('Normal rounding to cent:', roundNormal.toFixed(2));
