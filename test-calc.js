const principal = 148926.30;
const annualRate = 0.0949;
const monthlyRate = annualRate / 12;
const months = 84;

const pow = Math.pow(1 + monthlyRate, months);
const standardPayment = (principal * monthlyRate * pow) / (pow - 1);
const advancePayment = standardPayment / (1 + monthlyRate);

console.log('Principal:', principal);
console.log('Annual Rate:', (annualRate * 100).toFixed(2) + '%');
console.log('Monthly Rate:', monthlyRate);
console.log('Months:', months);
console.log('---');
console.log('Standard Payment (Arrears):', standardPayment.toFixed(2));
console.log('Advance Payment:', advancePayment.toFixed(2));
console.log('Expected from Angle:', '2655.62');
