import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { useAuth } from '../auth/AuthProvider';
import type { UserRole } from '../auth/authTypes';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';
import { FlowNav } from '../components/FlowNav';

// Backend-recognised role values — do not change.
const SIGNUP_ROLES: { value: UserRole; label: string }[] = [
  { value: 'student', label: 'תלמיד/ה' },
  { value: 'parent', label: 'הורה' },
  { value: 'teacher', label: 'מורה' },
];

const HEBREW_CHAR = /[֐-׿]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Frontend-only validation. Returns the first Hebrew error message, or null.
function validateSignup(fullName: string, email: string, password: string): string | null {
  if (!fullName.trim()) return 'יש להזין שם מלא.';

  const mail = email.trim();
  if (HEBREW_CHAR.test(mail) || /\s/.test(mail) || !EMAIL_RE.test(mail)) {
    return 'יש להזין כתובת אימייל תקינה באנגלית.';
  }

  if (password !== password.trim()) return 'הסיסמה לא יכולה להתחיל או להסתיים ברווח.';
  if (password.length < 8) return 'הסיסמה חייבת להכיל לפחות 8 תווים.';

  return null;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page auth-signup-page" dir="rtl">
      <FlowNav to="/" label="חזרה לדף הבית" />
      <section className="auth-signup-layout">
        <aside className="auth-signup-showcase" aria-hidden="true">
          <span className="auth-showcase-glow" />
          <div className="auth-showcase-mock">
            <div className="auth-showcase-mock__bar">
              <span />
              <span />
              <span />
            </div>
            <div className="auth-showcase-mock__stats">
              <div />
              <div />
              <div />
            </div>
            <div className="auth-showcase-mock__rows">
              <span />
              <span />
              <span />
            </div>
          </div>
          <p className="auth-showcase-text">
            הצטרפו לקהילת הלמידה המתקדמת בישראל.
            <br />
            כל הכלים שצריך במקום אחד.
          </p>
        </aside>

        {children}
      </section>
    </div>
  );
}

export function SignupRoute() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  if (auth.status === 'authenticated') {
    return <Navigate replace to="/dashboard" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateSignup(fullName, email, password);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setNeedsEmailConfirmation(false);
    setIsSubmitting(true);

    try {
      await auth.signup({ email: email.trim(), full_name: fullName.trim(), password, role });
      navigate(getDashboardPathByRole(role), { replace: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'CHECK_EMAIL') {
        setNeedsEmailConfirmation(true);
        return;
      }
      setFormError(error instanceof Error ? error.message : 'לא ניתן להשלים את ההרשמה כרגע. נסו שוב.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsEmailConfirmation) {
    return (
      <AuthShell>
        <section className="auth-card auth-signup-card">
          <header className="auth-header">
            <span className="auth-brand">
              <img alt="StudyBuddy" src="/assets/logo_s.png" />
            </span>
            <h1 className="auth-title">בדקו את תיבת האימייל</h1>
            <p className="auth-subtitle">
              שלחנו קישור אימות אל <span dir="ltr">{email.trim()}</span>. אשרו אותו ואז התחברו למערכת.
            </p>
          </header>
          <p className="auth-footer">
            כבר אישרתם?{' '}
            <Link to="/login">להתחברות</Link>
          </p>
        </section>
      </AuthShell>
    );
  }

  const errorMessage = formError ?? auth.error;
  const isBusy = isSubmitting || auth.status === 'loading';

  return (
    <AuthShell>
      <section className="auth-card auth-signup-card">
        <header className="auth-header">
          <span className="auth-brand">
            <img alt="StudyBuddy" src="/assets/logo_s.png" />
          </span>
          <h1 className="auth-title">יצירת חשבון חדש</h1>
          <p className="auth-subtitle">מתחילים את הדרך ב-StudyBuddy</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span className="auth-label">שם מלא</span>
            <input
              autoComplete="name"
              className="auth-input"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="איך קוראים לך?"
              value={fullName}
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">אימייל</span>
            <input
              autoComplete="email"
              className="auth-input"
              dir="ltr"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              type="email"
              value={email}
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">סיסמה</span>
            <span className="auth-password">
              <input
                autoComplete="new-password"
                className="auth-input auth-input--password"
                dir="ltr"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="לפחות 8 תווים"
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'הסתרת סיסמה' : 'הצגת סיסמה'}
                aria-pressed={showPassword}
                className="auth-pw-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                type="button"
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </span>
          </label>

          <div className="auth-field">
            <span className="auth-label">סוג חשבון</span>
            <div className="auth-segmented" role="radiogroup" aria-label="סוג חשבון">
              {SIGNUP_ROLES.map((option) => (
                <button
                  aria-checked={role === option.value}
                  className={`auth-seg${role === option.value ? ' is-active' : ''}`}
                  key={option.value}
                  onClick={() => setRole(option.value)}
                  role="radio"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="auth-error" role="alert">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16.5" x2="12" y2="16.5" />
              </svg>
              <span>{errorMessage}</span>
            </p>
          )}

          <button className="auth-submit" disabled={isBusy} type="submit">
            {isBusy ? (
              <>
                <span className="auth-spinner" aria-hidden="true" />
                נרשמים…
              </>
            ) : (
              'הרשמה למערכת'
            )}
          </button>
        </form>

        <p className="auth-footer">
          כבר יש לך חשבון?{' '}
          <Link to="/login">להתחברות</Link>
        </p>
      </section>
    </AuthShell>
  );
}
