import { useState } from 'react';

/** Bounded loading state for the auth bootstrap. `apiRequest` caps every call at
 *  15s, so this can no longer spin forever — but we still show a "taking longer"
 *  hint so a slow network doesn't read as a frozen app. */
export function SessionLoadingScreen({ label = 'מאמת...' }: { label?: string }) {
  return (
    <div className="w-full max-w-md text-center" dir="rtl">
      <p className="text-white/64">{label}</p>
    </div>
  );
}

/** Recoverable auth error (network/timeout/5xx) with a retry action. */
export function SessionRetryScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void> | void;
}) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="w-full max-w-md text-center" dir="rtl">
      <p className="mb-3 text-sm uppercase text-studybuddy-pink">בעיית חיבור</p>
      <h1 className="font-display text-3xl font-semibold">לא הצלחנו לטעון את החשבון</h1>
      <p className="mt-4 text-sm text-white/64">{message}</p>
      <button
        type="button"
        onClick={() => void handleRetry()}
        disabled={retrying}
        className="mt-6 inline-flex items-center justify-center rounded-xl border border-studybuddy-turquoise/40 bg-studybuddy-turquoise/10 px-5 py-2.5 text-sm font-semibold text-studybuddy-turquoise transition-colors hover:bg-studybuddy-turquoise/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {retrying ? 'מנסה שוב...' : 'נסה שוב (Retry)'}
      </button>
    </div>
  );
}
