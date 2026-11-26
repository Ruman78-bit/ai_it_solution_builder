/**
 * Admin quotation editor. All prices are typed by the admin; the totals shown
 * here are a live preview, and the server recomputes them on save.
 * Workflow: Save draft -> Approve -> Download PDF / Send to customer.
 */
import { useEffect, useMemo, useState } from 'react';
import Button from './ui/Button';
import { Alert } from './ui/Feedback';
import StatusBadge from './ui/StatusBadge';
import * as adminService from '../services/adminService';
import { formatDate, formatMoney, round2 } from '../utils/format';

const blankItem = (taxRate) => ({ description: '', quantity: 1, unit: 'Nos', unitPrice: '', taxRate });

const toForm = (q, defaults) =>
  q
    ? {
        items: q.items.map((i) => ({ description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, taxRate: i.taxRate })),
        validUntil: q.validUntil.slice(0, 10),
        terms: q.terms || '',
        notes: q.notes || '',
      }
    : { items: [blankItem(defaults.taxRate)], validUntil: defaults.validUntil, terms: defaults.terms, notes: '' };

const cellInput =
  'h-10 w-full rounded border bg-white px-2.5 text-sm focus:border-signal focus:outline-none focus:ring-2 focus:ring-signal/30';

export default function QuotationEditor({ enquiry, quotation, onChange }) {
  const [defaults, setDefaults] = useState(null);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null); // { type, text }

  useEffect(() => {
    adminService
      .getQuotationDefaults()
      .then((d) => {
        setDefaults(d);
        setForm(toForm(quotation, d));
      })
      .catch((err) => setMessage({ type: 'error', text: err.message }));
    // Only initialise once per enquiry; later updates come from our own actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiry._id]);

  const preview = useMemo(() => {
    if (!form) return null;
    const lines = form.items.map((i) => {
      const sub = round2((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0));
      const tax = round2((sub * (Number(i.taxRate) || 0)) / 100);
      return { sub, tax, total: round2(sub + tax) };
    });
    const subtotal = round2(lines.reduce((s, l) => s + l.sub, 0));
    const taxTotal = round2(lines.reduce((s, l) => s + l.tax, 0));
    return { lines, subtotal, taxTotal, total: round2(subtotal + taxTotal) };
  }, [form]);

  if (!form) return message ? <Alert type="error">{message.text}</Alert> : null;

  const edit = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
    setMessage(null);
  };
  const editItem = (idx, key, value) => {
    edit({ items: form.items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)) });
    setErrors((e) => ({ ...e, [`items.${idx}.${key}`]: undefined }));
  };

  const run = async (name, fn, success) => {
    setBusy(name);
    setMessage(null);
    try {
      const result = await fn();
      if (success) setMessage({ type: 'success', text: success(result) });
      return result;
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage({ type: 'error', text: err.message });
      return null;
    } finally {
      setBusy('');
    }
  };

  const save = () =>
    run(
      'save',
      async () => {
        const body = {
          ...form,
          items: form.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: i.unitPrice === '' ? '' : Number(i.unitPrice), taxRate: Number(i.taxRate) })),
        };
        const res = await adminService.saveQuotation(enquiry._id, body);
        setErrors({});
        setDirty(false);
        onChange(res.quotation, res.enquiryStatus);
        return res;
      },
      (res) => `Draft ${res.quotation.quoteNumber} saved. Approve it when the prices are final.`
    );

  const approve = () =>
    run(
      'approve',
      async () => {
        const res = await adminService.approveQuotation(enquiry._id);
        onChange(res.quotation);
        return res;
      },
      () => 'Quotation approved. You can now download it or send it to the customer.'
    );

  const send = async () => {
    if (!window.confirm(`Email quotation ${quotation.quoteNumber} to ${enquiry.customer.email}?`)) return;
    await run(
      'send',
      async () => {
        const res = await adminService.sendQuotation(enquiry._id);
        onChange(res.quotation, res.enquiryStatus);
        return res;
      },
      () => `Quotation sent to ${enquiry.customer.email}.`
    );
  };

  const download = () => run('pdf', () => adminService.downloadQuotationPdf(enquiry._id), (name) => `Downloaded ${name}.`);

  const status = quotation?.status;
  const err = (k) => errors[k];

  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">Quotation</h2>
          <p className="text-sm text-muted">
            {quotation
              ? `${quotation.quoteNumber}, last updated ${formatDate(quotation.updatedAt, true)}`
              : 'Enter approved prices to prepare a quotation. AI suggestions are never used as prices.'}
          </p>
        </div>
        {status && <StatusBadge status={status} kind="quotation" />}
      </div>

      <div className="space-y-6 p-5">
        {message && (
          <Alert type={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        {quotation?.lastEmail && !quotation.lastEmail.success && (
          <Alert type="warning" title="Last email attempt failed">
            {quotation.lastEmail.error} ({formatDate(quotation.lastEmail.attemptedAt, true)})
          </Alert>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th scope="col" className="pb-2 pr-2 font-medium">Description</th>
                <th scope="col" className="w-20 pb-2 pr-2 font-medium">Qty</th>
                <th scope="col" className="w-20 pb-2 pr-2 font-medium">Unit</th>
                <th scope="col" className="w-32 pb-2 pr-2 font-medium">Unit price ({defaults.currency})</th>
                <th scope="col" className="w-20 pb-2 pr-2 font-medium">Tax %</th>
                <th scope="col" className="w-32 pb-2 pr-2 text-right font-medium">Amount</th>
                <th scope="col" className="w-10 pb-2"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, idx) => (
                <tr key={idx} className="align-top">
                  {[
                    ['description', 'text', 'Item or service description'],
                    ['quantity', 'number'],
                    ['unit', 'text'],
                    ['unitPrice', 'number'],
                    ['taxRate', 'number'],
                  ].map(([key, type, placeholder]) => (
                    <td key={key} className="py-1.5 pr-2">
                      <input
                        type={type}
                        inputMode={type === 'number' ? 'decimal' : undefined}
                        min={type === 'number' ? 0 : undefined}
                        step={type === 'number' ? 'any' : undefined}
                        value={it[key]}
                        placeholder={placeholder}
                        onChange={(e) => editItem(idx, key, e.target.value)}
                        aria-label={`Line ${idx + 1} ${key}`}
                        aria-invalid={Boolean(err(`items.${idx}.${key}`))}
                        title={err(`items.${idx}.${key}`)}
                        className={`${cellInput} ${err(`items.${idx}.${key}`) ? 'border-red-500' : 'border-line'} ${type === 'number' ? 'text-right' : ''}`}
                      />
                      {err(`items.${idx}.${key}`) && <p className="mt-1 text-xs text-red-700">{err(`items.${idx}.${key}`)}</p>}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-1.5 pr-2 pt-4 text-right tabular-nums">{formatMoney(preview.lines[idx].total, defaults.currency)}</td>
                  <td className="py-1.5 pt-2.5">
                    <button
                      type="button"
                      onClick={() => edit({ items: form.items.filter((_, i) => i !== idx) })}
                      disabled={form.items.length === 1}
                      className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                      aria-label={`Remove line ${idx + 1}`}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {err('items') && <p className="text-sm text-red-700">{err('items')}</p>}

        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <Button variant="secondary" size="sm" onClick={() => edit({ items: [...form.items, blankItem(defaults.taxRate)] })}>
            Add line item
          </Button>
          <dl className="w-full space-y-1 text-sm md:w-72">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(preview.subtotal, defaults.currency)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Taxes</dt><dd className="tabular-nums">{formatMoney(preview.taxTotal, defaults.currency)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-navy-900"><dt>Total</dt><dd className="tabular-nums">{formatMoney(preview.total, defaults.currency)}</dd></div>
          </dl>
        </div>

        <div className="grid gap-5 md:grid-cols-[200px_1fr]">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Valid until</span>
            <input type="date" value={form.validUntil} onChange={(e) => edit({ validUntil: e.target.value })} className={`${cellInput} h-11 ${err('validUntil') ? 'border-red-500' : 'border-line'}`} />
            {err('validUntil') && <p className="mt-1 text-xs text-red-700">{err('validUntil')}</p>}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Notes to customer <span className="font-normal text-muted">(optional)</span></span>
            <input type="text" maxLength={2000} value={form.notes} onChange={(e) => edit({ notes: e.target.value })} className={`${cellInput} h-11 border-line`} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Terms and conditions</span>
          <textarea rows={5} maxLength={5000} value={form.terms} onChange={(e) => edit({ terms: e.target.value })} className={`${cellInput} h-auto border-line py-2 leading-relaxed`} />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <Button onClick={save} loading={busy === 'save'} disabled={Boolean(busy) || (!dirty && Boolean(quotation))}>
            {quotation ? 'Save changes as draft' : 'Save draft'}
          </Button>
          {quotation && status === 'draft' && (
            <Button variant="secondary" onClick={approve} loading={busy === 'approve'} disabled={Boolean(busy) || dirty}>
              Approve quotation
            </Button>
          )}
          {quotation && (status === 'approved' || status === 'sent') && (
            <Button onClick={send} loading={busy === 'send'} disabled={Boolean(busy) || dirty}>
              {status === 'sent' ? 'Send again' : 'Send to customer'}
            </Button>
          )}
          {quotation && (
            <Button variant="ghost" onClick={download} loading={busy === 'pdf'} disabled={Boolean(busy)}>
              {status === 'draft' ? 'Download draft PDF' : 'Download PDF'}
            </Button>
          )}
          {dirty && quotation && <span className="text-sm text-amber-800">Unsaved changes. Saving returns the quotation to draft.</span>}
        </div>
        {quotation?.approvedAt && status !== 'draft' && (
          <p className="text-sm text-muted">
            Approved by {quotation.approvedBy?.name || 'an administrator'} on {formatDate(quotation.approvedAt, true)}
            {quotation.sentAt && `. Sent ${formatDate(quotation.sentAt, true)}`}.
          </p>
        )}
      </div>
    </div>
  );
}
