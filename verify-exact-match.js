// Verify exact match with current settings but different rounding

const GST_RATE = 0.10;
const PROJECT_COST_INC_GST = 275000;
const INVOICE_EX_GST = PROJECT_COST_INC_GST / (1 + GST_RATE);
const ORIGINATION_FEE_PERCENT = 0.022;
const ANNUAL_RATE = 0.0949;
const LOAN_TERM_YEARS = 10;

console.log('=== Test 1: Current settings (2.2% origination, no app/PPSR fees) ===\n');

const principal1 = INVOICE_EX_GST * (1 + ORIGINATION_FEE_PERCENT);
console.log('Principal:', principal1.toFixed(2));

const n = LOAN_TERM_YEARS * 12;
const i = ANNUAL_RATE / 12;

const paymentArrears1 = (principal1 * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const paymentAdvance1 = paymentArrears1 / (1 + i);

console.log('Payment (advance, unrounded):', paymentAdvance1);
console.log('Rounded to $0.10:', Math.ceil(paymentAdvance1 * 10) / 10);
console.log('Rounded to cent:', Math.ceil(paymentAdvance1 * 100) / 100);
console.log('Normal round to cent:', Math.round(paymentAdvance1 * 100) / 100);

console.log('\n=== Test 2: With 1.3388% origination ===\n');

const principal2 = INVOICE_EX_GST * 1.013388;
console.log('Principal:', principal2.toFixed(2));

const paymentArrears2 = (principal2 * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const paymentAdvance2 = paymentArrears2 / (1 + i);

console.log('Payment (advance, unrounded):', paymentAdvance2);
console.log('Rounded to cent (ceil):', Math.ceil(paymentAdvance2 * 100) / 100);
console.log('Normal round to cent:', Math.round(paymentAdvance2 * 100) / 100);

console.log('\n=== QUESTION: What gives exactly $3,251.15? ===');
console.log('Target: 3251.15');
