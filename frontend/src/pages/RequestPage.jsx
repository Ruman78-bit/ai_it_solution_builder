/**
 * Customer solution request: a three-step form.
 *   1. Contact details   2. Requirements   3. Review (preliminary analysis) and submit
 * Progress is kept in sessionStorage so a refresh doesn't lose what was typed.
 * Editing the requirements discards any earlier analysis, so what is submitted
 * always matches what was analysed (the API enforces this too).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Alert, ErrorBlock, LoadingBlock } from '../components/ui/Feedback';
import { SelectField, TextArea, TextField } from '../components/ui/Field';
import Spinner from '../components/ui/Spinner';
import ServiceSelector from '../components/ServiceSelector';
import AnalysisPanel from '../components/AnalysisPanel';
import { useCatalogue } from '../hooks/useCatalogue';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { analyzeRequirements, submitEnquiry } from '../services/enquiryService';
import { validateContact, validateRequirements } from '../utils/validation';

const STORAGE_KEY = 'itsb_request_draft';
const STEPS = ['Your details', 'Your requirements', 'Review and submit'];
const CONTACT_FIELDS = ['name', 'company', 'email', 'phone'];
const REQ_FIELDS = ['industry', 'employeeCount', 'services', 'requirements', 'budget', 'location', 'notes'];

const EMPTY = {
  name: '', company: '', email: '', phone: '',
  industry: '', employeeCount: '', services: [], requirements: '', budget: '', location: '', notes: '',
};

const loadDraft = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return saved ? { ...EMPTY, ...saved } : EMPTY;
  } catch {
    return EMPTY;
  }
};

function Stepper({ step }) {
  return (
    <ol className="grid grid-cols-3 gap-3" aria-label="Progress">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li key={label} aria-current={state === 'current' ? 'step' : undefined}>
            <div className={`h-1 rounded-full ${state === 'todo' ? 'bg-line' : 'bg-signal'}`} />
            <p className={`mt-2 text-sm ${state === 'current' ? 'font-medium text-navy-900' : 'text-muted'}`}>
              <span className="sr-only">{state === 'done' ? 'Completed: ' : ''}</span>
              <span className="hidden sm:inline">{i + 1}. </span>
              {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function RequestPage() {
  useDocumentTitle('Start a request');
  const navigate = useNavigate();
  const { data: catalogue, loading, error: catalogueError, retry } = useCatalogue();

  const [form, setForm] = useState(loadDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [analysis, setAnalysis] = useState(null); // { analysis, analysisToken, fallback }
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const headingRef = useRef(null);

  const categoriesById = useMemo(
    () => Object.fromEntries((catalogue?.categories || []).map((c) => [c.id, c])),
    [catalogue]
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const set = (field) => (eOrValue) => {
    const value = eOrValue?.target ? eOrValue.target.value : eOrValue;
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    if (REQ_FIELDS.includes(field)) setAnalysis(null);
  };

  const runAnalysis = async () => {
    setAnalysing(true);
    setAnalysisError('');
    try {
      const payload = Object.fromEntries(REQ_FIELDS.map((k) => [k, form[k]]));
      setAnalysis(await analyzeRequirements(payload));
    } catch (err) {
      setAnalysisError(err.message);
      if (Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors);
        setStep(1);
      }
    } finally {
      setAnalysing(false);
    }
  };

  const next = () => {
    const found = step === 0 ? validateContact(form) : validateRequirements(form);
    setErrors(found);
    if (Object.keys(found).length) {
      // Wait for the error state to render, then move focus to the first problem.
      requestAnimationFrame(() => {
        const first = document.querySelector('[aria-invalid="true"], #services-error');
        first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        first?.focus?.({ preventScroll: true });
      });
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep === 2 && !analysis) runAnalysis();
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await submitEnquiry({ ...form, analysisToken: analysis?.analysisToken });
      sessionStorage.removeItem(STORAGE_KEY);
      navigate('/request/submitted', { replace: true, state: { reference: result.reference, email: form.email } });
    } catch (err) {
      setSubmitError(err.message);
      if (Object.keys(err.fieldErrors).length) {
        setErrors(err.fieldErrors);
        setStep(Object.keys(err.fieldErrors).some((f) => CONTACT_FIELDS.includes(f)) ? 0 : 1);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (catalogueError) return <ErrorBlock error={catalogueError} onRetry={retry} />;

  const opts = catalogue.options;
  const budgetLabel = opts.budgetRanges.find((b) => b.value === form.budget)?.label;

  return (
    <div className="bg-mist/50">
      <div className="container-page max-w-4xl py-12 md:py-16">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-semibold text-navy-900 outline-none sm:text-4xl">
          {STEPS[step]}
        </h1>
        <p className="mt-2 text-muted">
          {step === 0 && 'We use these details only to respond to your request.'}
          {step === 1 && 'The more detail you give, the more useful your brief will be.'}
          {step === 2 && 'Check everything below, then submit your request to our team.'}
        </p>
        <div className="mt-8">
          <Stepper step={step} />
        </div>

        <form
          noValidate
          className="mt-8 rounded-lg border border-line bg-white p-5 sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 2) next();
            else submit();
          }}
        >
          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} maxLength={100} />
              <TextField label="Company or organisation" autoComplete="organization" value={form.company} onChange={set('company')} error={errors.company} maxLength={150} />
              <TextField label="Work email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} maxLength={254} />
              <TextField label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} hint="Include your country code if outside India" maxLength={20} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField label="Industry" options={opts.industries} value={form.industry} onChange={set('industry')} error={errors.industry} />
                <SelectField label="Number of employees" options={opts.employeeRanges} value={form.employeeCount} onChange={set('employeeCount')} error={errors.employeeCount} />
                <TextField label="Location" hint="City where the work is needed" autoComplete="address-level2" value={form.location} onChange={set('location')} error={errors.location} maxLength={120} />
                <SelectField label="Approximate budget" options={opts.budgetRanges} value={form.budget} onChange={set('budget')} error={errors.budget} hint="Helps us suggest the right scale of solution" />
              </div>
              <ServiceSelector categories={catalogue.categories} value={form.services} onChange={set('services')} error={errors.services} />
              <TextArea
                label="Describe your requirements"
                rows={7}
                maxLength={5000}
                value={form.requirements}
                onChange={set('requirements')}
                error={errors.requirements}
                hint={`What are you trying to achieve? Include numbers of users, devices or sites, what you have today, and any deadlines. ${form.requirements.trim().length}/5000`}
                placeholder="For example: We are moving to a new office with 45 staff in March. We need laptops for everyone, office Wi-Fi, and a way to back up our accounting data."
              />
              <TextArea label="Additional notes" rows={3} required={false} maxLength={2000} value={form.notes} onChange={set('notes')} error={errors.notes} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <dl className="grid gap-x-8 gap-y-4 text-[15px] sm:grid-cols-2">
                {[
                  ['Name', form.name],
                  ['Company', form.company],
                  ['Email', form.email],
                  ['Phone', form.phone],
                  ['Industry', form.industry],
                  ['Employees', form.employeeCount],
                  ['Location', form.location],
                  ['Budget', budgetLabel],
                  ['Services', form.services.map((id) => categoriesById[id]?.name).join(', ')],
                ].map(([k, v]) => (
                  <div key={k} className="border-b border-line pb-3">
                    <dt className="text-sm text-muted">{k}</dt>
                    <dd className="mt-0.5 break-words font-medium">{v}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted">Requirements</dt>
                  <dd className="mt-1 whitespace-pre-line">{form.requirements}</dd>
                  {form.notes && (
                    <>
                      <dt className="mt-4 text-sm text-muted">Additional notes</dt>
                      <dd className="mt-1 whitespace-pre-line">{form.notes}</dd>
                    </>
                  )}
                </div>
              </dl>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
                  Edit requirements
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setStep(0)}>
                  Edit contact details
                </Button>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-navy-900">Your solution brief</h2>
                {analysing && (
                  <div className="flex items-center gap-3 rounded-lg border border-line bg-mist px-5 py-8 text-signal">
                    <Spinner />
                    <span className="text-ink">Analysing your requirements. This can take up to 30 seconds.</span>
                  </div>
                )}
                {!analysing && analysisError && (
                  <Alert type="warning" title="We couldn’t prepare your brief">
                    <p>{analysisError} You can try again, or submit your request without it. Our team will still review everything.</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={runAnalysis}>
                      Try again
                    </Button>
                  </Alert>
                )}
                {!analysing && analysis && (
                  <AnalysisPanel analysis={analysis.analysis} categoriesById={categoriesById} audience="customer" />
                )}
              </div>
            </div>
          )}

          {submitError && (
            <Alert type="error" className="mt-6">
              {submitError}
            </Alert>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <Button type="submit">Continue</Button>
            ) : (
              <Button type="submit" loading={submitting} disabled={analysing}>
                Submit request
              </Button>
            )}
          </div>
        </form>
        {step === 2 && (
          <p className="mt-4 text-sm text-muted">
            By submitting, you agree that Cyber Communications may contact you about this request. Only your requirement
            details (not your name or contact details) are used to prepare the brief.
          </p>
        )}
      </div>
    </div>
  );
}
