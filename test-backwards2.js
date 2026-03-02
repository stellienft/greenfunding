const principal = 148926.30;
const targetPayment = 2655.62;
const months = 84;

function calculatePaymentArrears(p, r, n) {
  const i = r / 12;
  const pow = Math.pow(1 + i, n);
  return (p * i * pow) / (pow - 1);
}

console.log('Testing arrears (standard) payments:\n');

for (let rate = 0.08; rate <= 0.20; rate += 0.0001) {
  const payment = calculatePaymentArrears(principal, rate, months);

  if (Math.abs(payment - targetPayment) < 0.5) {
    console.log(`Rate: ${(rate * 100).toFixed(3)}% → Payment: $${payment.toFixed(2)}`);
  }
}

console.log('\n---');
console.log('Current config (9.49% arrears):', calculatePaymentArrears(principal, 0.0949, months).toFixed(2));
