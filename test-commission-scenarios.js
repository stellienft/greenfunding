// Test various commission scenarios
const projectCost = 148926.30;
const originationFee = 3276.38;
const baseLoanAmount = 152202.68;
const approvalAmount = 178711.56; // 1.2 * projectCost
const targetPayment = 2655.62;
const annualRate = 0.0949;
const months = 84;

function calculatePaymentAdvance(principal, rate, months) {
  const i = rate / 12;
  const pow = Math.pow(1 + i, months);
  const standard = (principal * i * pow) / (pow - 1);
  return standard / (1 + i);
}

console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('Target Payment:', targetPayment);
console.log('');

console.log('=== SCENARIO 1: 2.2% of project cost ===');
const comm1 = projectCost * 0.022;
const loan1 = baseLoanAmount + comm1;
const payment1 = calculatePaymentAdvance(loan1, annualRate, months);
console.log('Commission:', comm1.toFixed(2));
console.log('Total Loan:', loan1.toFixed(2));
console.log('Payment:', payment1.toFixed(2));
console.log('Difference:', Math.abs(targetPayment - payment1).toFixed(2));
console.log('');

console.log('=== SCENARIO 2: 2.2% of project cost + GST ===');
const comm2 = projectCost * 0.022 * 1.10;
const loan2 = baseLoanAmount + comm2;
const payment2 = calculatePaymentAdvance(loan2, annualRate, months);
console.log('Commission (with GST):', comm2.toFixed(2));
console.log('Total Loan:', loan2.toFixed(2));
console.log('Payment:', payment2.toFixed(2));
console.log('Difference:', Math.abs(targetPayment - payment2).toFixed(2));
console.log('');

console.log('=== SCENARIO 3: 2.2% of approval amount ===');
const comm3 = approvalAmount * 0.022;
const loan3 = baseLoanAmount + comm3;
const payment3 = calculatePaymentAdvance(loan3, annualRate, months);
console.log('Commission:', comm3.toFixed(2));
console.log('Total Loan:', loan3.toFixed(2));
console.log('Payment:', payment3.toFixed(2));
console.log('Difference:', Math.abs(targetPayment - payment3).toFixed(2));
console.log('');

console.log('=== SCENARIO 4: 2.2% of approval amount + GST ===');
const comm4 = approvalAmount * 0.022 * 1.10;
const loan4 = baseLoanAmount + comm4;
const payment4 = calculatePaymentAdvance(loan4, annualRate, months);
console.log('Commission (with GST):', comm4.toFixed(2));
console.log('Total Loan:', loan4.toFixed(2));
console.log('Payment:', payment4.toFixed(2));
console.log('Difference:', Math.abs(targetPayment - payment4).toFixed(2));
console.log('');

console.log('=== SCENARIO 5: 2.2% of base loan amount ===');
const comm5 = baseLoanAmount * 0.022;
const loan5 = baseLoanAmount + comm5;
const payment5 = calculatePaymentAdvance(loan5, annualRate, months);
console.log('Commission:', comm5.toFixed(2));
console.log('Total Loan:', loan5.toFixed(2));
console.log('Payment:', payment5.toFixed(2));
console.log('Difference:', Math.abs(targetPayment - payment5).toFixed(2));
console.log('');

console.log('=== SCENARIO 6: 2.2% of base loan amount + GST ===');
const comm6 = baseLoanAmount * 0.022 * 1.10;
const loan6 = baseLoanAmount + comm6;
const payment6 = calculatePaymentAdvance(loan6, annualRate, months);
console.log('Commission (with GST):', comm6.toFixed(2));
console.log('Total Loan:', loan6.toFixed(2));
console.log('Payment:', payment6.toFixed(2));
console.log('Difference:', Math.abs(targetPayment - payment6).toFixed(2));
console.log('');

// What principal do we need?
console.log('=== REVERSE CALCULATION ===');
console.log('Principal needed for target payment:', '163800.00');
console.log('Required addition:', (163800 - baseLoanAmount).toFixed(2));
console.log('As % of project cost:', ((163800 - baseLoanAmount) / projectCost * 100).toFixed(2) + '%');
console.log('As % of base loan:', ((163800 - baseLoanAmount) / baseLoanAmount * 100).toFixed(2) + '%');
