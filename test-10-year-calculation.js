// Test calculation for $275,000 over 10 years at 9.49%

const GST_RATE = 0.10;
const PROJECT_COST_INC_GST = 275000;
const INVOICE_EX_GST = PROJECT_COST_INC_GST / (1 + GST_RATE);
const APPLICATION_FEE_INC_GST = 649;
const PPSR_FEE_INC_GST = 6;
const APPLICATION_FEE_EX_GST = APPLICATION_FEE_INC_GST / (1 + GST_RATE);
const PPSR_FEE_EX_GST = PPSR_FEE_INC_GST / (1 + GST_RATE);
const ORIGINATION_FEE_PERCENT = 0.022;
const ANNUAL_RATE = 0.0949;
const LOAN_TERM_YEARS = 10;
const COMMISSION_RATE = 0.01;
const APPROVAL_MULTIPLIER = 1.2;

console.log('=== Testing $275,000 Project Cost - 10 Years ===\n');

console.log('1. Invoice Amount Ex-GST:', INVOICE_EX_GST.toFixed(2));
console.log('2. Application Fee (ex-GST):', APPLICATION_FEE_EX_GST.toFixed(2));
console.log('3. PPSR Fee (ex-GST):', PPSR_FEE_EX_GST.toFixed(2));

const originationFee = INVOICE_EX_GST * ORIGINATION_FEE_PERCENT;
console.log('4. Origination Fee (2.2%):', originationFee.toFixed(2));

const baseLoanBeforeCommission = INVOICE_EX_GST + APPLICATION_FEE_EX_GST + PPSR_FEE_EX_GST + originationFee;
console.log('5. Base Loan Amount (before commission):', baseLoanBeforeCommission.toFixed(2));

const approvalAmount = INVOICE_EX_GST * APPROVAL_MULTIPLIER;
console.log('6. Approval Amount:', approvalAmount.toFixed(2));

const commission = approvalAmount * COMMISSION_RATE;
console.log('7. Commission (1% of approval):', commission.toFixed(2));

const commissionWithGst = commission * (1 + GST_RATE);
console.log('8. Commission with GST:', commissionWithGst.toFixed(2));

console.log('\n--- Testing with commission NOT capitalised ---');
const principal = baseLoanBeforeCommission;
console.log('9. Final Loan Amount (no commission):', principal.toFixed(2));

const n = LOAN_TERM_YEARS * 12;
const i = ANNUAL_RATE / 12;

console.log('\n=== Monthly Payment Calculation ===');
console.log('Principal:', principal.toFixed(2));
console.log('Monthly Rate (i):', (i * 100).toFixed(6) + '%');
console.log('Number of Payments (n):', n);

const paymentArrears = (principal * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
console.log('Payment Formula Result (arrears):', paymentArrears.toFixed(2));

const paymentAdvance = paymentArrears / (1 + i);
console.log('Payment in Advance:', paymentAdvance.toFixed(2));

const roundedPayment = Math.ceil(paymentAdvance * 10) / 10;
console.log('Rounded Payment (to nearest $0.10):', roundedPayment.toFixed(2));

console.log('\n=== Expected vs Actual ===');
console.log('Expected (7 years): $3,251.14');
console.log('Expected (10 years): $3,286.50');
console.log('Our Calculation (10 years):', '$' + roundedPayment.toFixed(2));

// Now work backwards from $3,251.14 to find what it represents
console.log('\n=== Working Backwards from $3,251.14 (7 years?) ===');
const targetPayment = 3251.14;
const arrearsEquivalent = targetPayment * (1 + ANNUAL_RATE/12);
const n7 = 7 * 12;
const i7 = ANNUAL_RATE / 12;
const principalFor3251 = arrearsEquivalent * (Math.pow(1 + i7, n7) - 1) / (i7 * Math.pow(1 + i7, n7));
console.log('If payment is $3,251.14 for 7 years, principal would be:', principalFor3251.toFixed(2));

// What project cost gives this principal?
const fixedFees = APPLICATION_FEE_EX_GST + PPSR_FEE_EX_GST;
const principalMinusFees = principalFor3251 - fixedFees;
// If origination fee is 2.2%, then: invoice * 1.022 = principalMinusFees
const invoiceFor3251 = principalMinusFees / 1.022;
const projectCostFor3251 = invoiceFor3251 * (1 + GST_RATE);
console.log('Project Cost that gives $3,251.14:', '$' + projectCostFor3251.toFixed(2));

console.log('\n=== Working Backwards from $3,286.50 (10 years) ===');
const targetPayment10 = 3286.50;
const arrearsEquivalent10 = targetPayment10 * (1 + ANNUAL_RATE/12);
const n10 = 10 * 12;
const i10 = ANNUAL_RATE / 12;
const principalFor3286 = arrearsEquivalent10 * (Math.pow(1 + i10, n10) - 1) / (i10 * Math.pow(1 + i10, n10));
console.log('If payment is $3,286.50 for 10 years, principal would be:', principalFor3286.toFixed(2));

const principalMinusFees10 = principalFor3286 - fixedFees;
const invoiceFor3286 = principalMinusFees10 / 1.022;
const projectCostFor3286 = invoiceFor3286 * (1 + GST_RATE);
console.log('Project Cost that gives $3,286.50:', '$' + projectCostFor3286.toFixed(2));
