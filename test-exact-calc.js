// Exact calculation based on database config
const projectCost = 145720.45;
const originationFeeRate = 0.022;
const annualRate = 0.0949;
const paymentTiming = 'advance';
const loanTermYears = 7;
const monthlyFee = 0;

// Step 1: Calculate origination fee
const originationFee = projectCost * originationFeeRate;
console.log('Project Cost:', projectCost.toFixed(2));
console.log('Origination Fee (2.2%):', originationFee.toFixed(2));

// Step 2: Calculate base loan amount (principal)
const baseLoanAmount = projectCost + originationFee;
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));

// Step 3: Calculate monthly payment
const n = loanTermYears * 12;  // 84 months
const i = annualRate / 12;       // Monthly rate

const pow = Math.pow(1 + i, n);
let payment = (baseLoanAmount * i * pow) / (pow - 1);

// If advance, adjust
if (paymentTiming === 'advance') {
  payment = payment / (1 + i);
}

// Add monthly fee
payment = payment + monthlyFee;

console.log('\n--- Calculation Details ---');
console.log('Loan Term:', n, 'months');
console.log('Annual Rate:', (annualRate * 100).toFixed(2) + '%');
console.log('Monthly Rate:', (i * 100).toFixed(4) + '%');
console.log('Payment Timing:', paymentTiming);
console.log('Monthly Fee:', monthlyFee);

console.log('\n--- Results ---');
console.log('Monthly Payment:', payment.toFixed(2));
console.log('\n--- Comparison ---');
console.log('Your App Shows:', '2467.00');
console.log('Angle Finance Shows:', '2655.62');
console.log('Difference (App vs Calculated):', (2467 - payment).toFixed(2));
console.log('Difference (Angle vs Calculated):', (2655.62 - payment).toFixed(2));
