import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from './Logo';
import Button from '../ui/Button';

const NAV = [
  { to: '/', label: 'How it works', end: true },
  { to: '/services', label: 'Services' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onRequest = pathname.startsWith('/request');

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-line bg-white">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-[15px] ${isActive ? 'font-medium text-navy-900' : 'text-muted hover:text-ink'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
            {!onRequest && (
              <Button to="/request" size="sm" className="ml-3">
                Start a request
              </Button>
            )}
          </nav>
          <button
            type="button"
            className="rounded-md p-2 text-ink md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="sr-only">Menu</span>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" className="border-t border-line md:hidden" aria-label="Mobile">
            <div className="container-page flex flex-col py-3">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className="py-2.5 text-ink">
                  {n.label}
                </NavLink>
              ))}
              <Button to="/request" className="mt-2" onClick={() => setOpen(false)}>
                Start a request
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-navy-950 text-sm text-slate-300">
        <div className="container-page grid gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo inverse />
            <p className="mt-4 max-w-sm text-slate-400">
              Tell us what your business needs. A Cyber Communications specialist reviews every request and prepares a
              quotation for you.
            </p>
          </div>
          <div>
            <p className="font-medium text-white">Solution builder</p>
            <ul className="mt-3 space-y-2">
              <li><NavLink to="/request" className="hover:text-white">Start a request</NavLink></li>
              <li><NavLink to="/services" className="hover:text-white">Services</NavLink></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-white">Company</p>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="https://cybercommunications.in" className="hover:text-white" target="_blank" rel="noreferrer">
                  cybercommunications.in
                </a>
              </li>
              <li><NavLink to="/admin/login" className="hover:text-white">Staff sign in</NavLink></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="container-page py-5 text-xs text-slate-500">
            Suggestions shown by this tool are preliminary. Prices and commitments are only those in a quotation issued by
            Cyber Communications.
          </p>
        </div>
      </footer>
    </div>
  );
}
