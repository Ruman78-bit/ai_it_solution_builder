import Button from '../components/ui/Button';
import { ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { useCatalogue } from '../hooks/useCatalogue';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ServicesPage() {
  useDocumentTitle('Services');
  const { data, loading, error, retry } = useCatalogue();
  const anyUnverified = data?.categories.some((c) => !c.verified);

  return (
    <div className="container-page py-14 md:py-20">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold text-navy-900">Services</h1>
        <p className="mt-3 text-lg text-muted">
          The areas you can request help with. Select one or more when you start a request, and tell us the details in
          your own words.
        </p>
      </div>

      {anyUnverified && (
        <p className="mt-6 max-w-2xl rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This catalogue is a working draft for the solution builder. Service details are pending confirmation by Cyber
          Communications.
        </p>
      )}

      {loading && <LoadingBlock />}
      {error && <ErrorBlock error={error} onRetry={retry} />}

      {data && (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {data.categories.map((c) => (
            <li key={c.id} className="grid gap-4 py-8 md:grid-cols-[1fr_1.4fr] md:gap-10">
              <div>
                <h2 className="font-display text-2xl font-semibold text-navy-900">{c.name}</h2>
                {!c.verified && <p className="mt-1 text-xs text-amber-800">Pending company confirmation</p>}
              </div>
              <div>
                <p className="text-[17px]">{c.summary}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {c.examples.map((e) => (
                    <li key={e} className="rounded-md bg-mist px-3 py-1 text-sm text-navy-800">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-14 flex flex-wrap items-center gap-4">
        <Button to="/request" size="lg">
          Start a request
        </Button>
        <p className="text-muted">Not sure which service fits? Describe the problem and we’ll work it out with you.</p>
      </div>
    </div>
  );
}
