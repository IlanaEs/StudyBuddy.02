import { useEffect, useState } from 'react';
import { useTeacherDashboardStore } from '../store/teacherDashboardStore';
import { StudentSidebar } from '../components/students/StudentSidebar';
import { StudentFile } from '../components/students/StudentFile';

/** Students CRM — master-detail: searchable list (30%) + selected student file (70%). */
export function StudentsTab() {
  const students = useTeacherDashboardStore((s) => s.students);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default-select the first student once data arrives, and keep the selection valid.
  useEffect(() => {
    const first = students[0];
    if (!first) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !students.some((s) => s.id === selectedId)) {
      setSelectedId(first.id);
    }
  }, [students, selectedId]);

  const selected = students.find((s) => s.id === selectedId) ?? null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
      <div style={{ flex: '1 1 260px', minWidth: 240, maxWidth: 380 }}>
        <StudentSidebar
          students={students}
          query={query}
          onQueryChange={setQuery}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <div style={{ flex: '2.4 1 460px', minWidth: 300 }}>
        <StudentFile student={selected} />
      </div>
    </div>
  );
}
