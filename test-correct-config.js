// Test with actual configuration from database
const projectCostIncGST = 100000;
const gstRate = 0.10;
const projectCostExGST = projectCostIncGST / (1 + gstRate); // $90,909.09

const applicationFee = 770; // inc GST
const ppsrFee = 6.6; // inc GST (not 22!)
const rateUsed = 0.0949; // 9.49% for 10 years (5+ years)
const loanTermYears = 10;
const months = loanTermYears * 12; // 120 months
const paymentTiming = 'advance'; // payments in advance!

// Commission: 2% of inc-GST amount (for $100k tier)
const commissionRate = 0.02;
const commissionExGST = projectCostIncGST * commissionRate; // $2,000
const commissionIncGST = commissionExGST * (1 + gstRate); // $2,200
const commissionCapitalised = false; // NOT capitalised!

console.log('=== INPUTS ===');
console.log('Project Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Project Cost (ex GST):', projectCostExGST.toFixed(2));
console.log('Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('Commission (ex GST):', commissionExGST.toFixed(2));
console.log('Commission (inc GST):', commissionIncGST.toFixed(2));
console.log('Commission Capitalised:', commissionCapitalised);
console.log('Interest Rate:', (rateUsed * 100).toFixed(2) + '%');
console.log('Term:', loanTermYears, 'years (' + months + ' months)');
console.log('Payment Timing:', paymentTiming);

// Calculate loan amount (WITHOUT commission since it's not capitalised)
const baseLoanAmount = projectCostExGST + applicationFee + ppsrFee;

console.log('\n=== LOAN CALCULATION ===');
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));

// Monthly payment calculation (standard amortization, ADVANCE)
const monthlyRate = rateUsed / 12;
let monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

// Adjust for advance payment
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('Monthly Rate:', (monthlyRate * 100).toFixed(6) + '%');
console.log('Monthly Payment (arrears formula):', ((baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)).toFixed(2));
console.log('Monthly Payment (advance adjusted):', monthlyPayment.toFixed(2));
console.log('Monthly Payment (expected):', '1348.16');
console.log('Monthly Payment (current incorrect):', '1305.36');

// Let's work backwards from expected payment
console.log('\n=== BACKWARDS CALCULATION (ADVANCE) ===');
const expectedPayment = 1348.16;
// For advance: payment = arrears_payment / (1 + i)
// So: arrears_payment = payment * (1 + i)
const arrearsEquivalent = expectedPayment * (1 + monthlyRate);
console.log('Expected payment adjusted to arrears:', arrearsEquivalent.toFixed(2));
const impliedPrincipal = (arrearsEquivalent * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));
console.log('Implied Principal from expected payment:', impliedPrincipal.toFixed(2));
console.log('Difference from our calculation:', (impliedPrincipal - baseLoanAmount).toFixed(2));

// Check what we're missing
console.log('\n=== PRINCIPAL BREAKDOWN ===');
console.log('Project Cost (ex GST):', projectCostExGST.toFixed(2));
console.log('+ Application Fee:', applicationFee.toFixed(2));
console.log('+ PPSR Fee:', ppsrFee.toFixed(2));
console.log('= Total Principal:', baseLoanAmount.toFixed(2));
console.log('Expected Principal:', impliedPrincipal.toFixed(2));
console.log('Missing amount:', (impliedPrincipal - baseLoanAmount).toFixed(2));

// Could it be that commission IS being capitalised despite the config?
console.log('\n=== WITH COMMISSION ===');
const loanWithCommission = baseLoanAmount + commissionIncGST;
console.log('Loan Amount + Commission:', loanWithCommission.toFixed(2));
let paymentWithCommission = (loanWithCommission * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
paymentWithCommission = paymentWithCommission / (1 + monthlyRate);
console.log('Monthly Payment with Commission:', paymentWithCommission.toFixed(2));
