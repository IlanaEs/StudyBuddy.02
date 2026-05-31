import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const backendEnvPath = new URL('../apps/backend/.env', import.meta.url);

export function readBackendEnv() {
  const entries = readFileSync(backendEnvPath, 'utf8')
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const eq = line.indexOf('=');
      return [line.slice(0, eq), line.slice(eq + 1)];
    });
  return Object.fromEntries(entries);
}

export function requireEnv(env, key, scriptName = 'seed script') {
  const value = process.env[key] ?? env[key];
  if (!value) throw new Error(`${key} is required for ${scriptName}`);
  return value;
}

export function createSupabaseAdminClient(env, scriptName = 'seed script') {
  const supabaseUrl = requireEnv(env, 'SUPABASE_URL', scriptName);
  const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY', scriptName);
  return {
    supabaseUrl,
    serviceRoleKey,
    supabase: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export function parseSeedArgs(argv = process.argv.slice(2)) {
  const environmentArg = argv.find((arg) => arg.startsWith('--environment='));
  return {
    allowRemoteDevSeed: argv.includes('--allow-remote-dev-seed'),
    allowProductionSeed: process.env.ALLOW_PRODUCTION_SEED === 'true',
    environmentOverride: environmentArg?.split('=')[1],
  };
}

export function classifyEnvironment(env, supabaseUrl, args = parseSeedArgs()) {
  const raw =
    args.environmentOverride ??
    process.env.STUDYBUDDY_ENV ??
    process.env.APP_ENV ??
    process.env.ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    env.STUDYBUDDY_ENV ??
    env.APP_ENV ??
    env.ENVIRONMENT ??
    env.VERCEL_ENV ??
    env.NODE_ENV ??
    null;

  const normalized = raw?.toLowerCase();
  const isLocalUrl = /localhost|127\.0\.0\.1|supabase_kong_studybuddy/i.test(supabaseUrl);

  if (isLocalUrl) {
    return { kind: 'local', isLocalUrl, raw };
  }

  if (normalized === 'production' || normalized === 'prod') {
    return { kind: 'production', isLocalUrl, raw };
  }

  if (normalized === 'staging' || normalized === 'preview') {
    return { kind: 'staging', isLocalUrl, raw };
  }

  if (normalized === 'development' || normalized === 'dev') {
    return { kind: 'development', isLocalUrl, raw };
  }

  return { kind: 'ambiguous', isLocalUrl, raw };
}

function printRemoteWarning(scriptName, envInfo, supabaseUrl) {
  console.error('\n============================================================');
  console.error(`WARNING: ${scriptName} is targeting a remote Supabase project.`);
  console.error(`Environment: ${envInfo.kind}`);
  console.error(`Target: ${supabaseUrl}`);
  console.error('This must be intentional. Demo/runtime seed data is not production-safe.');
  console.error('============================================================\n');
}

export function assertTaxonomySeedAllowed({ scriptName, envInfo, supabaseUrl, args }) {
  if (envInfo.kind === 'ambiguous') {
    throw new Error(
      `${scriptName}: refusing to seed an ambiguous environment. ` +
        'Set STUDYBUDDY_ENV to local, development, staging, or production.',
    );
  }

  if (envInfo.kind === 'production' && !args.allowProductionSeed) {
    throw new Error(
      `${scriptName}: refusing to run taxonomy seed against production without ALLOW_PRODUCTION_SEED=true.`,
    );
  }

  if (!envInfo.isLocalUrl) {
    printRemoteWarning(scriptName, envInfo, supabaseUrl);
  }
}

export function assertDemoSeedAllowed({ scriptName, envInfo, supabaseUrl, args }) {
  if (envInfo.kind === 'ambiguous') {
    throw new Error(
      `${scriptName}: refusing to seed an ambiguous environment. ` +
        'Set STUDYBUDDY_ENV to local, development, staging, or production.',
    );
  }

  if (envInfo.kind === 'production' && !args.allowProductionSeed) {
    throw new Error('Refusing to run demo seed against production environment.');
  }

  if (envInfo.kind === 'production' && args.allowProductionSeed) {
    console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error(`${scriptName}: ALLOW_PRODUCTION_SEED=true was provided.`);
    console.error('This will create demo data in production. Continue only for emergency QA.');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
  }

  if (!envInfo.isLocalUrl && !args.allowRemoteDevSeed && envInfo.kind !== 'production') {
    throw new Error(
      `${scriptName}: refusing to seed a remote ${envInfo.kind} project without --allow-remote-dev-seed.`,
    );
  }

  if (!envInfo.isLocalUrl) {
    printRemoteWarning(scriptName, envInfo, supabaseUrl);
  }
}

export function assertLocalOrDevelopmentOnly({ scriptName, env, supabaseUrl }) {
  const rawStudyBuddyEnv = process.env.STUDYBUDDY_ENV ?? env.STUDYBUDDY_ENV;
  const normalizedStudyBuddyEnv = rawStudyBuddyEnv?.toLowerCase();
  const isLocalUrl = /localhost|127\.0\.0\.1|supabase_kong_studybuddy/i.test(supabaseUrl);

  if (!['local', 'development'].includes(normalizedStudyBuddyEnv)) {
    throw new Error(
      `${scriptName}: refusing to run. Set STUDYBUDDY_ENV=local or STUDYBUDDY_ENV=development explicitly.`,
    );
  }

  const productionSignals = [
    ['NODE_ENV', process.env.NODE_ENV ?? env.NODE_ENV],
    ['APP_ENV', process.env.APP_ENV ?? env.APP_ENV],
    ['ENVIRONMENT', process.env.ENVIRONMENT ?? env.ENVIRONMENT],
    ['VERCEL_ENV', process.env.VERCEL_ENV ?? env.VERCEL_ENV],
  ].filter(([, value]) => ['production', 'prod'].includes(value?.toLowerCase()));

  if (productionSignals.length > 0) {
    const signalList = productionSignals.map(([key, value]) => `${key}=${value}`).join(', ');
    throw new Error(`${scriptName}: refusing to run with production environment signal(s): ${signalList}.`);
  }

  if (normalizedStudyBuddyEnv === 'local' && !isLocalUrl) {
    throw new Error(`${scriptName}: STUDYBUDDY_ENV=local requires a local Supabase URL. Target was ${supabaseUrl}.`);
  }

  if (normalizedStudyBuddyEnv === 'development' && !isLocalUrl) {
    const confirmed = process.env.CONFIRM_REMOTE_DEVELOPMENT_USER_RESET === 'true';
    if (!confirmed) {
      throw new Error(
        `${scriptName}: refusing to reset a remote development database without ` +
          'CONFIRM_REMOTE_DEVELOPMENT_USER_RESET=true.',
      );
    }
  }
}

export async function must(label, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${label} failed: ${error.message}`);
  return data;
}

export async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth listUsers failed: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) return user;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  throw new Error(`Could not find auth user ${email}; user list exceeded scan limit`);
}

export async function hasColumn(supabase, table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}
