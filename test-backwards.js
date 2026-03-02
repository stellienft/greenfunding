const principal = 148926.30;
const targetPayment = 2655.62;
const months = 84;

function calculatePaymentArrears(p, r, n) {
  const i = r / 12;
  const pow = Math.pow(1 + i, n);
  return (p * i * pow) / (pow - 1);
}

function calculatePaymentAdvance(p, r, n) {
  const i = r / 12;
  const pow = Math.pow(1 + i, n);
  const standard = (p * i * pow) / (pow - 1);
  return standard / (1 + i);
}

console.log('Testing different rates to match Angle payment of $2,655.62:\n');

for (let rate = 0.08; rate <= 0.15; rate += 0.001) {
  const advancePayment = calculatePaymentAdvance(principal, rate, months);
  const arrearsPayment = calculatePaymentArrears(principal, rate, months);

  if (Math.abs(advancePayment - targetPayment) < 1) {
    console.log(`Rate: ${(rate * 100).toFixed(2)}% → Advance: $${advancePayment.toFixed(2)}`);
  }

  if (Math.abs(arrearsPayment - targetPayment) < 1) {
    console.log(`Rate: ${(rate * 100).toFixed(2)}% → Arrears: $${arrearsPayment.toFixed(2)}`);
  }
}
