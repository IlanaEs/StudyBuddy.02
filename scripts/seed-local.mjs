import {
  assertDemoSeedAllowed,
  classifyEnvironment,
  createSupabaseAdminClient,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';
import { seedDemoMatching } from './seed-demo-matching.mjs';

const scriptName = 'db:seed:local';
const args = parseSeedArgs();
const env = readBackendEnv();
const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
const envInfo = classifyEnvironment(env, supabaseUrl, args);

assertDemoSeedAllowed({ scriptName, envInfo, supabaseUrl, args });

const matching = await seedDemoMatching({ supabase });

console.log(
  JSON.stringify(
    {
      seeded: true,
      type: 'local',
      environment: envInfo.kind,
      matching,
    },
    null,
    2,
  ),
);
