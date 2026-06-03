// Verifies that the `subjects` table in the target environment is fully seeded
// against the canonical taxonomy. Read-only; safe to run against any environment.
//
// Exits non-zero if any canonical subject is missing or inactive, so it can be
// used as a per-environment gate after `npm run db:seed:taxonomy`.
//
//   npm run db:check:taxonomy
//
// Reuses the same admin client + env classification as the seed scripts.
import {
  classifyEnvironment,
  createSupabaseAdminClient,
  must,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';
import { canonicalSubjects } from './taxonomy-data.mjs';

export async function checkTaxonomySeeded({ supabase }) {
  const rows = await must('subjects fetch', supabase.from('subjects').select('name,is_active'));

  const activeNames = new Set(rows.filter((row) => row.is_active).map((row) => row.name));
  const inactiveNames = new Set(rows.filter((row) => !row.is_active).map((row) => row.name));

  const missing = canonicalSubjects.map((subject) => subject.name).filter((name) => !activeNames.has(name) && !inactiveNames.has(name));
  const inactive = canonicalSubjects.map((subject) => subject.name).filter((name) => inactiveNames.has(name));

  return {
    expected: canonicalSubjects.length,
    present: rows.length,
    missing,
    inactive,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scriptName = 'db:check:taxonomy';
  const args = parseSeedArgs();
  const env = readBackendEnv();
  const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
  const envInfo = classifyEnvironment(env, supabaseUrl, args);

  const result = await checkTaxonomySeeded({ supabase });
  const ok = result.missing.length === 0 && result.inactive.length === 0;

  console.log(
    JSON.stringify(
      { check: 'taxonomy', environment: envInfo.kind, ok, ...result },
      null,
      2,
    ),
  );

  if (!ok) {
    console.error(
      `\n${scriptName}: taxonomy is out of sync in '${envInfo.kind}'. ` +
        `Run \`npm run db:seed:taxonomy\` against this environment.`,
    );
    process.exit(1);
  }
}
