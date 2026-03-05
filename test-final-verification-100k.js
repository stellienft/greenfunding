// Final verification test for $100,000 finance quote
const projectCostIncGST = 100000;
const gstRate = 0.10;
const projectCostExGST = projectCostIncGST / (1 + gstRate);

const applicationFee = 770;
const ppsrFee = 22;
const originationFeePercent = 0.01;
const originationFee = projectCostIncGST * originationFeePercent; // Now on inc-GST

const rateUsed = 0.0949; // 9.49% for 10 years
const loanTermYears = 10;
const months = loanTermYears * 12;
const paymentTiming = 'advance';

// Commission: 2% of inc-GST amount
const commissionRate = 0.02;
const commissionExGST = projectCostIncGST * commissionRate;
const commissionIncGST = commissionExGST * (1 + gstRate);

console.log('=== FINAL CALCULATION ===');
console.log('Project Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Origination Fee (1% of inc-GST):', originationFee.toFixed(2));
console.log('Application Fee:', applicationFee.toFixed(2));
console.log('PPSR Fee:', ppsrFee.toFixed(2));
console.log('Commission (2% + GST):', commissionIncGST.toFixed(2));
console.log('Interest Rate:', (rateUsed * 100).toFixed(2) + '%');
console.log('Payment Timing:', paymentTiming);

// Calculate loan amount (WITH commission capitalised)
const baseLoanAmount = projectCostIncGST + originationFee + applicationFee + ppsrFee + commissionIncGST;

console.log('\n=== LOAN DETAILS ===');
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));

// Monthly payment calculation (ADVANCE)
const monthlyRate = rateUsed / 12;
let monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('\n=== RESULT ===');
console.log('Monthly Payment:', monthlyPayment.toFixed(2));
console.log('Expected:', '1348.16');
console.log('Difference:', Math.abs(monthlyPayment - 1348.16).toFixed(2));
console.log('Match:', Math.abs(monthlyPayment - 1348.16) < 0.01 ? 'YES ✓' : 'NO ✗');

console.log('\n=== BREAKDOWN ===');
console.log('Project Cost (inc GST):     $' + projectCostIncGST.toLocaleString());
console.log('+ Origination Fee (1%):     $' + originationFee.toLocaleString());
console.log('+ Application Fee:          $' + applicationFee.toLocaleString());
console.log('+ PPSR Fee:                 $' + ppsrFee.toLocaleString());
console.log('+ Commission (2% + GST):    $' + commissionIncGST.toLocaleString());
console.log('─'.repeat(50));
console.log('= Total Financed:           $' + baseLoanAmount.toLocaleString());
console.log('');
console.log('Monthly Payment @ 9.49% (advance): $' + monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}));
console.log('Term: ' + loanTermYears + ' years');
