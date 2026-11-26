import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEnquiry, updateStatus } from '../../services/adminService';
import { Alert, ErrorBlock, LoadingBlock } from '../../components/ui/Feedback';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import AnalysisPanel from '../../components/AnalysisPanel';
import QuotationEditor from '../../components/QuotationEditor';
import { useCatalogue } from '../../hooks/useCatalogue';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { STATUS_OPTIONS, formatDate, statusLabel } from '../../utils/format';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{children}</dd>
    </div>
  );
}

function StatusUpdater({ enquiry, onUpdated }) {
  const [status, setStatus] = useState(enquiry.status);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => setStatus(enquiry.status), [enquiry.status]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await updateStatus(enquiry._id, status, note);
      onUpdated(res);
      setNote('');
      setMsg({ type: 'success', text: `Status updated to ${statusLabel(res.status)}.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/30">
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Internal note <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/30" />
      </label>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <Button type="submit" size="sm" loading={saving} disabled={status === enquiry.status && !note.trim()}>
        Update status
      </Button>
    </form>
  );
}

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const { data: catalogue } = useCatalogue();
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getEnquiry(id)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error }));
  };
  useEffect(load, [id]);
  useDocumentTitle(state.data ? state.data.enquiry.reference : 'Enquiry');

  const categoriesById = useMemo(() => Object.fromEntries((catalogue?.categories || []).map((c) => [c.id, c])), [catalogue]);

  if (state.loading && !state.data) return <LoadingBlock />;
  if (state.error) return <ErrorBlock error={state.error} onRetry={load} />;

  const { enquiry, quotation } = state.data;
  const budget = catalogue?.options.budgetRanges.find((b) => b.value === enquiry.budget)?.label || enquiry.budget;

  const patchEnquiry = (patch) => setState((s) => ({ ...s, data: { ...s.data, enquiry: { ...s.data.enquiry, ...patch } } }));
  const onQuotationChange = (q, enquiryStatus) => {
    setState((s) => ({ ...s, data: { ...s.data, quotation: q } }));
    // Status may have moved automatically (e.g. to Sent); reload to get the history entry.
    if (enquiryStatus && enquiryStatus !== enquiry.status) load();
  };

  return (
    <div>
      <Link to="/admin/enquiries" className="text-sm font-medium text-signal hover:underline">
        Back to enquiries
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold text-navy-900">{enquiry.customer.company}</h1>
        <StatusBadge status={enquiry.status} />
      </div>
      <p className="mt-1 text-muted">
        {enquiry.reference}, received {formatDate(enquiry.createdAt, true)}
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-navy-900">Customer requirements</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Detail label="Industry">{enquiry.industry}</Detail>
              <Detail label="Employees">{enquiry.employeeCount}</Detail>
              <Detail label="Location">{enquiry.location}</Detail>
              <Detail label="Budget">{budget}</Detail>
              <div className="sm:col-span-2">
                <Detail label="Services">{enquiry.services.map((s) => categoriesById[s]?.name || s).join(', ')}</Detail>
              </div>
            </dl>
            <h3 className="mt-6 text-sm text-muted">Requirements as written by the customer</h3>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{enquiry.requirements}</p>
            {enquiry.notes && (
              <>
                <h3 className="mt-5 text-sm text-muted">Additional notes</h3>
                <p className="mt-1 whitespace-pre-line text-[15px]">{enquiry.notes}</p>
              </>
            )}
          </section>

          {enquiry.aiAnalysis ? (
            <AnalysisPanel analysis={enquiry.aiAnalysis} categoriesById={categoriesById} audience="admin" />
          ) : (
            <Alert type="info">The customer submitted this enquiry without a preliminary analysis.</Alert>
          )}

          <QuotationEditor enquiry={enquiry} quotation={quotation} onChange={onQuotationChange} />
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="text-lg font-semibold text-navy-900">Contact</h2>
            <dl className="mt-4 space-y-3">
              <Detail label="Name">{enquiry.customer.name}</Detail>
              <Detail label="Email">
                <a href={`mailto:${enquiry.customer.email}`} className="text-signal hover:underline">
                  {enquiry.customer.email}
                </a>
              </Detail>
              <Detail label="Phone">
                <a href={`tel:${enquiry.customer.phone.replace(/[^\d+]/g, '')}`} className="text-signal hover:underline">
                  {enquiry.customer.phone}
                </a>
              </Detail>
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold text-navy-900">Progress</h2>
            <StatusUpdater enquiry={enquiry} onUpdated={(res) => patchEnquiry(res)} />
            <h3 className="mt-6 border-t border-line pt-4 text-sm font-medium">History</h3>
            <ol className="mt-3 space-y-3">
              {[...enquiry.statusHistory].reverse().map((h, i) => (
                <li key={`${h.changedAt}-${i}`} className="border-l-2 border-line pl-3 text-sm">
                  <p className="font-medium">{statusLabel(h.status)}</p>
                  {h.note && <p className="text-ink">{h.note}</p>}
                  <p className="text-xs text-muted">
                    {formatDate(h.changedAt, true)}
                    {h.changedBy?.name ? `, ${h.changedBy.name}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
