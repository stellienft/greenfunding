// Test different commission calculation methods

const totalAssetValueIncGst = 200000;
const gstRate = 0.10;
const commissionPercent = 0.022; // 2.2%
const establishmentFee = 649;
const ppsrFee = 6;
const interestRate = 0.0949;
const termMonths = 84;

console.log('=== Testing Different Commission Calculation Methods ===');
console.log('');

// Method 1: Commission on ex-GST amount, then add GST to commission
console.log('METHOD 1: Commission calculated on ex-GST, GST added to commission');
const assetValueExGst1 = totalAssetValueIncGst / (1 + gstRate);
const commissionExGst1 = assetValueExGst1 * commissionPercent;
const commissionIncGst1 = commissionExGst1 * (1 + gstRate);
const financed1 = assetValueExGst1 + commissionIncGst1 + establishmentFee + ppsrFee;

console.log('Asset ex-GST:', assetValueExGst1.toFixed(2));
console.log('Commission ex-GST:', commissionExGst1.toFixed(2));
console.log('Commission inc-GST:', commissionIncGst1.toFixed(2));
console.log('Total Financed:', financed1.toFixed(2));

const monthlyRate = interestRate / 12;
const pow = Math.pow(1 + monthlyRate, termMonths);
const payment1Arrears = (financed1 * monthlyRate * pow) / (pow - 1);
const payment1Advance = payment1Arrears / (1 + monthlyRate);

console.log('Monthly Payment (Advance):', payment1Advance.toFixed(2));
console.log('');

// Method 2: Commission on total inc-GST, GST already included
console.log('METHOD 2: Commission calculated on inc-GST amount (GST already in commission)');
const commissionIncGst2 = totalAssetValueIncGst * commissionPercent;
const commissionExGst2 = commissionIncGst2 / (1 + gstRate);
const assetValueExGst2 = totalAssetValueIncGst / (1 + gstRate);
const financed2 = assetValueExGst2 + commissionIncGst2 + establishmentFee + ppsrFee;

console.log('Asset ex-GST:', assetValueExGst2.toFixed(2));
console.log('Commission inc-GST:', commissionIncGst2.toFixed(2));
console.log('Commission ex-GST (backed out):', commissionExGst2.toFixed(2));
console.log('Total Financed:', financed2.toFixed(2));

const payment2Arrears = (financed2 * monthlyRate * pow) / (pow - 1);
const payment2Advance = payment2Arrears / (1 + monthlyRate);

console.log('Monthly Payment (Advance):', payment2Advance.toFixed(2));
console.log('');

// Method 3: What if the $4,400 shown is actually ex-GST?
console.log('METHOD 3: Portal $4,400 is ex-GST, no additional GST on commission');
const assetValueExGst3 = totalAssetValueIncGst / (1 + gstRate);
const commissionExGst3 = 4000; // What they calculate
const financed3 = assetValueExGst3 + commissionExGst3 + establishmentFee + ppsrFee;

console.log('Asset ex-GST:', assetValueExGst3.toFixed(2));
console.log('Commission (no GST):', commissionExGst3.toFixed(2));
console.log('Total Financed:', financed3.toFixed(2));

const payment3Arrears = (financed3 * monthlyRate * pow) / (pow - 1);
const payment3Advance = payment3Arrears / (1 + monthlyRate);

console.log('Monthly Payment (Advance):', payment3Advance.toFixed(2));
console.log('');

console.log('=== Summary ===');
console.log('Portal target: $3,021.90');
console.log('Method 1 (commission ex-GST + GST):', payment1Advance.toFixed(2), '- Diff:', (payment1Advance - 3021.90).toFixed(2));
console.log('Method 2 (commission on inc-GST):', payment2Advance.toFixed(2), '- Diff:', (payment2Advance - 3021.90).toFixed(2));
console.log('Method 3 (commission without GST):', payment3Advance.toFixed(2), '- Diff:', (payment3Advance - 3021.90).toFixed(2));
