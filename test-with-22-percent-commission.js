// Test if 2.2% commission is added to the loan
const projectCost = 148926.30;
const originationFeeRate = 0.022;
const commissionRate = 0.022;
const annualRate = 0.0949;
const paymentTiming = 'advance';
const loanTermYears = 7;

console.log('=== INPUT ===');
console.log('Project Cost:', projectCost.toFixed(2));
console.log('');

// Step 1: Calculate origination fee
const originationFee = projectCost * originationFeeRate;
console.log('=== FEES ===');
console.log('Origination Fee (2.2%):', originationFee.toFixed(2));

// Step 2: Calculate base loan amount (with origination fee capitalized)
const baseLoanAmount = projectCost + originationFee;
console.log('Base Loan (before commission):', baseLoanAmount.toFixed(2));

// Step 3: Calculate commission (2.2% of project cost)
const commission = projectCost * commissionRate;
console.log('Commission (2.2% of project cost):', commission.toFixed(2));

// Step 4: Add commission to loan
const totalLoanAmount = baseLoanAmount + commission;
console.log('Total Loan Amount (with commission):', totalLoanAmount.toFixed(2));
console.log('');

// Step 5: Calculate monthly payment
const n = loanTermYears * 12;  // 84 months
const i = annualRate / 12;       // Monthly rate

const pow = Math.pow(1 + i, n);
let payment = (totalLoanAmount * i * pow) / (pow - 1);

// If advance, adjust
if (paymentTiming === 'advance') {
  payment = payment / (1 + i);
}

console.log('=== CALCULATION ===');
console.log('Loan Term:', n, 'months');
console.log('Annual Rate:', (annualRate * 100).toFixed(2) + '%');
console.log('Monthly Rate:', (i * 100).toFixed(4) + '%');
console.log('Payment Timing:', paymentTiming);
console.log('');

console.log('=== RESULTS ===');
console.log('Monthly Payment:', payment.toFixed(2));
console.log('');

console.log('=== COMPARISON ===');
console.log('Angle Finance Shows:', '2655.62');
console.log('Our Calculation:', payment.toFixed(2));
console.log('Difference:', Math.abs(2655.62 - payment).toFixed(2));
console.log('');

if (Math.abs(2655.62 - payment) < 1) {
  console.log('✓ MATCH! This is how Angle Finance calculates it!');
} else {
  console.log('✗ Still not matching...');
}
