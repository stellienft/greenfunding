// Using CORRECT project cost from test-exact-calc.js
const projectCost = 145720.45;  // THIS is the actual project cost
const originationFeeRate = 0.022;
const commissionRate = 0.022;
const annualRate = 0.0949;
const paymentTiming = 'advance';
const loanTermYears = 7;
const targetPayment = 2655.62;

function calculatePaymentAdvance(principal, rate, months) {
  const i = rate / 12;
  const pow = Math.pow(1 + i, months);
  const standard = (principal * i * pow) / (pow - 1);
  return standard / (1 + i);
}

console.log('=== CORRECT INPUTS ===');
console.log('Project Cost:', projectCost.toFixed(2));
console.log('');

// Step 1: Origination fee
const originationFee = projectCost * originationFeeRate;
console.log('Origination Fee (2.2%):', originationFee.toFixed(2));

// Step 2: Base loan
const baseLoanAmount = projectCost + originationFee;
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('');

// Test different commission scenarios
console.log('=== TESTING COMMISSION SCENARIOS ===');
console.log('');

console.log('SCENARIO 1: 2.2% commission of PROJECT COST');
const comm1 = projectCost * commissionRate;
const loan1 = baseLoanAmount + comm1;
const payment1 = calculatePaymentAdvance(loan1, annualRate, 84);
console.log('  Commission:', comm1.toFixed(2));
console.log('  Total Loan:', loan1.toFixed(2));
console.log('  Payment:', payment1.toFixed(2));
console.log('  Difference from target:', Math.abs(targetPayment - payment1).toFixed(2));
console.log('');

console.log('SCENARIO 2: 2.2% commission of PROJECT COST + GST (10%)');
const comm2 = projectCost * commissionRate * 1.10;
const loan2 = baseLoanAmount + comm2;
const payment2 = calculatePaymentAdvance(loan2, annualRate, 84);
console.log('  Commission (with GST):', comm2.toFixed(2));
console.log('  Total Loan:', loan2.toFixed(2));
console.log('  Payment:', payment2.toFixed(2));
console.log('  Difference from target:', Math.abs(targetPayment - payment2).toFixed(2));
console.log('');

// Calculate approval amount (assuming 1.2x multiplier)
const approvalAmount = projectCost * 1.2;
console.log('Approval Amount (1.2x):', approvalAmount.toFixed(2));
console.log('');

console.log('SCENARIO 3: 2.2% commission of APPROVAL AMOUNT');
const comm3 = approvalAmount * commissionRate;
const loan3 = baseLoanAmount + comm3;
const payment3 = calculatePaymentAdvance(loan3, annualRate, 84);
console.log('  Commission:', comm3.toFixed(2));
console.log('  Total Loan:', loan3.toFixed(2));
console.log('  Payment:', payment3.toFixed(2));
console.log('  Difference from target:', Math.abs(targetPayment - payment3).toFixed(2));
console.log('');

console.log('SCENARIO 4: 2.2% commission of APPROVAL AMOUNT + GST (10%)');
const comm4 = approvalAmount * commissionRate * 1.10;
const loan4 = baseLoanAmount + comm4;
const payment4 = calculatePaymentAdvance(loan4, annualRate, 84);
console.log('  Commission (with GST):', comm4.toFixed(2));
console.log('  Total Loan:', loan4.toFixed(2));
console.log('  Payment:', payment4.toFixed(2));
console.log('  Difference from target:', Math.abs(targetPayment - payment4).toFixed(2));
console.log('');

console.log('SCENARIO 5: 2.2% commission of BASE LOAN AMOUNT');
const comm5 = baseLoanAmount * commissionRate;
const loan5 = baseLoanAmount + comm5;
const payment5 = calculatePaymentAdvance(loan5, annualRate, 84);
console.log('  Commission:', comm5.toFixed(2));
console.log('  Total Loan:', loan5.toFixed(2));
console.log('  Payment:', payment5.toFixed(2));
console.log('  Difference from target:', Math.abs(targetPayment - payment5).toFixed(2));
console.log('');

console.log('SCENARIO 6: 2.2% commission of BASE LOAN + GST (10%)');
const comm6 = baseLoanAmount * commissionRate * 1.10;
const loan6 = baseLoanAmount + comm6;
const payment6 = calculatePaymentAdvance(loan6, annualRate, 84);
console.log('  Commission (with GST):', comm6.toFixed(2));
console.log('  Total Loan:', loan6.toFixed(2));
console.log('  Payment:', payment6.toFixed(2));
console.log('  Difference from target:', Math.abs(targetPayment - payment6).toFixed(2));
console.log('');

console.log('=== WHAT ANGLE ACTUALLY NEEDS ===');
// Work backwards from target payment
for (let principal = 160000; principal <= 165000; principal += 100) {
  const payment = calculatePaymentAdvance(principal, annualRate, 84);
  if (Math.abs(payment - targetPayment) < 0.5) {
    console.log('Principal needed:', principal.toFixed(2));
    console.log('Payment:', payment.toFixed(2));
    console.log('Addition to base loan:', (principal - baseLoanAmount).toFixed(2));
    console.log('Addition as % of project cost:', ((principal - baseLoanAmount) / projectCost * 100).toFixed(2) + '%');
    console.log('Addition as % of base loan:', ((principal - baseLoanAmount) / baseLoanAmount * 100).toFixed(2) + '%');
    break;
  }
}
