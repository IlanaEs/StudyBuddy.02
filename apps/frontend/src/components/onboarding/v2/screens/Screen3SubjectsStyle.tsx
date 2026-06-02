import type { TeacherOnboardingData } from '../../../../pages/TeacherOnboardingPage';
import {
  TEACHING_LEVELS,
  SUBJECTS_BY_LEVEL,
  TEACHING_STYLES,
  type TeachingLevel,
} from '../../../../content/teacherOnboardingContent';
import { towTokens as T } from '../../../../design/tokens';
import { ScreenHeader, SectionLabel, ChipSelect, CardSelect, FieldError } from '../primitives';

interface Screen3Props {
  data: TeacherOnboardingData;
  update: (patch: Partial<TeacherOnboardingData>) => void;
  errors: Record<string, string>;
}

function toggle<T extends string>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

/**
 * Screen 3 — Subjects, Levels & Style (מקצועות, רמות וסגנון). Controlled subject
 * lookup (restricted to the taxonomy per selected level) + teaching-style chips.
 */
export function Screen3SubjectsStyle({ data, update, errors }: Screen3Props) {
  // Subjects available across all chosen levels (deduped, controlled list).
  const subjectPool = [
    ...new Set(data.teachingLevels.flatMap((lvl) => SUBJECTS_BY_LEVEL[lvl as TeachingLevel] ?? [])),
  ];

  return (
    <div className="tow-step-in">
      <ScreenHeader title="מקצועות, רמות וסגנון" english="Subjects, Levels & Style" subtitle="בחרו את הרמות שאתם מלמדים, ואז את המקצועות והסגנון." />

      <SectionLabel>רמות הוראה (Teaching Levels)</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {TEACHING_LEVELS.map((lvl) => (
          <CardSelect
            key={lvl.value}
            label={lvl.label}
            selected={data.teachingLevels.includes(lvl.value)}
            onClick={() => update({ teachingLevels: toggle(data.teachingLevels, lvl.value) })}
          />
        ))}
      </div>
      <FieldError>{errors.teachingLevels}</FieldError>

      {subjectPool.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>מקצועות (Subjects)</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {subjectPool.map((s) => (
              <ChipSelect
                key={s}
                label={s}
                small
                selected={data.selectedSubjects.includes(s)}
                onClick={() => update({ selectedSubjects: toggle(data.selectedSubjects, s) })}
              />
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: T.text3 }}>
            הרשימה מבוקרת ומבוססת על מאגר StudyBuddy. מקצוע חסר?{' '}
            <span style={{ color: T.alert, fontWeight: 700 }}>ניתן לבקש הוספה לאישור צוות בהמשך.</span>
          </div>
          <FieldError>{errors.selectedSubjects}</FieldError>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <SectionLabel>סגנון הוראה (Teaching Style)</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TEACHING_STYLES.map((style) => (
            <ChipSelect
              key={style.value}
              label={style.label}
              small
              selected={data.teachingStyles.includes(style.value)}
              onClick={() => update({ teachingStyles: toggle(data.teachingStyles, style.value) })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
