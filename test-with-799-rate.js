// Test calculation with 7.99% rate for $275,000 over 10 years

const GST_RATE = 0.10;
const PROJECT_COST_INC_GST = 275000;
const INVOICE_EX_GST = PROJECT_COST_INC_GST / (1 + GST_RATE);
const APPLICATION_FEE_INC_GST = 649;
const PPSR_FEE_INC_GST = 6;
const APPLICATION_FEE_EX_GST = APPLICATION_FEE_INC_GST / (1 + GST_RATE);
const PPSR_FEE_EX_GST = PPSR_FEE_INC_GST / (1 + GST_RATE);
const ORIGINATION_FEE_PERCENT = 0.022;
const ANNUAL_RATE = 0.0799; // Correct rate for $275k
const LOAN_TERM_YEARS = 10;

console.log('=== Testing $275,000 at 7.99% for 10 Years ===\n');

console.log('1. Invoice Amount Ex-GST:', INVOICE_EX_GST.toFixed(2));
console.log('2. Application Fee (ex-GST):', APPLICATION_FEE_EX_GST.toFixed(2));
console.log('3. PPSR Fee (ex-GST):', PPSR_FEE_EX_GST.toFixed(2));

const originationFee = INVOICE_EX_GST * ORIGINATION_FEE_PERCENT;
console.log('4. Origination Fee (2.2%):', originationFee.toFixed(2));

const principal = INVOICE_EX_GST + APPLICATION_FEE_EX_GST + PPSR_FEE_EX_GST + originationFee;
console.log('5. Total Principal:', principal.toFixed(2));

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
console.log('Rounded Payment:', roundedPayment.toFixed(2));

console.log('\n=== Expected vs Actual ===');
console.log('Expected: $3,251.15');
console.log('Our Calculation: $' + roundedPayment.toFixed(2));
console.log('Difference: $' + (roundedPayment - 3251.15).toFixed(2));

// Check if it's the rounding
const roundedPayment2 = Math.round(paymentAdvance * 100) / 100;
console.log('\nIf rounded to nearest cent:', roundedPayment2.toFixed(2));

const roundedPayment3 = Math.ceil(paymentAdvance * 100) / 100;
console.log('If ceiling to nearest cent:', roundedPayment3.toFixed(2));

const roundedPayment4 = Math.floor(paymentAdvance * 100) / 100;
console.log('If floor to nearest cent:', roundedPayment4.toFixed(2));
