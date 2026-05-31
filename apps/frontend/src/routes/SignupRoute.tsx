import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import type { UserRole } from '../auth/authTypes';
import { getDashboardPathByRole } from '../utils/getDashboardPathByRole';
import { FlowNav } from '../components/FlowNav';

const signupRoles: UserRole[] = ['teacher', 'student', 'parent'];

export function SignupRoute() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [formError, setFormError] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  if (auth.status === 'authenticated') {
    return <Navigate replace to="/dashboard" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNeedsEmailConfirmation(false);

    try {
      await auth.signup({ email, full_name: fullName, password, role });
      navigate(getDashboardPathByRole(role), { replace: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'CHECK_EMAIL') {
        setNeedsEmailConfirmation(true);
        return;
      }
      setFormError(error instanceof Error ? error.message : 'Unable to sign up');
    }
  }

  if (needsEmailConfirmation) {
    return (
      <div className="w-full max-w-md flow-shell-clear">
        <FlowNav to="/" label="חזרה לדף הבית" />
        <p className="mb-3 text-sm uppercase text-studybuddy-lime">Almost there</p>
        <h1 className="font-display text-4xl font-semibold">Check your email</h1>
        <p className="mt-4 text-white/72">
          We sent a confirmation link to <span className="text-white">{email}</span>. Click it to
          activate your account, then{' '}
          <Link className="text-studybuddy-turquoise" to="/login">
            sign in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flow-shell-clear">
      <FlowNav to="/" label="חזרה לדף הבית" />
      <p className="mb-3 text-sm uppercase text-studybuddy-lime">Local user sync</p>
      <h1 className="font-display text-4xl font-semibold">Create account</h1>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm text-white/72">Full name</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none transition focus:border-studybuddy-turquoise focus:ring-2 focus:ring-studybuddy-turquoise/30"
            onChange={(event) => setFullName(event.target.value)}
            value={fullName}
          />
        </label>
        <label className="block">
          <span className="text-sm text-white/72">Email</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none transition focus:border-studybuddy-turquoise focus:ring-2 focus:ring-studybuddy-turquoise/30"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block">
          <span className="text-sm text-white/72">Password</span>
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none transition focus:border-studybuddy-turquoise focus:ring-2 focus:ring-studybuddy-turquoise/30"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        <label className="block">
          <span className="text-sm text-white/72">Role</span>
          <select
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 outline-none transition focus:border-studybuddy-turquoise focus:ring-2 focus:ring-studybuddy-turquoise/30"
            onChange={(event) => setRole(event.target.value as UserRole)}
            value={role}
          >
            {signupRoles.map((nextRole) => (
              <option key={nextRole} value={nextRole}>
                {nextRole}
              </option>
            ))}
          </select>
        </label>
        {(formError || auth.error) && <p className="text-sm text-studybuddy-pink">{formError ?? auth.error}</p>}
        <button
          className="w-full rounded-2xl bg-studybuddy-turquoise px-5 py-3 font-semibold text-studybuddy-teal shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
          disabled={auth.status === 'loading'}
          type="submit"
        >
          Create account
        </button>
      </form>
      <p className="mt-5 text-sm text-white/64">
        Already have access?{' '}
        <Link className="text-studybuddy-turquoise" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
