const targetPayment = 3251.14;
const loanTermYears = 7;
const rateUsed = 0.0949;

console.log('=== Working Backwards from $3,251.14 ===\n');

const n = loanTermYears * 12;
const i = rateUsed / 12;

console.log('Target Monthly Payment:', '$' + targetPayment.toFixed(2));
console.log('Loan Term:', loanTermYears, 'years');
console.log('Interest Rate:', (rateUsed * 100).toFixed(2) + '%');
console.log('Monthly Rate (i):', (i * 100).toFixed(6) + '%');
console.log('Number of Payments (n):', n);

console.log('\n=== Assuming Payment in Advance ===');
const paymentInArrears = targetPayment * (1 + i);
console.log('Equivalent Arrears Payment:', paymentInArrears.toFixed(2));

const principal = (paymentInArrears * (Math.pow(1 + i, n) - 1)) / (i * Math.pow(1 + i, n));
console.log('Principal Amount:', principal.toFixed(2));

console.log('\n=== What project cost would give this principal? ===');
const gstRate = 0.1;
const applicationFeeIncGst = 649;
const ppsrFeeIncGst = 6;
const originationFeeRate = 0.022;

const applicationFee = applicationFeeIncGst / (1 + gstRate);
const ppsrFee = ppsrFeeIncGst / (1 + gstRate);

console.log('Application Fee (ex-GST):', applicationFee.toFixed(2));
console.log('PPSR Fee (ex-GST):', ppsrFee.toFixed(2));

const totalFixedFees = applicationFee + ppsrFee;
console.log('Total Fixed Fees:', totalFixedFees.toFixed(2));

const principalMinusFees = principal - totalFixedFees;
console.log('Principal minus fixed fees:', principalMinusFees.toFixed(2));

const invoiceExGst = principalMinusFees / (1 + originationFeeRate);
console.log('Invoice Amount Ex-GST (if 2.2% fee capitalised):', invoiceExGst.toFixed(2));

const invoiceIncGst = invoiceExGst * (1 + gstRate);
console.log('Invoice Amount Inc-GST (Project Cost):', invoiceIncGst.toFixed(2));

console.log('\n=== Verification ===');
const origFee = invoiceExGst * originationFeeRate;
const baseLoan = invoiceExGst + origFee + applicationFee + ppsrFee;
console.log('Origination Fee:', origFee.toFixed(2));
console.log('Recalculated Base Loan:', baseLoan.toFixed(2));
console.log('Matches our principal?', Math.abs(baseLoan - principal) < 0.01);

console.log('\n=== Maybe the portal is showing $200K project cost? ===');
const projectCost200k = 200000;
const invoiceExGst200k = projectCost200k / (1 + gstRate);
const origFee200k = invoiceExGst200k * originationFeeRate;
const baseLoan200k = invoiceExGst200k + origFee200k + applicationFee + ppsrFee;
console.log('$200K Project Cost -> Base Loan:', baseLoan200k.toFixed(2));

const payment200k = (baseLoan200k * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
const payment200kInAdvance = payment200k / (1 + i);
const rounded200k = Math.ceil(payment200kInAdvance * 10) / 10;
console.log('Monthly Payment for $200K:', rounded200k.toFixed(2));
