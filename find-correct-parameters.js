// Work backwards from $3,251.15 for 10 years to find the correct calculation method

const GST_RATE = 0.10;
const PROJECT_COST_INC_GST = 275000;
const INVOICE_EX_GST = PROJECT_COST_INC_GST / (1 + GST_RATE);
const APPLICATION_FEE_INC_GST = 649;
const PPSR_FEE_INC_GST = 6;
const APPLICATION_FEE_EX_GST = APPLICATION_FEE_INC_GST / (1 + GST_RATE);
const PPSR_FEE_EX_GST = PPSR_FEE_INC_GST / (1 + GST_RATE);
const ORIGINATION_FEE_PERCENT = 0.022;
const LOAN_TERM_YEARS = 10;
const TARGET_PAYMENT = 3251.15;

console.log('=== Working Backwards from $3,251.15 (10 years) ===\n');

// Test different interest rates
const testRates = [0.0799, 0.0849, 0.0899, 0.0949, 0.0999];

testRates.forEach(annualRate => {
  const n = LOAN_TERM_YEARS * 12;
  const i = annualRate / 12;

  // Convert payment in advance to arrears
  const arrearsEquivalent = TARGET_PAYMENT * (1 + i);

  // Calculate principal from payment
  const principal = arrearsEquivalent * (Math.pow(1 + i, n) - 1) / (i * Math.pow(1 + i, n));

  console.log(`\nRate: ${(annualRate * 100).toFixed(2)}%`);
  console.log('  Principal needed:', principal.toFixed(2));

  // What does this mean for the project cost?
  const fixedFees = APPLICATION_FEE_EX_GST + PPSR_FEE_EX_GST;
  const principalMinusFees = principal - fixedFees;
  const invoiceNeeded = principalMinusFees / 1.022;
  const projectCost = invoiceNeeded * (1 + GST_RATE);

  console.log('  Implied Project Cost:', '$' + projectCost.toFixed(2));
  console.log('  Difference from $275,000:', '$' + (projectCost - 275000).toFixed(2));
});

console.log('\n\n=== Testing Alternative: Maybe fees are different? ===\n');

// Maybe PPSR or application fees are NOT included in the loan?
function testWithoutFees() {
  const annualRate = 0.0949;
  const n = LOAN_TERM_YEARS * 12;
  const i = annualRate / 12;

  // Test 1: Only invoice + origination fee
  const principal1 = INVOICE_EX_GST * 1.022;
  const payment1 = (principal1 * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) / (1 + i);
  console.log('If loan = Invoice + Origination only:');
  console.log('  Principal:', principal1.toFixed(2));
  console.log('  Payment:', Math.ceil(payment1 * 10) / 10);

  // Test 2: Maybe origination fee is different?
  const targetPrincipal = TARGET_PAYMENT * (1 + i) * (Math.pow(1 + i, n) - 1) / (i * Math.pow(1 + i, n));
  console.log('\nPrincipal needed for $3,251.15 at 9.49%:', targetPrincipal.toFixed(2));

  // What origination % gives this?
  const neededPrincipal = targetPrincipal - APPLICATION_FEE_EX_GST - PPSR_FEE_EX_GST;
  const originationPercent = (neededPrincipal / INVOICE_EX_GST) - 1;
  console.log('If application & PPSR fees included:');
  console.log('  Needed origination %:', (originationPercent * 100).toFixed(4) + '%');

  // Test 3: What if application fee is included but not PPSR?
  const neededPrincipal2 = targetPrincipal - APPLICATION_FEE_EX_GST;
  const originationPercent2 = (neededPrincipal2 / INVOICE_EX_GST) - 1;
  console.log('\nIf only application fee included (no PPSR):');
  console.log('  Needed origination %:', (originationPercent2 * 100).toFixed(4) + '%');

  // Test 4: What if PPSR is included but not application fee?
  const neededPrincipal3 = targetPrincipal - PPSR_FEE_EX_GST;
  const originationPercent3 = (neededPrincipal3 / INVOICE_EX_GST) - 1;
  console.log('\nIf only PPSR fee included (no application):');
  console.log('  Needed origination %:', (originationPercent3 * 100).toFixed(4) + '%');

  // Test 5: No fees at all
  const originationPercent4 = (targetPrincipal / INVOICE_EX_GST) - 1;
  console.log('\nIf NO fees included in loan:');
  console.log('  Needed origination %:', (originationPercent4 * 100).toFixed(4) + '%');
}

testWithoutFees();

console.log('\n\n=== Testing: Maybe rate is 7.99% not 9.49%? ===\n');
const rate799 = 0.0799;
const n = LOAN_TERM_YEARS * 12;
const i799 = rate799 / 12;

// Our current principal
const currentPrincipal = INVOICE_EX_GST + APPLICATION_FEE_EX_GST + PPSR_FEE_EX_GST + (INVOICE_EX_GST * 0.022);
console.log('Current principal:', currentPrincipal.toFixed(2));

const payment799 = (currentPrincipal * i799 * Math.pow(1 + i799, n)) / (Math.pow(1 + i799, n) - 1) / (1 + i799);
console.log('Payment at 7.99% for 10 years:', Math.ceil(payment799 * 10) / 10);
