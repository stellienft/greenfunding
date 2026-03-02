// Test the final calculation with commission capitalised
const projectCost = 145720.45;
const originationFeeRate = 0.022;
const commissionRate = 0.10;  // 10% flat rate
const annualRate = 0.0949;
const loanTermYears = 7;
const gstRate = 0.10;

console.log('=== INPUTS ===');
console.log('Project Cost:', projectCost.toFixed(2));
console.log('Loan Term:', loanTermYears, 'years');
console.log('Interest Rate:', (annualRate * 100).toFixed(2) + '%');
console.log('');

// Step 1: Calculate origination fee
const originationFee = projectCost * originationFeeRate;
console.log('=== FEES ===');
console.log('Origination Fee (2.2%):', originationFee.toFixed(2));

// Step 2: Calculate base loan (project cost + origination fee)
const baseLoanBeforeCommission = projectCost + originationFee;
console.log('Base Loan (before commission):', baseLoanBeforeCommission.toFixed(2));
console.log('');

// Step 3: Calculate approval amount (for commission calculation)
const approvalMultiplier = 1.2;
const approvalAmount = projectCost * approvalMultiplier;
console.log('=== APPROVAL & COMMISSION ===');
console.log('Approval Amount:', approvalAmount.toFixed(2));

// Commission is 10% flat rate on approval amount
const commission = approvalAmount * commissionRate;
const commissionWithGst = commission * (1 + gstRate);
console.log('Commission (10% of approval):', commission.toFixed(2));
console.log('Commission with GST:', commissionWithGst.toFixed(2));
console.log('');

// Step 4: Add commission to loan (WITH GST)
const finalLoanAmount = baseLoanBeforeCommission + commissionWithGst;
console.log('=== FINAL LOAN AMOUNT ===');
console.log('Base Loan:', baseLoanBeforeCommission.toFixed(2));
console.log('+ Commission (with GST):', commissionWithGst.toFixed(2));
console.log('= Total Financed:', finalLoanAmount.toFixed(2));
console.log('');

// Step 5: Calculate monthly payment
const months = loanTermYears * 12;
const monthlyRate = annualRate / 12;
const pow = Math.pow(1 + monthlyRate, months);
let monthlyPayment = (finalLoanAmount * monthlyRate * pow) / (pow - 1);

// Adjust for advance timing
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('=== MONTHLY PAYMENT ===');
console.log('Payment Timing: advance');
console.log('Monthly Payment:', monthlyPayment.toFixed(2));
console.log('');

console.log('=== COMPARISON ===');
console.log('Angle Finance:', '2655.62');
console.log('Our Calculation:', monthlyPayment.toFixed(2));
console.log('Difference:', Math.abs(2655.62 - monthlyPayment).toFixed(2));

if (Math.abs(2655.62 - monthlyPayment) < 1) {
  console.log('');
  console.log('✓ SUCCESS! Calculation matches Angle Finance!');
}
