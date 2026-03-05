// Find the correct commission rate
const projectCostIncGST = 100000;
const gstRate = 0.10;

const applicationFee = 770;
const ppsrFee = 22;
const originationFee = 1000;

const rateUsed = 0.0949;
const loanTermYears = 10;
const months = 120;
const monthlyRate = rateUsed / 12;

const expectedPayment = 1348.16;
const arrearsEquivalent = expectedPayment * (1 + monthlyRate);
const impliedPrincipal = (arrearsEquivalent * (Math.pow(1 + monthlyRate, months) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, months));

const neededCommission = impliedPrincipal - projectCostIncGST - originationFee - applicationFee - ppsrFee;

console.log('Implied Principal:', impliedPrincipal.toFixed(2));
console.log('Needed Commission:', neededCommission.toFixed(2));
console.log('Commission as % of inc-GST:', (neededCommission / projectCostIncGST * 100).toFixed(4) + '%');

// Is this commission WITH or WITHOUT GST?
const commissionExGST = neededCommission / (1 + gstRate);
console.log('\nIf commission is inc-GST:');
console.log('  Commission ex-GST:', commissionExGST.toFixed(2));
console.log('  Rate on inc-GST:', (commissionExGST / projectCostIncGST * 100).toFixed(4) + '%');
console.log('  Rate on ex-GST:', (commissionExGST / (projectCostIncGST / (1 + gstRate)) * 100).toFixed(4) + '%');

console.log('\nIf commission is ex-GST (then add GST):');
const rateIfExGST = neededCommission / projectCostIncGST;
const commissionWithGSTAdded = (rateIfExGST * projectCostIncGST) * (1 + gstRate);
console.log('  Rate:', (rateIfExGST * 100).toFixed(4) + '%');
console.log('  Commission + GST:', commissionWithGSTAdded.toFixed(2));
console.log('  Would give principal:', (projectCostIncGST + originationFee + applicationFee + ppsrFee + commissionWithGSTAdded).toFixed(2));

// Check if 3.0625% is close
console.log('\n=== TESTING 3.0625% ===');
const testRate = 0.030625;
const testCommissionExGST = projectCostIncGST * testRate;
const testCommissionIncGST = testCommissionExGST * (1 + gstRate);
console.log('Commission ex-GST:', testCommissionExGST.toFixed(2));
console.log('Commission inc-GST:', testCommissionIncGST.toFixed(2));
const testPrincipal = projectCostIncGST + originationFee + applicationFee + ppsrFee + testCommissionIncGST;
console.log('Total Principal:', testPrincipal.toFixed(2));
let testPayment = (testPrincipal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
testPayment = testPayment / (1 + monthlyRate);
console.log('Monthly Payment:', testPayment.toFixed(2));
console.log('Expected:', expectedPayment.toFixed(2));
console.log('Difference:', (testPayment - expectedPayment).toFixed(2));
