import { statusLabel } from '../../utils/format';

const STYLES = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  under_review: 'bg-sky-50 text-sky-800 ring-sky-200',
  quotation_prepared: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  sent: 'bg-blue-50 text-blue-800 ring-blue-200',
  accepted: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-slate-100 text-slate-700 ring-slate-300',
  draft: 'bg-slate-100 text-slate-700 ring-slate-300',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

const QUOTE_LABELS = { draft: 'Draft', approved: 'Approved', sent: 'Sent' };

export default function StatusBadge({ status, kind = 'enquiry' }) {
  const label = kind === 'quotation' ? QUOTE_LABELS[status] : statusLabel(status);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] || STYLES.draft}`}>
      {label}
    </span>
  );
}
