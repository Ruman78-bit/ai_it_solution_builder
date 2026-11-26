/** Multi-select for service categories, built on native checkboxes for keyboard and screen-reader support. */
export default function ServiceSelector({ categories, value, onChange, error }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <fieldset aria-describedby={error ? 'services-error' : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink">Services you’re interested in</legend>
      <p className="mb-3 text-sm text-muted">Choose all that apply. Not sure? Pick the closest and describe the rest below.</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {categories.map((c) => {
          const checked = value.includes(c.id);
          return (
            <label
              key={c.id}
              className={`flex cursor-pointer gap-3 rounded-md border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal/40 ${
                checked ? 'border-signal bg-signal/[0.04]' : error ? 'border-red-300' : 'border-line hover:border-navy-700/40'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-signal"
                checked={checked}
                onChange={() => toggle(c.id)}
              />
              <span>
                <span className="block font-medium">{c.name}</span>
                <span className="block text-sm text-muted">{c.summary}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="services-error" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
