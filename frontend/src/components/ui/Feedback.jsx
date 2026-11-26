import Spinner from './Spinner';
import Button from './Button';

const ALERT = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-line bg-mist text-ink',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

export function Alert({ type = 'info', title, children, onClose, className = '' }) {
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-md border px-4 py-3 text-sm ${ALERT[type]} ${className}`}>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="self-start opacity-70 hover:opacity-100" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-48 items-center justify-center text-signal">
      <Spinner className="h-6 w-6" label={label} />
    </div>
  );
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-medium text-ink">{error?.message || 'This page could not be loaded.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-14 text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
