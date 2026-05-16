import { Link, useLocation } from 'react-router-dom';

export function SafePlaceholderRoute({ title }: { title: string }) {
  const location = useLocation();

  return (
    <main className="safe-placeholder" dir="rtl" lang="he">
      <div>
        <h1>{title}</h1>
        <p>Placeholder frontend-only route.</p>
        <p>{location.pathname + location.search}</p>
        <Link className="tactile-button" to="/">
          חזרה למסך הראשי
        </Link>
      </div>
    </main>
  );
}
