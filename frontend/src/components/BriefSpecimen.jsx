/**
 * Hero illustration: shows, with a fixed example, what the tool does —
 * a plain-language request on top, the structured brief it becomes below.
 */
const EXAMPLE = {
  request:
    'We’re a 60-person clinic opening a second branch. Both sites need Wi-Fi for staff and patients, and our patient records must be backed up safely.',
  requirements: ['Wi-Fi at two sites, with separate staff and guest access', 'Secure backup for patient records', 'Connectivity between the two branches'],
  services: ['Networking', 'Servers & Storage', 'Cybersecurity'],
  question: 'How much patient data do you store today?',
};

export default function BriefSpecimen() {
  return (
    <figure className="relative" aria-label="Example of a request turned into a solution brief">
      <div className="rounded-lg bg-white/[0.06] p-5 ring-1 ring-white/15">
        <p className="text-sm text-sky">What the customer wrote</p>
        <blockquote className="mt-2 text-[15px] leading-relaxed text-slate-100">“{EXAMPLE.request}”</blockquote>
      </div>

      <div className="mx-6 h-6 border-x border-dashed border-white/25" aria-hidden="true" />

      <div className="rounded-lg bg-white p-5 text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
        <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
          <p className="font-display text-lg font-semibold text-navy-900">Solution brief</p>
          <p className="text-xs text-muted">Preliminary</p>
        </div>
        <p className="mt-3 text-sm font-medium text-navy-900">Requirements</p>
        <ul className="mt-1.5 space-y-1 text-sm">
          {EXAMPLE.requirements.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-medium text-navy-900">Services</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {EXAMPLE.services.map((s) => (
            <span key={s} className="rounded bg-mist px-2 py-0.5 text-xs font-medium text-navy-800">
              {s}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium text-navy-900">We’ll ask you</p>
        <p className="mt-1 text-sm text-muted">{EXAMPLE.question}</p>
      </div>
      <figcaption className="mt-3 text-xs text-slate-400">Illustrative example</figcaption>
    </figure>
  );
}
