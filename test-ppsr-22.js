// Test with PPSR fee at 22 instead of 6.6
const projectCostIncGST = 100000;
const gstRate = 0.10;

const applicationFee = 770;
const ppsrFee = 22; // Try 22 instead of 6.6
const originationFeePercent = 0.01;
const originationFee = projectCostIncGST * originationFeePercent; // $1,000

const rateUsed = 0.0949;
const loanTermYears = 10;
const months = loanTermYears * 12;
const paymentTiming = 'advance';

const commissionRate = 0.02;
const commissionExGST = projectCostIncGST * commissionRate;
const commissionIncGST = commissionExGST * (1 + gstRate);

console.log('=== WITH PPSR FEE = 22 ===');
console.log('Project Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Origination Fee:', originationFee.toFixed(2));
console.log('Application Fee:', applicationFee.toFixed(2));
console.log('PPSR Fee:', ppsrFee.toFixed(2));
console.log('Commission (inc GST):', commissionIncGST.toFixed(2));

const baseLoanAmount = projectCostIncGST + originationFee + applicationFee + ppsrFee + commissionIncGST;
console.log('\nBase Loan Amount:', baseLoanAmount.toFixed(2));

const monthlyRate = rateUsed / 12;
let monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('Monthly Payment:', monthlyPayment.toFixed(2));
console.log('Expected:', '1348.16');
console.log('Difference:', (monthlyPayment - 1348.16).toFixed(2));

// What if commission is 3.28% as implied?
console.log('\n=== WITH 3.28% COMMISSION ===');
const commission328 = projectCostIncGST * 0.0328;
const baseLoan328 = projectCostIncGST + originationFee + applicationFee + ppsrFee + commission328;
console.log('Commission (3.28%):', commission328.toFixed(2));
console.log('Base Loan Amount:', baseLoan328.toFixed(2));
let payment328 = (baseLoan328 * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
payment328 = payment328 / (1 + monthlyRate);
console.log('Monthly Payment:', payment328.toFixed(2));

// Try exact match
console.log('\n=== EXACT MATCH ATTEMPT ===');
const expectedPayment = 1348.16;
const arrearsEquivalent = expectedPayment * (1 + monthlyRate);
const impliedPrincipal = (arrearsEquivalent * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));
console.log('Implied Principal:', impliedPrincipal.toFixed(2));

const neededCommission = impliedPrincipal - projectCostIncGST - originationFee - applicationFee - ppsrFee;
console.log('Needed Commission:', neededCommission.toFixed(2));
console.log('As % of project cost:', (neededCommission / projectCostIncGST * 100).toFixed(4) + '%');

// Verify
const testLoan = projectCostIncGST + originationFee + applicationFee + ppsrFee + neededCommission;
console.log('\nVerification Loan Amount:', testLoan.toFixed(2));
let testPayment = (testLoan * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
testPayment = testPayment / (1 + monthlyRate);
console.log('Verification Payment:', testPayment.toFixed(2));
