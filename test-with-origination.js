// Test with origination fee included
const projectCostIncGST = 100000;
const gstRate = 0.10;
const projectCostExGST = projectCostIncGST / (1 + gstRate); // $90,909.09

const applicationFee = 770; // inc GST
const ppsrFee = 6.6; // inc GST
const originationFeePercent = 0.01; // 1%
const originationFee = projectCostExGST * originationFeePercent; // $909.09
const feeCapitalised = true;

const rateUsed = 0.0949; // 9.49% for 10 years (5+ years)
const loanTermYears = 10;
const months = loanTermYears * 12; // 120 months
const paymentTiming = 'advance';

// Commission: 2% of inc-GST amount
const commissionRate = 0.02;
const commissionExGST = projectCostIncGST * commissionRate;
const commissionIncGST = commissionExGST * (1 + gstRate);

console.log('=== INPUTS ===');
console.log('Project Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Project Cost (ex GST):', projectCostExGST.toFixed(2));
console.log('Origination Fee (1%):', originationFee.toFixed(2));
console.log('Application Fee (inc GST):', applicationFee.toFixed(2));
console.log('PPSR Fee (inc GST):', ppsrFee.toFixed(2));
console.log('Commission (inc GST):', commissionIncGST.toFixed(2));
console.log('Interest Rate:', (rateUsed * 100).toFixed(2) + '%');
console.log('Payment Timing:', paymentTiming);

// Calculate loan amount WITH origination fee, app fee, PPSR fee, and commission
const baseLoanAmount = projectCostExGST + originationFee + applicationFee + ppsrFee + commissionIncGST;

console.log('\n=== LOAN CALCULATION ===');
console.log('Base Loan Amount:', baseLoanAmount.toFixed(2));

// Monthly payment calculation (ADVANCE)
const monthlyRate = rateUsed / 12;
let monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('Monthly Payment (advance):', monthlyPayment.toFixed(2));
console.log('Monthly Payment (expected):', '1348.16');
console.log('Difference:', (monthlyPayment - 1348.16).toFixed(2));

// Try with the user having commission capitalised enabled
console.log('\n=== ALTERNATE: COMMISSION NOT CAPITALISED ===');
const loanWithoutCommission = projectCostExGST + originationFee + applicationFee + ppsrFee;
console.log('Loan Amount (no commission):', loanWithoutCommission.toFixed(2));
let paymentNoCommission = (loanWithoutCommission * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
paymentNoCommission = paymentNoCommission / (1 + monthlyRate);
console.log('Monthly Payment:', paymentNoCommission.toFixed(2));

// What if commission is calculated differently?
console.log('\n=== CHECKING COMMISSION CALCULATION ===');
const commissionOnExGST = projectCostExGST * 0.022; // 2.2% on ex-GST
const commissionOnExGSTWithGST = commissionOnExGST * (1 + gstRate);
console.log('Commission 2.2% on ex-GST:', commissionOnExGST.toFixed(2));
console.log('Commission 2.2% on ex-GST + GST:', commissionOnExGSTWithGST.toFixed(2));

const loanWith22Pct = projectCostExGST + originationFee + applicationFee + ppsrFee + commissionOnExGSTWithGST;
console.log('Loan with 2.2% commission:', loanWith22Pct.toFixed(2));
let payment22Pct = (loanWith22Pct * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
payment22Pct = payment22Pct / (1 + monthlyRate);
console.log('Monthly Payment:', payment22Pct.toFixed(2));

// Let me try backwards calculation again
console.log('\n=== BACKWARDS FROM EXPECTED ===');
const expectedPayment = 1348.16;
const arrearsEquivalent = expectedPayment * (1 + monthlyRate);
const impliedPrincipal = (arrearsEquivalent * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));
console.log('Implied Principal:', impliedPrincipal.toFixed(2));
console.log('Our calculated (with commission):', baseLoanAmount.toFixed(2));
console.log('Difference:', (impliedPrincipal - baseLoanAmount).toFixed(2));

// Break down what that principal would be
console.log('\n=== WHAT MAKES UP IMPLIED PRINCIPAL ===');
const remaining = impliedPrincipal - projectCostExGST;
console.log('Project Cost (ex GST):', projectCostExGST.toFixed(2));
console.log('Remaining amount needed:', remaining.toFixed(2));
console.log('Origination + App + PPSR:', (originationFee + applicationFee + ppsrFee).toFixed(2));
console.log('Would need commission of:', (remaining - originationFee - applicationFee - ppsrFee).toFixed(2));
