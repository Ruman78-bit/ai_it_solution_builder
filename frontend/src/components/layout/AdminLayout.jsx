import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';
import { LoadingBlock } from '../ui/Feedback';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/enquiries', label: 'Enquiries' },
];

/** Shell for all admin pages. Also acts as the route guard: unauthenticated users go to the login page. */
export default function AdminLayout() {
  const { admin, checking, logout } = useAuth();
  const location = useLocation();

  if (checking) return <LoadingBlock label="Checking your session…" />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen bg-mist/60">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-8">
            <Logo inverse to="/admin" suffix="Admin" />
            <nav className="hidden gap-1 sm:flex" aria-label="Admin">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:text-white'}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-300 md:inline">{admin.name}</span>
            <button type="button" onClick={() => logout()} className="rounded-md px-3 py-2 text-slate-200 hover:bg-white/10">
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-white/10 px-5 py-2 sm:hidden" aria-label="Admin mobile">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-white/10' : 'text-slate-300'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
