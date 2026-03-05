// Test for $100,000 project cost with 10-year term
// Expected: $1,348.16 monthly payment including GST
// Current: $1,305.36

const projectCostIncGST = 100000;
const gstRate = 0.10;
const projectCostExGST = projectCostIncGST / (1 + gstRate); // $90,909.09

// Assume standard configuration
const applicationFee = 770; // inc GST
const ppsrFee = 22; // inc GST
const rateUsed = 0.0799; // 7.99% for 10 years, >$100k
const loanTermYears = 10;
const months = loanTermYears * 12; // 120 months

// Commission: 2.2% of inc-GST amount
const commissionRate = 0.022;
const commissionExGST = projectCostIncGST * commissionRate; // $2,200
const commissionIncGST = commissionExGST * (1 + gstRate); // $2,420

console.log('=== INPUTS ===');
console.log('Project Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Project Cost (ex GST):', projectCostExGST.toFixed(2));
console.log('Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('Commission (ex GST):', commissionExGST.toFixed(2));
console.log('Commission (inc GST):', commissionIncGST.toFixed(2));
console.log('Interest Rate:', (rateUsed * 100).toFixed(2) + '%');
console.log('Term:', loanTermYears, 'years (' + months + ' months)');

// Calculate loan amount
const baseLoanAmount = projectCostExGST + applicationFee + ppsrFee + commissionIncGST;

console.log('\n=== LOAN CALCULATION ===');
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));

// Monthly payment calculation (standard amortization, arrears)
const monthlyRate = rateUsed / 12;
const monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

console.log('Monthly Rate:', (monthlyRate * 100).toFixed(6) + '%');
console.log('Monthly Payment (calculated):', monthlyPayment.toFixed(2));
console.log('Monthly Payment (expected):', '1348.16');
console.log('Monthly Payment (current incorrect):', '1305.36');

// Let's work backwards from expected payment
console.log('\n=== BACKWARDS CALCULATION ===');
const expectedPayment = 1348.16;
const impliedPrincipal = (expectedPayment * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));
console.log('Implied Principal from expected payment:', impliedPrincipal.toFixed(2));
console.log('Difference from our calculation:', (impliedPrincipal - baseLoanAmount).toFixed(2));

// Let's also check what principal gives us the incorrect payment
const incorrectPayment = 1305.36;
const incorrectPrincipal = (incorrectPayment * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));
console.log('\nImplied Principal from incorrect payment:', incorrectPrincipal.toFixed(2));
console.log('Difference from our calculation:', (incorrectPrincipal - baseLoanAmount).toFixed(2));

// Check if commission is being calculated wrong
console.log('\n=== COMMISSION ANALYSIS ===');
console.log('If commission calculated on ex-GST:', (projectCostExGST * commissionRate).toFixed(2));
console.log('If commission calculated on inc-GST:', (projectCostIncGST * commissionRate).toFixed(2));
console.log('Commission with GST applied:', commissionIncGST.toFixed(2));

// Check total principal components
console.log('\n=== PRINCIPAL BREAKDOWN ===');
console.log('Project Cost (ex GST):', projectCostExGST.toFixed(2));
console.log('+ Application Fee:', applicationFee.toFixed(2));
console.log('+ PPSR Fee:', ppsrFee.toFixed(2));
console.log('+ Commission (inc GST):', commissionIncGST.toFixed(2));
console.log('= Total Principal:', baseLoanAmount.toFixed(2));
