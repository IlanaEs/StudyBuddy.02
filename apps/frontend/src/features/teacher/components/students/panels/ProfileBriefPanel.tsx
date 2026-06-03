import { useEffect, useRef, useState } from 'react';
import { CloudLightning } from 'lucide-react';
import { towTokens as T } from '../../../../../design/tokens';
import { useTeacherDashboardStore } from '../../../store/teacherDashboardStore';

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Free brief textarea. Auto-saves 2s after the last keystroke to the store +
 * localStorage proxy; a CloudLightning indicator confirms the save.
 */
export function ProfileBriefPanel({ studentId }: { studentId: string }) {
  const note = useTeacherDashboardStore((s) => s.studentNotes[studentId] ?? '');
  const setStudentNote = useTeacherDashboardStore((s) => s.setStudentNote);

  const [text, setText] = useState(note);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  // Re-sync the textarea when the selected student changes.
  useEffect(() => {
    setText(note);
    setSaved(false);
    // Only studentId drives the reset — `note` is read fresh for the new student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Clear any pending timer on unmount.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleChange = (value: string) => {
    setText(value);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStudentNote(studentId, value);
      setSaved(true);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        className="tow-focusable"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="כתבו כאן בריף, נקודות חשובות והערות על התלמיד…"
        dir="rtl"
        style={{
          width: '100%',
          minHeight: 240,
          resize: 'vertical',
          padding: '14px 14px 40px',
          borderRadius: T.radiusSm,
          border: `1.5px solid ${T.line2}`,
          background: T.card2,
          color: T.text,
          fontSize: 14.5,
          lineHeight: 1.6,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          insetInlineEnd: 12,
          bottom: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11.5,
          fontWeight: 700,
          color: T.success,
          opacity: saved ? 1 : 0,
          transform: saved ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 220ms ease, transform 220ms ease',
          pointerEvents: 'none',
        }}
      >
        <CloudLightning size={14} />
        נשמר (Saved)
      </span>
    </div>
  );
}
