import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import BriefSpecimen from '../components/BriefSpecimen';
import { useCatalogue } from '../hooks/useCatalogue';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const STEPS = [
  {
    title: 'Describe what you need',
    body: 'Choose the services you’re interested in and explain your situation in your own words. No technical jargon needed.',
  },
  {
    title: 'Review a structured brief',
    body: 'The builder turns your description into a short brief: what you need, which services apply, and what’s still unclear.',
  },
  {
    title: 'Get a quotation from our team',
    body: 'A Cyber Communications specialist reviews your request, confirms the details with you, and sends a formal quotation.',
  },
];

const DOES = [
  'Organises your requirements into a clear brief',
  'Points out information our team will need',
  'Suggests the kinds of components a solution may include',
];

const DOESNT = [
  'Quote prices or promise discounts',
  'Confirm stock, warranty or delivery dates',
  'Make any commitment on our behalf',
];

export default function HomePage() {
  useDocumentTitle('');
  const { data } = useCatalogue();

  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="container-page grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Describe your IT needs. Get a solution brief your business can act on.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Tell Cyber Communications what your organisation is trying to do. The solution builder structures your
              request, and our specialists turn it into a quotation.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button to="/request" size="lg">
                Start a request
              </Button>
              <Button to="/services" size="lg" variant="inverse" className="!bg-transparent !text-white ring-1 ring-white/30 hover:!bg-white/10">
                Browse services
              </Button>
            </div>
            <p className="mt-5 text-sm text-slate-400">Takes about five minutes. Free, with no obligation.</p>
          </div>
          <BriefSpecimen />
        </div>
      </section>

      <section className="py-20" aria-labelledby="how-heading">
        <div className="container-page">
          <h2 id="how-heading" className="font-display text-3xl font-semibold text-navy-900">
            How it works
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t-2 border-navy-900 pt-5">
                <span className="font-display text-sm font-semibold text-signal">Step {i + 1}</span>
                <h3 className="mt-1 text-xl font-semibold text-navy-900">{s.title}</h3>
                <p className="mt-2 max-w-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line bg-mist py-20" aria-labelledby="services-heading">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="services-heading" className="font-display text-3xl font-semibold text-navy-900">
                What we can help with
              </h2>
              <p className="mt-2 max-w-xl text-muted">From a few laptops to a multi-site network, start with the area closest to your need.</p>
            </div>
            <Link to="/services" className="font-medium text-signal hover:underline">
              See all services
            </Link>
          </div>
          <ul className="mt-10 grid border-l border-t border-line bg-white sm:grid-cols-2 lg:grid-cols-4">
            {(data?.categories || []).map((c) => (
              <li key={c.id} className="border-b border-r border-line p-6">
                <h3 className="font-semibold text-navy-900">{c.name}</h3>
                <p className="mt-1.5 text-sm text-muted">{c.summary}</p>
              </li>
            ))}
            <li className="flex flex-col justify-between border-b border-r border-line bg-navy-900 p-6 text-white">
              <p className="font-semibold">Something else?</p>
              <Link to="/request" className="mt-3 text-sm font-medium text-sky hover:underline">
                Describe it in a request
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="py-20" aria-labelledby="ai-heading">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 id="ai-heading" className="font-display text-3xl font-semibold text-navy-900">
              Where the AI helps, and where people decide
            </h2>
            <p className="mt-4 max-w-md text-muted">
              The builder uses AI to make your request clearer and faster to act on. Every price and commitment comes from a
              person at Cyber Communications, in writing.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            <div className="bg-white p-6">
              <h3 className="font-semibold text-navy-900">The builder will</h3>
              <ul className="mt-4 space-y-3">
                {DOES.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px]">
                    <svg className="mt-1 h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-6">
              <h3 className="font-semibold text-navy-900">The builder won’t</h3>
              <ul className="mt-4 space-y-3">
                {DOESNT.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px]">
                    <svg className="mt-1 h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
                    </svg>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-navy-900">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Ready to describe your project?</h2>
            <p className="mt-2 text-slate-300">You’ll get a reference number as soon as you submit.</p>
          </div>
          <Button to="/request" size="lg" variant="inverse">
            Start a request
          </Button>
        </div>
      </section>
    </>
  );
}
