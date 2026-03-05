// Maybe there's a monthly account keeping fee?
const projectCostIncGST = 100000;
const originationFee = 1000;
const applicationFee = 770;
const ppsrFee = 22;
const commissionIncGST = 2200; // 2% + GST

const baseLoanAmount = projectCostIncGST + originationFee + applicationFee + ppsrFee + commissionIncGST;

const rateUsed = 0.0949;
const months = 120;
const monthlyRate = rateUsed / 12;

let monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('Monthly Payment (no monthly fee):', monthlyPayment.toFixed(2));
console.log('Expected:', '1348.16');
console.log('Difference:', (1348.16 - monthlyPayment).toFixed(2));

const monthlyFeeNeeded = 1348.16 - monthlyPayment;
console.log('\nMonthly fee needed:', monthlyFeeNeeded.toFixed(2));
console.log('Annual fee:', (monthlyFeeNeeded * 12).toFixed(2));

// Or maybe the origination fee is higher?
console.log('\n=== WHAT IF ORIGINATION FEE IS DIFFERENT? ===');
const expectedPayment = 1348.16;
const arrearsEquivalent = expectedPayment * (1 + monthlyRate);
const impliedPrincipal = (arrearsEquivalent * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));

console.log('Implied Principal:', impliedPrincipal.toFixed(2));
console.log('Current Principal:', baseLoanAmount.toFixed(2));
console.log('Difference:', (impliedPrincipal - baseLoanAmount).toFixed(2));

// What if origination fee is on the full amount WITH fees?
const altOriginationFeeBase = projectCostIncGST + applicationFee + ppsrFee;
const altOriginationFee = altOriginationFeeBase * 0.01;
console.log('\nIf origination fee is 1% of (project + app + ppsr):', altOriginationFee.toFixed(2));
const altLoanAmount = projectCostIncGST + altOriginationFee + applicationFee + ppsrFee + commissionIncGST;
console.log('Alternate Loan Amount:', altLoanAmount.toFixed(2));
let altPayment = (altLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
altPayment = altPayment / (1 + monthlyRate);
console.log('Monthly Payment:', altPayment.toFixed(2));
