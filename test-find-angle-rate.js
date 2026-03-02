// Find what rate or principal Angle Finance is using
const targetPayment = 2655.62;
const months = 84;
const paymentTiming = 'advance';

function calculatePaymentAdvance(principal, annualRate, months) {
  const i = annualRate / 12;
  const pow = Math.pow(1 + i, months);
  const standard = (principal * i * pow) / (pow - 1);
  return standard / (1 + i);
}

function calculatePaymentArrears(principal, annualRate, months) {
  const i = annualRate / 12;
  const pow = Math.pow(1 + i, months);
  return (principal * i * pow) / (pow - 1);
}

// Test 1: Using the expected principal of 152202.68
console.log('=== TEST 1: Finding rate for principal $152,202.68 ===');
const principal1 = 152202.68;
for (let rate = 0.09; rate <= 0.15; rate += 0.0001) {
  const payment = calculatePaymentAdvance(principal1, rate, months);
  if (Math.abs(payment - targetPayment) < 0.5) {
    console.log(`Rate: ${(rate * 100).toFixed(2)}% → Payment: $${payment.toFixed(2)}`);
  }
}

// Test 2: Using principal with commission added
console.log('\n=== TEST 2: Finding rate for principal $159,984.33 (with commission) ===');
const principal2 = 159984.33;
for (let rate = 0.09; rate <= 0.15; rate += 0.0001) {
  const payment = calculatePaymentAdvance(principal2, rate, months);
  if (Math.abs(payment - targetPayment) < 0.5) {
    console.log(`Rate: ${(rate * 100).toFixed(2)}% → Payment: $${payment.toFixed(2)}`);
  }
}

// Test 3: Using 9.49% rate, find what principal they're using
console.log('\n=== TEST 3: Finding principal for rate 9.49% ===');
const rate = 0.0949;
for (let principal = 150000; principal <= 170000; principal += 100) {
  const payment = calculatePaymentAdvance(principal, rate, months);
  if (Math.abs(payment - targetPayment) < 0.5) {
    console.log(`Principal: $${principal.toFixed(2)} → Payment: $${payment.toFixed(2)}`);
  }
}

// Test 4: Try arrears timing instead of advance
console.log('\n=== TEST 4: Testing with ARREARS timing (not advance) ===');
const paymentArrears = calculatePaymentArrears(152202.68, 0.0949, months);
console.log(`Arrears Payment: $${paymentArrears.toFixed(2)}`);

// Test 5: Check if Angle adds the origination fee separately
console.log('\n=== TEST 5: What if origination fee is NOT capitalized? ===');
const projectCost = 148926.30;
const monthlyOriginationFee = (3276.38 / months);
const basePayment = calculatePaymentAdvance(148926.30, 0.0949, months);
const totalPayment = basePayment + monthlyOriginationFee;
console.log(`Base Payment: $${basePayment.toFixed(2)}`);
console.log(`Monthly Origination Fee: $${monthlyOriginationFee.toFixed(2)}`);
console.log(`Total Payment: $${totalPayment.toFixed(2)}`);
