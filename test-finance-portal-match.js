// Test to match finance portal calculation
// Total asset value incl. GST: $200,000
// Commission: 2.2%
// Term: 84 months (7 years)
// Interest rate: 9.49%
// Payment timing: Advance

const totalAssetValueIncGst = 200000;
const gstRate = 0.10;
const commissionPercent = 0.022; // 2.2%
const establishmentFeeIncGst = 649;
const ppsrFeeIncGst = 6;
const originationFeeIncGst = 0;
const maintenanceChargeIncGst = 0;
const interestRate = 0.0949; // 9.49%
const termMonths = 84;

console.log('=== Finance Portal Matching Test ===');
console.log('');

// Step 1: Calculate ex-GST amount
const assetValueExGst = totalAssetValueIncGst / (1 + gstRate);
const gstAmount = totalAssetValueIncGst - assetValueExGst;

console.log('Asset Value (inc GST):', totalAssetValueIncGst.toFixed(2));
console.log('GST:', gstAmount.toFixed(2));
console.log('Asset Value (ex GST):', assetValueExGst.toFixed(2));
console.log('');

// Step 2: Calculate commission
// Commission is calculated on the ex-GST amount
const commissionExGst = assetValueExGst * commissionPercent;
const commissionGst = commissionExGst * gstRate;
const commissionIncGst = commissionExGst + commissionGst;

console.log('=== Commission Calculation ===');
console.log('Commission Rate:', (commissionPercent * 100).toFixed(1) + '%');
console.log('Commission (ex GST):', commissionExGst.toFixed(2));
console.log('Commission GST:', commissionGst.toFixed(2));
console.log('Commission (inc GST):', commissionIncGst.toFixed(2));
console.log('Portal shows: $4,400.00');
console.log('');

// Step 3: Build up the financed amount
let financedAmount = assetValueExGst;

console.log('=== Building Financed Amount ===');
console.log('Asset Value (ex GST):', assetValueExGst.toFixed(2));

// Add commission (inc GST)
financedAmount += commissionIncGst;
console.log('+ Commission (inc GST):', commissionIncGst.toFixed(2));

// Add establishment fee (inc GST)
financedAmount += establishmentFeeIncGst;
console.log('+ Establishment Fee (inc GST):', establishmentFeeIncGst.toFixed(2));

// Add PPSR fee (inc GST)
financedAmount += ppsrFeeIncGst;
console.log('+ PPSR Fee (inc GST):', ppsrFeeIncGst.toFixed(2));

// Add origination fee (inc GST)
financedAmount += originationFeeIncGst;
console.log('+ Origination Fee (inc GST):', originationFeeIncGst.toFixed(2));

console.log('= Total Financed Amount:', financedAmount.toFixed(2));
console.log('');

// Step 4: Calculate monthly payment in advance
const monthlyRate = interestRate / 12;
const n = termMonths;

console.log('=== Payment Calculation ===');
console.log('Interest Rate:', (interestRate * 100).toFixed(2) + '%');
console.log('Term:', termMonths, 'months');
console.log('Monthly Rate:', (monthlyRate * 100).toFixed(4) + '%');
console.log('');

// Payment in arrears formula
const pow = Math.pow(1 + monthlyRate, n);
const paymentArrears = (financedAmount * monthlyRate * pow) / (pow - 1);

// Payment in advance = Payment in arrears / (1 + monthly rate)
const paymentAdvance = paymentArrears / (1 + monthlyRate);

console.log('Payment in Arrears:', paymentArrears.toFixed(2));
console.log('Payment in Advance:', paymentAdvance.toFixed(2));
console.log('Portal shows: $3,021.90');
console.log('');

console.log('=== Difference Analysis ===');
const difference = paymentAdvance - 3021.90;
console.log('Our calculation:', paymentAdvance.toFixed(2));
console.log('Portal shows:', '3021.90');
console.log('Difference:', difference.toFixed(2));
