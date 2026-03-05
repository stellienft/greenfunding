// Verification test for the new calculation method
// This should match the formula provided

console.log("=== VERIFICATION TEST ===\n");

// Test Case 1: $100K asset with 4.4% commission
const test1 = {
  assetInc: 100000,
  commissionPct: 4.4,
  annualRatePct: 9.49,
  n: 120,
  timing: "Arrears",
  estFeeEx: 590,
  ppsrFee: 6,
  financeEstFee: true,
  financePpsr: true
};

function calculate(params) {
  const { assetInc, commissionPct, annualRatePct, n, timing, estFeeEx, ppsrFee, financeEstFee, financePpsr } = params;
  const GST = 1.10;

  // Convert asset + commission from inc-GST to ex-GST
  const assetEx = assetInc / GST;
  const commissionInc = assetInc * (commissionPct / 100);
  const commissionEx = commissionInc / GST;

  // Principal (ex-GST basis) with optional fees
  const principal =
    assetEx +
    commissionEx +
    (financeEstFee ? estFeeEx : 0) +
    (financePpsr ? ppsrFee : 0);

  // Rate
  const r = (annualRatePct / 100) / 12;

  // PMT in arrears (ex-GST)
  const disc = Math.pow(1 + r, -n);
  const pmtArrearsEx = (principal * r) / (1 - disc);

  // Convert to advance if needed
  const pmtEx = (timing.toLowerCase() === "advance")
    ? (pmtArrearsEx / (1 + r))
    : pmtArrearsEx;

  // Display as "inc-GST equivalent"
  const pmtInc = pmtEx * GST;

  // Round to cents
  const outputPaymentExGST = Math.round(pmtEx * 100) / 100;
  const outputPaymentIncGST = Math.round(pmtInc * 100) / 100;

  return {
    assetEx,
    assetInc,
    commissionInc,
    commissionEx,
    principal,
    pmtEx: outputPaymentExGST,
    pmtInc: outputPaymentIncGST,
    totalRepayment: outputPaymentExGST * n,
    totalRepaymentInc: outputPaymentIncGST * n
  };
}

console.log("TEST 1: $100K asset, 4.4% commission, 9.49% interest, 120 months");
const result1 = calculate(test1);
console.log(`Asset inc-GST: $${result1.assetInc.toFixed(2)}`);
console.log(`Asset ex-GST: $${result1.assetEx.toFixed(2)}`);
console.log(`Commission inc-GST: $${result1.commissionInc.toFixed(2)}`);
console.log(`Commission ex-GST: $${result1.commissionEx.toFixed(2)}`);
console.log(`Principal (ex-GST): $${result1.principal.toFixed(2)}`);
console.log(`Monthly Payment (ex-GST): $${result1.pmtEx.toFixed(2)}`);
console.log(`Monthly Payment (inc-GST): $${result1.pmtInc.toFixed(2)}`);
console.log(`Total Repayment (ex-GST): $${result1.totalRepayment.toFixed(2)}`);
console.log(`Total Repayment (inc-GST): $${result1.totalRepaymentInc.toFixed(2)}`);

console.log("\n=== KEY VERIFICATION ===");
console.log(`✓ Commission on $100K should be $4,400 inc-GST: ${result1.commissionInc === 4400 ? 'PASS' : 'FAIL'}`);
console.log(`✓ Commission ex-GST should be $4,000: ${Math.abs(result1.commissionEx - 4000) < 0.01 ? 'PASS' : 'FAIL'}`);
console.log(`✓ Asset ex-GST should be $90,909.09: ${Math.abs(result1.assetEx - 90909.09) < 0.01 ? 'PASS' : 'FAIL'}`);
console.log(`✓ Monthly payment ex-GST should be $1,235.29: ${Math.abs(result1.pmtEx - 1235.29) < 0.01 ? 'PASS' : 'FAIL'}`);
console.log(`✓ Monthly payment inc-GST should be $1,358.82: ${Math.abs(result1.pmtInc - 1358.82) < 0.01 ? 'PASS' : 'FAIL'}`);

// Test Case 2: Without fees
console.log("\n\nTEST 2: $100K asset, 4.4% commission, 9.49% interest, 120 months (NO FEES)");
const test2 = { ...test1, financeEstFee: false, financePpsr: false };
const result2 = calculate(test2);
console.log(`Principal (ex-GST): $${result2.principal.toFixed(2)}`);
console.log(`Monthly Payment (ex-GST): $${result2.pmtEx.toFixed(2)}`);
console.log(`Monthly Payment (inc-GST): $${result2.pmtInc.toFixed(2)}`);

// Test Case 3: Advance timing
console.log("\n\nTEST 3: $100K asset, 4.4% commission, 9.49% interest, 120 months (ADVANCE)");
const test3 = { ...test1, timing: "Advance" };
const result3 = calculate(test3);
console.log(`Monthly Payment (ex-GST): $${result3.pmtEx.toFixed(2)}`);
console.log(`Monthly Payment (inc-GST): $${result3.pmtInc.toFixed(2)}`);
console.log(`Difference from Arrears: $${(result1.pmtEx - result3.pmtEx).toFixed(2)}`);
