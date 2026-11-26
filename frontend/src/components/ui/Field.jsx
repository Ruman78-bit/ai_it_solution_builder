/**
 * Accessible form controls: every control has a visible label, hint and error
 * text are linked with aria-describedby, and invalid fields set aria-invalid.
 */
import { useId } from 'react';

const base =
  'block w-full rounded-md border bg-white px-3 text-[15px] text-ink placeholder:text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-signal/30';
const stateCls = (error) => (error ? 'border-red-500 focus:border-red-500' : 'border-line focus:border-signal');

function Wrapper({ id, label, hint, error, required, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {!required && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id, hint, error) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({ label, hint, error, required = true, className, type = 'text', ...rest }) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        type={type}
        className={`${base} ${stateCls(error)} h-11`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        aria-required={required}
        {...rest}
      />
    </Wrapper>
  );
}

export function TextArea({ label, hint, error, required = true, className, rows = 5, ...rest }) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        className={`${base} ${stateCls(error)} py-2.5 leading-relaxed`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        aria-required={required}
        {...rest}
      />
    </Wrapper>
  );
}

export function SelectField({ label, hint, error, required = true, className, options, placeholder = 'Select…', ...rest }) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        id={id}
        className={`${base} ${stateCls(error)} h-11 pr-8`}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        aria-required={required}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Wrapper>
  );
}
