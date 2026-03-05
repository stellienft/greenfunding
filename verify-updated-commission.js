// Verify with updated commission rate
const projectCostIncGST = 100000;
const gstRate = 0.10;

const applicationFee = 770;
const ppsrFee = 22;
const originationFee = projectCostIncGST * 0.01; // 1% of inc-GST

const rateUsed = 0.0949; // 9.49% for 10 years
const months = 120;
const paymentTiming = 'advance';

// Commission: 2.9671% of inc-GST amount (ex-GST), then add GST
const commissionRate = 0.029671;
const commissionExGST = projectCostIncGST * commissionRate;
const commissionIncGST = commissionExGST * (1 + gstRate);

console.log('=== VERIFICATION WITH UPDATED COMMISSION RATE ===');
console.log('Project Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Origination Fee (1%):', originationFee.toFixed(2));
console.log('Application Fee:', applicationFee.toFixed(2));
console.log('PPSR Fee:', ppsrFee.toFixed(2));
console.log('Commission (2.9671% + GST):', commissionIncGST.toFixed(2));

const baseLoanAmount = projectCostIncGST + originationFee + applicationFee + ppsrFee + commissionIncGST;
console.log('\nBase Loan Amount:', baseLoanAmount.toFixed(2));

const monthlyRate = rateUsed / 12;
let monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('\n=== RESULT ===');
console.log('Monthly Payment:', monthlyPayment.toFixed(2));
console.log('Expected:', '1348.16');
console.log('Difference:', Math.abs(monthlyPayment - 1348.16).toFixed(2));
console.log('Match:', Math.abs(monthlyPayment - 1348.16) < 0.01 ? '✓ YES' : '✗ NO');
