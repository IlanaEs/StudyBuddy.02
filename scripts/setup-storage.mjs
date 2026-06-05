/**
 * Idempotently provisions the PRIVATE Supabase Storage bucket for lesson
 * attachments. Safe to re-run. Required once per environment.
 *
 *   node scripts/setup-storage.mjs
 *
 * The bucket is private (no public URLs). Files are reachable only via
 * short-lived signed URLs minted by the backend after an owner/teacher check.
 * Bucket-level mime/size limits are a backstop in addition to server validation.
 */
import {
  classifyEnvironment,
  createSupabaseAdminClient,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';

const scriptName = 'setup-storage';

// Keep in sync with apps/backend/src/attachments/attachments.constants.ts
export const ATTACHMENTS_BUCKET = 'lesson-attachments';
const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

const env = readBackendEnv();
const args = parseSeedArgs();
const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
const envInfo = classifyEnvironment(env, supabaseUrl, args);

if (envInfo.kind === 'ambiguous') {
  throw new Error(`${scriptName}: refusing to run in an ambiguous environment. Set STUDYBUDDY_ENV.`);
}

console.log(`Target: ${supabaseUrl}`);
console.log(`Environment: ${envInfo.kind}`);
console.log(`Bucket: ${ATTACHMENTS_BUCKET} (private)\n`);

const { data: existing } = await supabase.storage.getBucket(ATTACHMENTS_BUCKET);

if (existing) {
  // Ensure settings stay correct (idempotent reconcile).
  const { error: updateError } = await supabase.storage.updateBucket(ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: FILE_SIZE_LIMIT,
    allowedMimeTypes: ALLOWED_MIME,
  });
  if (updateError) throw new Error(`updateBucket failed: ${updateError.message}`);
  console.log(`✓ Bucket already exists — reconciled to private + limits.`);
} else {
  const { error: createError } = await supabase.storage.createBucket(ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: FILE_SIZE_LIMIT,
    allowedMimeTypes: ALLOWED_MIME,
  });
  if (createError) throw new Error(`createBucket failed: ${createError.message}`);
  console.log(`✓ Created private bucket ${ATTACHMENTS_BUCKET}.`);
}

// Verify it really is private.
const { data: check } = await supabase.storage.getBucket(ATTACHMENTS_BUCKET);
console.log(`\nVerified: public=${check?.public} fileSizeLimit=${check?.file_size_limit ?? FILE_SIZE_LIMIT}`);
if (check?.public) {
  throw new Error(`${scriptName}: bucket is PUBLIC — aborting. Attachments must be private.`);
}
