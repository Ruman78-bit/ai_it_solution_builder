import { Link } from 'react-router-dom';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-signal text-white hover:bg-signal-dark disabled:bg-signal/50',
  secondary: 'bg-white text-ink border border-line hover:border-navy-700 hover:bg-mist disabled:text-muted',
  inverse: 'bg-white text-navy-900 hover:bg-mist',
  ghost: 'text-signal hover:bg-mist disabled:text-muted',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-12 px-6 text-base',
};

export default function Button({ variant = 'primary', size = 'md', loading = false, to, className = '', children, disabled, ...rest }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
