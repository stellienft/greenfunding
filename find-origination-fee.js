// Find the origination fee that gives $3,251.15

const GST_RATE = 0.10;
const PROJECT_COST_INC_GST = 275000;
const INVOICE_EX_GST = PROJECT_COST_INC_GST / (1 + GST_RATE);
const ANNUAL_RATE = 0.0949;
const LOAN_TERM_YEARS = 10;
const TARGET_PAYMENT = 3251.15;

const n = LOAN_TERM_YEARS * 12;
const i = ANNUAL_RATE / 12;

// Work backwards from payment to principal
const arrearsEquivalent = TARGET_PAYMENT * (1 + i);
const principalNeeded = arrearsEquivalent * (Math.pow(1 + i, n) - 1) / (i * Math.pow(1 + i, n));

console.log('=== Finding Origination Fee for $3,251.15 ===\n');
console.log('Target Payment:', TARGET_PAYMENT);
console.log('Principal Needed:', principalNeeded.toFixed(2));
console.log('Invoice Ex-GST:', INVOICE_EX_GST.toFixed(2));

const originationFeeAmount = principalNeeded - INVOICE_EX_GST;
const originationPercent = originationFeeAmount / INVOICE_EX_GST;

console.log('\nOrigination Fee Amount:', originationFeeAmount.toFixed(2));
console.log('Origination Fee %:', (originationPercent * 100).toFixed(4) + '%');

// Verify
const testPrincipal = INVOICE_EX_GST + originationFeeAmount;
const testPaymentArrears = (testPrincipal * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const testPaymentAdvance = testPaymentArrears / (1 + i);
const testRounded = Math.ceil(testPaymentAdvance * 10) / 10;

console.log('\n=== Verification ===');
console.log('Calculated Payment:', testRounded.toFixed(2));
console.log('Target Payment:', TARGET_PAYMENT);
console.log('Match:', testRounded === TARGET_PAYMENT ? 'YES' : 'NO');

// Also test with rounding to cent
const testRoundedCent = Math.ceil(testPaymentAdvance * 100) / 100;
console.log('\nIf rounded to cent:', testRoundedCent.toFixed(2));
