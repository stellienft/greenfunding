// Test to verify application fee and PPSR fee are included in financed amount

const projectCostIncGst = 160000;
const gstRate = 0.10;
const applicationFee = 990;
const ppsrFee = 11.80;

// Calculate ex-GST amount
const projectCostExGst = projectCostIncGst / (1 + gstRate);

console.log('=== Project Details ===');
console.log('Project Cost (inc GST):', projectCostIncGst.toFixed(2));
console.log('Project Cost (ex GST):', projectCostExGst.toFixed(2));
console.log('Application Fee:', applicationFee.toFixed(2));
console.log('PPSR Fee:', ppsrFee.toFixed(2));
console.log('');

// Calculate base loan amount (should include application fee and PPSR fee)
let baseLoanAmount = projectCostExGst;
baseLoanAmount += applicationFee + ppsrFee;

console.log('=== Base Loan Amount Calculation ===');
console.log('Project Cost Ex GST:', projectCostExGst.toFixed(2));
console.log('+ Application Fee:', applicationFee.toFixed(2));
console.log('+ PPSR Fee:', ppsrFee.toFixed(2));
console.log('= Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('');

// Calculate monthly payment at 7.99% for 5 years
const annualRate = 0.0799;
const monthlyRate = annualRate / 12;
const months = 60;

const pow = Math.pow(1 + monthlyRate, months);
const monthlyPayment = (baseLoanAmount * monthlyRate * pow) / (pow - 1);

console.log('=== Monthly Payment Calculation ===');
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));
console.log('Annual Rate: 7.99%');
console.log('Term: 5 years (60 months)');
console.log('Monthly Payment:', monthlyPayment.toFixed(2));
console.log('');

// What the user might be expecting
const expectedBaseLoan = projectCostExGst + applicationFee + ppsrFee;
console.log('=== Expected Values ===');
console.log('Expected Base Loan:', expectedBaseLoan.toFixed(2));
console.log('Does it match? ', baseLoanAmount === expectedBaseLoan ? 'YES' : 'NO');
