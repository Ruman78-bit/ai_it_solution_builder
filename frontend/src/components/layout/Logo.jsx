import { Link } from 'react-router-dom';

export default function Logo({ inverse = false, to = '/', suffix }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Cyber Communications home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill={inverse ? '#fff' : '#0A1F38'} />
        <path d="M9 11h14M9 16h9M9 21h11" stroke={inverse ? '#2563C9' : '#7FB0F5'} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className={`font-display text-lg font-semibold leading-none ${inverse ? 'text-white' : 'text-navy-900'}`}>
        Cyber Communications
        {suffix && <span className={`ml-2 font-sans text-sm font-normal ${inverse ? 'text-sky' : 'text-muted'}`}>{suffix}</span>}
      </span>
    </Link>
  );
}
