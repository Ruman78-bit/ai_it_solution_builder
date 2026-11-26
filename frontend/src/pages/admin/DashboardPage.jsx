import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../services/adminService';
import { EmptyState, ErrorBlock, LoadingBlock } from '../../components/ui/Feedback';
import StatusBadge from '../../components/ui/StatusBadge';
import { STATUS_OPTIONS, formatDate } from '../../utils/format';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { admin } = useAuth();
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    getStats()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error }));
  };
  useEffect(load, []);

  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorBlock error={state.error} onRetry={load} />;
  const { total, pending, byStatus, recent } = state.data;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-navy-900">Welcome back, {admin.name.split(' ')[0]}</h1>
      <p className="mt-1 text-muted">Here’s where your enquiries stand.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to="/admin/enquiries" className="rounded-lg border border-line bg-white p-6 hover:border-navy-700/40">
          <p className="text-sm text-muted">Total enquiries</p>
          <p className="mt-1 font-display text-4xl font-semibold text-navy-900">{total}</p>
        </Link>
        <Link to="/admin/enquiries?status=pending" className="rounded-lg border border-amber-200 bg-amber-50/60 p-6 hover:border-amber-300">
          <p className="text-sm text-amber-900">Pending review</p>
          <p className="mt-1 font-display text-4xl font-semibold text-amber-900">{pending}</p>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_OPTIONS.map((s) => (
          <Link key={s.value} to={`/admin/enquiries?status=${s.value}`} className="bg-white px-4 py-3 hover:bg-mist">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="text-lg font-semibold text-navy-900">{byStatus[s.value] ?? 0}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-end justify-between">
        <h2 className="text-lg font-semibold text-navy-900">Latest enquiries</h2>
        <Link to="/admin/enquiries" className="text-sm font-medium text-signal hover:underline">
          View all
        </Link>
      </div>
      <div className="mt-3">
        {recent.length === 0 ? (
          <EmptyState title="No enquiries yet">New requests from the website will appear here.</EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line bg-white">
            {recent.map((e) => (
              <li key={e._id}>
                <Link to={`/admin/enquiries/${e._id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-mist/60">
                  <div>
                    <p className="font-medium text-navy-900">{e.customer.company}</p>
                    <p className="text-sm text-muted">
                      {e.reference}, {e.customer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted">{formatDate(e.createdAt)}</span>
                    <StatusBadge status={e.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
