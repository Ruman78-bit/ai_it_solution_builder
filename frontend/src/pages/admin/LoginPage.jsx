import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/layout/Logo';
import Button from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Field';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function LoginPage() {
  useDocumentTitle('Staff sign in');
  const { admin, login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (admin) return <Navigate to={location.state?.from || '/admin'} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.email.trim()) found.email = 'Enter your email address';
    if (!form.password) found.password = 'Enter your password';
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    setError('');
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setErrors(err.fieldErrors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo inverse />
        </div>
        <form onSubmit={onSubmit} noValidate className="rounded-lg bg-white p-7 shadow-xl">
          <h1 className="font-display text-2xl font-semibold text-navy-900">Staff sign in</h1>
          <p className="mt-1 text-sm text-muted">Review enquiries and prepare quotations.</p>
          {(error || sessionMessage) && (
            <Alert type={error ? 'error' : 'info'} className="mt-5">
              {error || sessionMessage}
            </Alert>
          )}
          <div className="mt-6 space-y-4">
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />
          </div>
          <Button type="submit" loading={loading} className="mt-6 w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          <a href="/" className="hover:text-white">
            Back to the website
          </a>
        </p>
      </div>
    </div>
  );
}
