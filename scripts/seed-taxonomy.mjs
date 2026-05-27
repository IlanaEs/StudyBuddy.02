import {
  assertTaxonomySeedAllowed,
  classifyEnvironment,
  createSupabaseAdminClient,
  must,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';

export const canonicalSubjects = [
  { name: 'מתמטיקה', category: 'school_core' },
  { name: 'אנגלית', category: 'languages' },
  { name: 'פיזיקה', category: 'science' },
  { name: 'כימיה', category: 'science' },
  { name: 'מדעי המחשב', category: 'technology' },
  { name: 'לשון', category: 'humanities' },
  { name: 'היסטוריה', category: 'humanities' },
  { name: 'ספרות', category: 'humanities' },
  { name: 'ביולוגיה', category: 'science' },
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
