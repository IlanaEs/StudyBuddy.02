import {
  assertTaxonomySeedAllowed,
  classifyEnvironment,
  createSupabaseAdminClient,
  must,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';

// Canonical subject taxonomy. MUST stay in sync with the frontend wizard list
// at apps/frontend/src/features/matching/data/subjectsByLevel.ts — every value
// the wizard offers must exist here, or intake submission 422s on subject lookup.
export const canonicalSubjects = [
  // School core / mathematics
  { name: 'מתמטיקה', category: 'school_core' },
  { name: 'חשבון', category: 'school_core' },
  { name: 'חדו״א', category: 'school_core' },
  { name: 'לינארית', category: 'school_core' },
  { name: 'הסתברות', category: 'school_core' },
  { name: 'סטטיסטיקה', category: 'school_core' },
  { name: 'חקר ביצועים', category: 'school_core' },
  { name: 'הכנה לכיתה א׳', category: 'school_core' },
  // Languages
  { name: 'אנגלית', category: 'languages' },
  { name: 'עברית', category: 'languages' },
  { name: 'קריאה וכתיבה', category: 'languages' },
  { name: 'הבנת הנקרא', category: 'languages' },
  // Humanities & social sciences
  { name: 'לשון', category: 'humanities' },
  { name: 'היסטוריה', category: 'humanities' },
  { name: 'ספרות', category: 'humanities' },
  { name: 'תנ״ך', category: 'humanities' },
  { name: 'גיאוגרפיה', category: 'humanities' },
  { name: 'אזרחות', category: 'humanities' },
  { name: 'פסיכולוגיה', category: 'humanities' },
  { name: 'כלכלה', category: 'humanities' },
  { name: 'תקשורת', category: 'humanities' },
  // Sciences
  { name: 'פיזיקה', category: 'science' },
  { name: 'כימיה', category: 'science' },
  { name: 'ביולוגיה', category: 'science' },
  { name: 'מדעים', category: 'science' },
  { name: 'מעגלים', category: 'science' },
  // Technology / computer science
  { name: 'מדעי המחשב', category: 'technology' },
  { name: 'תכנות בסיסי', category: 'technology' },
  { name: 'רובוטיקה', category: 'technology' },
  { name: 'סייבר', category: 'technology' },
  { name: 'מבני נתונים', category: 'technology' },
  { name: 'אלגוריתמים', category: 'technology' },
  { name: 'OOP', category: 'technology' },
  { name: 'Java', category: 'technology' },
  { name: 'Python', category: 'technology' },
  { name: 'בסיסי נתונים', category: 'technology' },
  { name: 'מערכות הפעלה', category: 'technology' },
  { name: 'רשתות', category: 'technology' },
  { name: 'Full Stack', category: 'technology' },
  { name: 'React', category: 'technology' },
  { name: 'Node.js', category: 'technology' },
  { name: 'SQL', category: 'technology' },
  { name: 'Data Analysis', category: 'technology' },
];

export async function seedTaxonomy({ supabase }) {
  const seededSubjects = await must(
    'subjects upsert',
    supabase
      .from('subjects')
      .upsert(
        canonicalSubjects.map((subject) => ({ ...subject, is_active: true })),
        { onConflict: 'name' },
      )
      .select('id,name'),
  );

  return {
    subjects: seededSubjects.length,
    subjectIds: new Map(seededSubjects.map((subject) => [subject.name, subject.id])),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scriptName = 'db:seed:taxonomy';
  const args = parseSeedArgs();
  const env = readBackendEnv();
  const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
  const envInfo = classifyEnvironment(env, supabaseUrl, args);

  assertTaxonomySeedAllowed({ scriptName, envInfo, supabaseUrl, args });

  const result = await seedTaxonomy({ supabase });
  console.log(JSON.stringify({ seeded: true, type: 'taxonomy', environment: envInfo.kind, ...result }, null, 2));
}
