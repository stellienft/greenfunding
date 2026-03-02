// Trying to match portal exactly by testing if they don't include GST on commission

const totalAssetValueIncGst = 200000;
const gstRate = 0.10;
const commissionPercent = 0.022; // 2.2%
const establishmentFee = 649;
const ppsrFee = 6;
const interestRate = 0.0949;
const termMonths = 84;

console.log('=== Attempting Exact Portal Match ===');
console.log('Hypothesis: Portal does NOT include GST in commission despite label');
console.log('');

// Calculate as portal likely does it
const assetValueExGst = 181818.18; // They show this exact value
const commission = 4000.00; // 2.2% of 181818.18, NO GST added

let financedAmount = assetValueExGst + commission + establishmentFee + ppsrFee;

console.log('Asset Value (ex GST):', assetValueExGst.toFixed(2));
console.log('+ Commission (ex GST, no GST added):', commission.toFixed(2));
console.log('+ Establishment Fee:', establishmentFee.toFixed(2));
console.log('+ PPSR Fee:', ppsrFee.toFixed(2));
console.log('= Total Financed:', financedAmount.toFixed(2));
console.log('');

// Calculate payment
const monthlyRate = interestRate / 12;
const n = termMonths;
const pow = Math.pow(1 + monthlyRate, n);

const paymentArrears = (financedAmount * monthlyRate * pow) / (pow - 1);
const paymentAdvance = paymentArrears / (1 + monthlyRate);

console.log('Monthly Rate:', (monthlyRate * 100).toFixed(6) + '%');
console.log('Payment in Arrears:', paymentArrears.toFixed(2));
console.log('Payment in Advance:', paymentAdvance.toFixed(2));
console.log('Portal shows:', '3021.90');
console.log('Difference:', (paymentAdvance - 3021.90).toFixed(2));
console.log('');

// Try with more precision on asset value
const assetValueExGstPrecise = 200000 / 1.10;
const commissionPrecise = assetValueExGstPrecise * 0.022;
const financedPrecise = assetValueExGstPrecise + commissionPrecise + establishmentFee + ppsrFee;

const powPrecise = Math.pow(1 + monthlyRate, n);
const paymentArrearsPrecise = (financedPrecise * monthlyRate * powPrecise) / (powPrecise - 1);
const paymentAdvancePrecise = paymentArrearsPrecise / (1 + monthlyRate);

console.log('=== With Full Precision ===');
console.log('Asset ex-GST:', assetValueExGstPrecise.toFixed(6));
console.log('Commission:', commissionPrecise.toFixed(6));
console.log('Financed:', financedPrecise.toFixed(6));
console.log('Payment Advance:', paymentAdvancePrecise.toFixed(2));
console.log('Difference:', (paymentAdvancePrecise - 3021.90).toFixed(2));
