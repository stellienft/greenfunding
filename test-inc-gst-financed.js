// What if the PROJECT COST INC GST is what's being financed, not ex-GST?
const projectCostIncGST = 100000;
const gstRate = 0.10;

const applicationFee = 770; // inc GST
const ppsrFee = 6.6; // inc GST
const originationFeePercent = 0.01; // 1%

// Key question: is origination fee on inc-GST or ex-GST amount?
const originationFeeOnIncGST = projectCostIncGST * originationFeePercent; // $1,000
const feeCapitalised = true;

const rateUsed = 0.0949; // 9.49% for 10 years
const loanTermYears = 10;
const months = loanTermYears * 12;
const paymentTiming = 'advance';

// Commission: 2% of inc-GST amount
const commissionRate = 0.02;
const commissionExGST = projectCostIncGST * commissionRate; // $2,000
const commissionIncGST = commissionExGST * (1 + gstRate); // $2,200

console.log('=== SCENARIO: FINANCING INC-GST AMOUNT ===');
console.log('Project Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Origination Fee (1% of inc-GST):', originationFeeOnIncGST.toFixed(2));
console.log('Application Fee:', applicationFee.toFixed(2));
console.log('PPSR Fee:', ppsrFee.toFixed(2));
console.log('Commission (inc GST):', commissionIncGST.toFixed(2));

// Calculate loan amount
const baseLoanAmount = projectCostIncGST + originationFeeOnIncGST + applicationFee + ppsrFee + commissionIncGST;

console.log('\nBase Loan Amount:', baseLoanAmount.toFixed(2));

// Monthly payment calculation (ADVANCE)
const monthlyRate = rateUsed / 12;
let monthlyPayment = (baseLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
monthlyPayment = monthlyPayment / (1 + monthlyRate);

console.log('Monthly Payment (advance):', monthlyPayment.toFixed(2));
console.log('Expected:', '1348.16');
console.log('Difference:', (monthlyPayment - 1348.16).toFixed(2));

// Maybe commission is NOT included?
console.log('\n=== WITHOUT COMMISSION ===');
const loanWithoutCommission = projectCostIncGST + originationFeeOnIncGST + applicationFee + ppsrFee;
console.log('Loan Amount:', loanWithoutCommission.toFixed(2));
let paymentNoCommission = (loanWithoutCommission * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
paymentNoCommission = paymentNoCommission / (1 + monthlyRate);
console.log('Monthly Payment:', paymentNoCommission.toFixed(2));

// What about backwards?
console.log('\n=== BACKWARDS FROM EXPECTED ===');
const expectedPayment = 1348.16;
const arrearsEquivalent = expectedPayment * (1 + monthlyRate);
const impliedPrincipal = (arrearsEquivalent * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));
console.log('Implied Principal:', impliedPrincipal.toFixed(2));
console.log('Our calculation:', baseLoanAmount.toFixed(2));
console.log('Difference:', (impliedPrincipal - baseLoanAmount).toFixed(2));

// What components make up the implied principal?
const diff = impliedPrincipal - projectCostIncGST;
console.log('\nProject Cost (inc GST):', projectCostIncGST.toFixed(2));
console.log('Additional amount:', diff.toFixed(2));
console.log('Known fees:', (originationFeeOnIncGST + applicationFee + ppsrFee).toFixed(2));
console.log('Implied commission:', (diff - originationFeeOnIncGST - applicationFee - ppsrFee).toFixed(2));
const impliedCommRate = (diff - originationFeeOnIncGST - applicationFee - ppsrFee) / projectCostIncGST;
console.log('Implied commission rate:', (impliedCommRate * 100).toFixed(2) + '%');
