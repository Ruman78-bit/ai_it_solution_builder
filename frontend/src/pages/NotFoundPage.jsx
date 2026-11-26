import Button from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="container-page max-w-xl py-24 text-center">
      <p className="font-display text-6xl font-semibold text-line">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-navy-900">This page doesn’t exist</h1>
      <p className="mt-3 text-muted">Check the address, or go back to the home page.</p>
      <Button to="/" className="mt-8">
        Go to home page
      </Button>
    </div>
  );
}
