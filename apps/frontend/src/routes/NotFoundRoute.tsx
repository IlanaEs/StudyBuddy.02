import { Link } from 'react-router-dom';

export function NotFoundRoute() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl font-semibold">Route not found</h1>
      <p className="mt-4 text-white/72">This foundation only defines the base application shell.</p>
      <Link className="mt-6 inline-flex text-studybuddy-turquoise" to="/">
        Return to foundation
      </Link>
    </div>
  );
}
