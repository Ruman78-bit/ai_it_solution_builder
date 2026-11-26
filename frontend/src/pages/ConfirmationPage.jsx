import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ConfirmationPage() {
  useDocumentTitle('Request submitted');
  const { state } = useLocation();
  const [copied, setCopied] = useState(false);
  const reference = state?.reference;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available; reference is still visible */
    }
  };

  if (!reference) {
    return (
      <div className="container-page max-w-xl py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-navy-900">No request to show</h1>
        <p className="mt-3 text-muted">If you submitted a request, check your reference number in your notes or start a new one.</p>
        <Button to="/request" className="mt-8">
          Start a request
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
        </svg>
      </div>
      <h1 className="mt-6 font-display text-4xl font-semibold text-navy-900">Request submitted</h1>
      <p className="mt-3 text-lg text-muted">Thank you. Our team has received your request and will review it.</p>

      <div className="mt-10 rounded-lg border border-line bg-mist p-6">
        <p className="text-sm text-muted">Your reference number</p>
        <div className="mt-1 flex flex-wrap items-center gap-4">
          <p className="font-display text-3xl font-semibold tracking-wide text-navy-900">{reference}</p>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted">Quote this number whenever you contact us about this request.</p>
      </div>

      <h2 className="mt-12 text-xl font-semibold text-navy-900">What happens next</h2>
      <ol className="mt-4 space-y-4">
        {[
          'A specialist reviews your requirements and the preliminary brief.',
          'We contact you if we need more information.',
          `We email your quotation${state?.email ? ` to ${state.email}` : ''}. Only that quotation contains official prices.`,
        ].map((t, i) => (
          <li key={t} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-medium text-white">{i + 1}</span>
            <span className="pt-0.5">{t}</span>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button to="/" variant="secondary">
          Back to home
        </Button>
        <Button to="/request" variant="ghost">
          Start another request
        </Button>
      </div>
    </div>
  );
}
