// Test if fees are handled differently

const projectCostIncGst = 200000;
const gstRate = 0.10;
const commissionPercent = 0.022;
const interestRate = 0.0949;
const termMonths = 84;

console.log('=== Testing Different Fee Treatments ===');
console.log('');

const invoiceExGst = projectCostIncGst / (1 + gstRate);
const commission = invoiceExGst * commissionPercent;
const monthlyRate = interestRate / 12;
const pow = Math.pow(1 + monthlyRate, termMonths);

// Scenario 1: Fees WITH GST
console.log('SCENARIO 1: Fees with GST included');
const appFee1 = 649;
const ppsrFee1 = 6;
const financed1 = invoiceExGst + commission + appFee1 + ppsrFee1;
const payment1 = ((financed1 * monthlyRate * pow) / (pow - 1)) / (1 + monthlyRate);
console.log('App Fee:', appFee1, 'PPSR Fee:', ppsrFee1);
console.log('Financed:', financed1.toFixed(2));
console.log('Payment:', payment1.toFixed(2));
console.log('');

// Scenario 2: Fees WITHOUT GST
console.log('SCENARIO 2: Fees without GST');
const appFee2 = 649 / 1.10; // 590
const ppsrFee2 = 6 / 1.10; // 5.45
const financed2 = invoiceExGst + commission + appFee2 + ppsrFee2;
const payment2 = ((financed2 * monthlyRate * pow) / (pow - 1)) / (1 + monthlyRate);
console.log('App Fee:', appFee2.toFixed(2), 'PPSR Fee:', ppsrFee2.toFixed(2));
console.log('Financed:', financed2.toFixed(2));
console.log('Payment:', payment2.toFixed(2));
console.log('');

// Scenario 3: NO fees at all
console.log('SCENARIO 3: No fees');
const financed3 = invoiceExGst + commission;
const payment3 = ((financed3 * monthlyRate * pow) / (pow - 1)) / (1 + monthlyRate);
console.log('Financed:', financed3.toFixed(2));
console.log('Payment:', payment3.toFixed(2));
console.log('');

// Scenario 4: Only PPSR fee
console.log('SCENARIO 4: Only PPSR fee (inc GST)');
const financed4 = invoiceExGst + commission + 6;
const payment4 = ((financed4 * monthlyRate * pow) / (pow - 1)) / (1 + monthlyRate);
console.log('Financed:', financed4.toFixed(2));
console.log('Payment:', payment4.toFixed(2));
console.log('');

// Scenario 5: Check if they use $590 + $5.50 instead of $5.45
console.log('SCENARIO 5: App $590 + PPSR $5.50');
const financed5 = invoiceExGst + commission + 590 + 5.50;
const payment5 = ((financed5 * monthlyRate * pow) / (pow - 1)) / (1 + monthlyRate);
console.log('Financed:', financed5.toFixed(2));
console.log('Payment:', payment5.toFixed(2));
console.log('');

console.log('Portal target: $3,021.90');
