// Test the new calculation logic
// For $100K asset with 4.4% commission at 9.49% interest over 120 months

const assetInc = 100000;            // inc-GST
const commissionPct = 4.4;           // percentage
const annualRatePct = 9.49;          // percentage
const n = 120;                       // months
const timing = "Arrears";

// Fees
const estFeeEx = 590;                // ex-GST
const ppsrFee = 6;                   // GST-free

// Fee toggles
const financeEstFee = true;
const financePpsr = true;

// Constants
const GST = 1.10;

console.log("=== NEW CALCULATION LOGIC ===\n");

// 1) Convert asset + commission from inc-GST to ex-GST
const assetEx = assetInc / GST;
console.log(`1. Asset ex-GST: $${assetEx.toFixed(2)}`);

const commissionInc = assetInc * (commissionPct / 100);
console.log(`2. Commission inc-GST: $${commissionInc.toFixed(2)}`);

const commissionEx = commissionInc / GST;
console.log(`3. Commission ex-GST: $${commissionEx.toFixed(2)}`);

// 2) Principal (ex-GST basis) with optional fees
const principal =
  assetEx +
  commissionEx +
  (financeEstFee ? estFeeEx : 0) +
  (financePpsr ? ppsrFee : 0);

console.log(`\n4. Building Principal (ex-GST):`);
console.log(`   Asset ex-GST:        $${assetEx.toFixed(2)}`);
console.log(`   Commission ex-GST:   $${commissionEx.toFixed(2)}`);
console.log(`   Est Fee ex-GST:      $${estFeeEx.toFixed(2)}`);
console.log(`   PPSR Fee:            $${ppsrFee.toFixed(2)}`);
console.log(`   PRINCIPAL TOTAL:     $${principal.toFixed(2)}`);

// 3) Rate
const r = (annualRatePct / 100) / 12;
console.log(`\n5. Monthly interest rate: ${(r * 100).toFixed(4)}%`);

// 4) PMT in arrears (ex-GST)
const disc = Math.pow(1 + r, -n);
const pmtArrearsEx = (principal * r) / (1 - disc);
console.log(`6. PMT arrears ex-GST: $${pmtArrearsEx.toFixed(2)}`);

// 5) Convert to advance if needed
const pmtEx = (timing.toLowerCase() === "advance")
  ? (pmtArrearsEx / (1 + r))
  : pmtArrearsEx;

console.log(`7. PMT ${timing} ex-GST: $${pmtEx.toFixed(2)}`);

// 6) Display as "inc-GST equivalent"
const pmtInc = pmtEx * GST;
console.log(`8. PMT ${timing} inc-GST: $${pmtInc.toFixed(2)}`);

// 7) Round to cents
const outputPaymentExGST = Math.round(pmtEx * 100) / 100;
const outputPaymentIncGST = Math.round(pmtInc * 100) / 100;

console.log(`\n=== FINAL RESULTS ===`);
console.log(`Monthly Payment (ex-GST): $${outputPaymentExGST.toFixed(2)}`);
console.log(`Monthly Payment (inc-GST): $${outputPaymentIncGST.toFixed(2)}`);
console.log(`Total Repayment: $${(outputPaymentIncGST * n).toFixed(2)}`);

console.log(`\n=== COMMISSION BREAKDOWN ===`);
console.log(`Commission rate: ${commissionPct}%`);
console.log(`Commission on $${assetInc}: $${commissionInc.toFixed(2)} inc-GST`);
console.log(`Commission ex-GST: $${commissionEx.toFixed(2)}`);
