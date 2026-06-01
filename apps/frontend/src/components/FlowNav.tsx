import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Lightweight, consistent flow navigation: a clickable StudyBuddy logo combined
 * with a back link, both pointing at the correct landing destination for the
 * current flow. Fixed to the top-start corner so it never shifts page layout.
 *
 * Destinations:
 *   - teacher-facing screens → "/teachers"
 *   - student/parent-facing screens → "/"
 */
export function FlowNav({ to, label }: { to: string; label: string }) {
  return (
    <nav className="flow-nav" dir="rtl" aria-label="ניווט">
      <Link className="flow-nav__home" to={to} aria-label={label}>
        <img src="/assets/logo_s.png" alt="StudyBuddy" />
        <span className="flow-nav__back">
          <ChevronRight size={15} aria-hidden="true" />
          {label}
        </span>
      </Link>
    </nav>
  );
}
