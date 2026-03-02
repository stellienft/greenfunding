// What is 1.34% made up of?
const invoiceExGst = 250000;
const targetPrincipal = 253346.28;
const difference = targetPrincipal - invoiceExGst;

console.log('Invoice ex-GST:', invoiceExGst);
console.log('Target principal:', targetPrincipal);
console.log('Difference:', difference);
console.log('As % of invoice:', (difference / invoiceExGst * 100).toFixed(4) + '%');

console.log('\n--- Testing different fee combinations ---');

// Option 1: Just application + PPSR (inc GST)
const appPpsr = 649 + 6;
console.log('App + PPSR (inc GST):', appPpsr);

// Option 2: App + PPSR (ex GST)
const appPpsrExGst = appPpsr / 1.1;
console.log('App + PPSR (ex GST):', appPpsrExGst);

// Option 3: 1% origination + app + ppsr ex-GST
const origFee1pct = invoiceExGst * 0.01;
const withAppPpsr = invoiceExGst + origFee1pct + appPpsrExGst;
console.log('\nInvoice + 1% origination + app/ppsr (ex-GST):', withAppPpsr);

// Option 4: Just 1% origination + app inc-GST + ppsr inc-GST
const with1pct = invoiceExGst + origFee1pct + 649 + 6;
console.log('Invoice + 1% + app/ppsr (inc-GST):', with1pct);

// Option 5: Let's try working with the exact number
console.log('\n--- Breaking down $253,346.28 ---');
const remainder = 253346.28 - 250000;
console.log('$250,000 + $' + remainder.toFixed(2) + ' = $253,346.28');

// Could this be: invoice + fees with no origination?
const justAppPpsr = 250000 + 655;
console.log('\nInvoice + $655 = $' + justAppPpsr);

// Could be: invoice + 1% + something
const onePctFee = 250000 * 0.01;
console.log('\n1% of $250k:', onePctFee);
console.log('$250k + 1% + $846.28:', 250000 + 2500 + 846.28);

// Or maybe: invoice + app/ppsr inc-GST + small origination
console.log('\n$250k + $655 + $2,691.28:', 250000 + 655 + 2691.28);
console.log('$2,691.28 as % of $250k:', (2691.28 / 250000 * 100).toFixed(2) + '%');
