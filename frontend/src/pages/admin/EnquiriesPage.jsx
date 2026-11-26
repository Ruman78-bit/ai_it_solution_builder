/** Enquiry list with search, status filter and pagination. Filters live in the URL so they survive refresh and can be shared. */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listEnquiries } from '../../services/adminService';
import { EmptyState, ErrorBlock } from '../../components/ui/Feedback';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { STATUS_OPTIONS, formatDate } from '../../utils/format';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function EnquiriesPage() {
  useDocumentTitle('Enquiries');
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const status = params.get('status') || '';
  const page = Number(params.get('page')) || 1;

  const [input, setInput] = useState(search);
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  // Debounce typing into the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim() !== search) update({ search: input.trim(), page: '' });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    listEnquiries({ search: search || undefined, status: status || undefined, page, limit: 15 })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error }));
  };
  useEffect(load, [search, status, page]);

  const items = state.data?.items || [];
  const pagination = state.data?.pagination;
  const filtered = Boolean(search || status);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">Enquiries</h1>
          {pagination && <p className="mt-1 text-muted">{pagination.total} {filtered ? 'matching' : 'in total'}</p>}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search enquiries</span>
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by reference, name, company or email"
            maxLength={100}
            className="h-11 w-full rounded-md border border-line bg-white px-3 text-[15px] focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/30"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={status}
            onChange={(e) => update({ status: e.target.value, page: '' })}
            className="h-11 w-full rounded-md border border-line bg-white px-3 text-[15px] focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/30 sm:w-56"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="relative mt-5">
        {state.loading && (
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-10 text-signal">
            <Spinner label="Loading enquiries…" />
          </div>
        )}
        {state.error && <ErrorBlock error={state.error} onRetry={load} />}

        {!state.error && !state.loading && items.length === 0 && (
          <EmptyState
            title={filtered ? 'No enquiries match these filters' : 'No enquiries yet'}
            action={
              filtered && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setInput('');
                    setParams({});
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          >
            {filtered ? 'Try a different search term or status.' : 'Requests submitted on the website will appear here.'}
          </EmptyState>
        )}

        {items.length > 0 && (
          <div className={`overflow-x-auto rounded-lg border border-line bg-white ${state.loading ? 'opacity-50' : ''}`}>
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-mist/70 text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Reference</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Industry</th>
                  <th scope="col" className="px-4 py-3 font-medium">Location</th>
                  <th scope="col" className="px-4 py-3 font-medium">Received</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((e) => (
                  <tr key={e._id} className="hover:bg-mist/50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/enquiries/${e._id}`} className="font-medium text-signal hover:underline">
                        {e.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-900">{e.customer.company}</p>
                      <p className="text-muted">{e.customer.name}</p>
                    </td>
                    <td className="px-4 py-3">{e.industry}</td>
                    <td className="px-4 py-3">{e.location}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
            <p className="text-sm text-muted">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= pagination.pages} onClick={() => update({ page: String(page + 1) })}>
                Next
              </Button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
