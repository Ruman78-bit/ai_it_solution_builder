/**
 * Quotation arithmetic. Totals are always recomputed here from admin-entered
 * quantities, unit prices and tax rates; client-supplied totals are ignored.
 */
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function computeLine(item) {
  const lineSubtotal = round2(item.quantity * item.unitPrice);
  const lineTax = round2((lineSubtotal * item.taxRate) / 100);
  return {
    description: item.description,
    quantity: item.quantity,
    unit: item.unit || 'Nos',
    unitPrice: round2(item.unitPrice),
    taxRate: item.taxRate,
    lineSubtotal,
    lineTax,
    lineTotal: round2(lineSubtotal + lineTax),
  };
}

function computeTotals(items) {
  const lines = items.map(computeLine);
  const subtotal = round2(lines.reduce((s, l) => s + l.lineSubtotal, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.lineTax, 0));
  return { items: lines, subtotal, taxTotal, total: round2(subtotal + taxTotal) };
}

function formatMoney(amount, currency = 'INR') {
  const n = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${currency} ${n}`;
}

module.exports = { computeTotals, computeLine, formatMoney, round2 };
