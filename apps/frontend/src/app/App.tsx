import { Route, Routes } from 'react-router-dom';

import { AppShell } from './AppShell';
import { FoundationRoute } from '../routes/FoundationRoute';
import { NotFoundRoute } from '../routes/NotFoundRoute';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<FoundationRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </AppShell>
  );
}
