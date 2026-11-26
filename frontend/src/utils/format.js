export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'quotation_prepared', label: 'Quotation prepared' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export const statusLabel = (value) => STATUS_OPTIONS.find((s) => s.value === value)?.label || value;

export const formatDate = (d, withTime = false) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : '';

export const formatMoney = (n, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(n) || 0);

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
