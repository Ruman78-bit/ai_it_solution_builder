/**
 * Admin session. The JWT is kept in localStorage (expires after JWT_EXPIRES_IN,
 * 8h by default) and verified with /auth/me on load. Any 401 from the API signs
 * the admin out.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TOKEN_KEY, setUnauthorizedHandler } from '../services/api';
import * as adminService from '../services/adminService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [sessionMessage, setSessionMessage] = useState('');

  const logout = useCallback((message = '') => {
    localStorage.removeItem(TOKEN_KEY);
    setAdmin(null);
    setSessionMessage(message);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout('Your session has ended. Please sign in again.'));
    if (!localStorage.getItem(TOKEN_KEY)) return;
    adminService
      .getMe()
      .then((d) => setAdmin(d.admin))
      .catch(() => logout())
      .finally(() => setChecking(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const d = await adminService.login(email, password);
    localStorage.setItem(TOKEN_KEY, d.token);
    setSessionMessage('');
    setAdmin(d.admin);
    return d.admin;
  }, []);

  const value = useMemo(
    () => ({ admin, checking, login, logout, sessionMessage }),
    [admin, checking, login, logout, sessionMessage]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
