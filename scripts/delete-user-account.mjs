/**
 * Delete a SINGLE user account and every row that references it, in FK-dependency
 * order. Unlike reset-local-users.mjs (which wipes ALL users), this is scoped to
 * one account resolved by email.
 *
 * Safety:
 *   - Dry-run by default: prints how many rows WOULD be deleted in each table.
 *   - Only deletes when called with --confirm.
 *   - Refuses to run against a production environment signal.
 *
 * Usage:
 *   node scripts/delete-user-account.mjs --email=studyy.buddyln@gmail.com            # dry run
 *   node scripts/delete-user-account.mjs --email=studyy.buddyln@gmail.com --confirm  # delete
 */
import {
  createSupabaseAdminClient,
  findAuthUserByEmail,
  readBackendEnv,
} from './seed-utils.mjs';

const scriptName = 'delete-user-account';

const args = process.argv.slice(2);
const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1];
const email = emailArg ?? process.env.DELETE_USER_EMAIL;
const confirm = args.includes('--confirm');

if (!email) {
  throw new Error(`${scriptName}: provide --email=<address> (or DELETE_USER_EMAIL).`);
}

const env = readBackendEnv();

// Block obvious production targets.
const prodSignal = [
  process.env.NODE_ENV,
  process.env.APP_ENV,
  process.env.STUDYBUDDY_ENV,
  env.NODE_ENV,
  env.APP_ENV,
  env.STUDYBUDDY_ENV,
].some((v) => ['production', 'prod'].includes(v?.toLowerCase?.()));
if (prodSignal) {
  throw new Error(`${scriptName}: refusing to run against a production environment signal.`);
}

const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);

console.log(`Target: ${supabaseUrl}`);
console.log(`Account: ${email}`);
console.log(confirm ? 'Mode: DELETE (--confirm)\n' : 'Mode: DRY RUN (pass --confirm to delete)\n');

// ── Resolve the user row ────────────────────────────────────────────────────
const { data: userRows, error: userErr } = await supabase
  .from('users')
  .select('id, role, full_name, email')
  .eq('email', email);
if (userErr) throw new Error(`lookup users failed: ${userErr.message}`);

if (!userRows || userRows.length === 0) {
  console.log('No public.users row found for that email.');
} else if (userRows.length > 1) {
  throw new Error(`Found ${userRows.length} users with that email; aborting for safety.`);
}

const user = userRows?.[0] ?? null;
const uid = user?.id ?? null;
if (user) console.log(`Resolved user: ${uid} (role=${user.role}, name=${user.full_name})`);

// ── Resolve linked student rows (own + children via parent_user_id) ─────────
let studentIds = [];
if (uid) {
  const { data: ownStudents, error: sErr } = await supabase
    .from('students')
    .select('id')
    .or(`user_id.eq.${uid},parent_user_id.eq.${uid}`);
  if (sErr) throw new Error(`lookup students failed: ${sErr.message}`);
  studentIds = (ownStudents ?? []).map((r) => r.id);
}
console.log(`Linked students: ${studentIds.length}${studentIds.length ? ` [${studentIds.join(', ')}]` : ''}`);

// ── Resolve dependent id sets used for scoping ──────────────────────────────
async function idsIn(table, column, values, selectCol = 'id') {
  if (values.length === 0) return [];
  const { data, error } = await supabase.from(table).select(selectCol).in(column, values);
  if (error) throw new Error(`lookup ${table} failed: ${error.message}`);
  return (data ?? []).map((r) => r[selectCol]);
}

const intakeIds = await idsIn('student_intakes', 'student_id', studentIds);
const conversationIds = uid
  ? (await supabase
      .from('conversations')
      .select('id')
      .or(`parent_user_id.eq.${uid}${studentIds.length ? `,student_id.in.(${studentIds.join(',')})` : ''}`)
      .then(({ data, error }) => {
        if (error) throw new Error(`lookup conversations failed: ${error.message}`);
        return (data ?? []).map((r) => r.id);
      }))
  : [];

// ── Deletion plan: [table, builderFn] in FK-dependency order ────────────────
// Each builder returns a query, or null to skip (nothing to target).
const plan = [
  ['homework_tasks', () => (studentIds.length ? base('homework_tasks').in('student_id', studentIds) : null)],
  ['lesson_confirmations', () => (studentIds.length ? base('lesson_confirmations').in('student_id', studentIds) : null)],
  ['lesson_files', () =>
    studentIds.length || uid
      ? base('lesson_files').or(orParts([['student_id', 'in', studentIds], ['uploaded_by_user_id', 'eq', uid]]))
      : null],
  ['messages', () =>
    conversationIds.length || uid
      ? base('messages').or(orParts([['conversation_id', 'in', conversationIds], ['sender_user_id', 'eq', uid]]))
      : null],
  ['conversations', () => (conversationIds.length ? base('conversations').in('id', conversationIds) : null)],
  ['reviews', () => (studentIds.length ? base('reviews').in('student_id', studentIds) : null)],
  ['teacher_students', () => (studentIds.length ? base('teacher_students').in('student_id', studentIds) : null)],
  ['lesson_notes', () => (studentIds.length ? base('lesson_notes').in('student_id', studentIds) : null)],
  ['lessons', () => (studentIds.length ? base('lessons').in('student_id', studentIds) : null)],
  ['booking_requests', () => (studentIds.length ? base('booking_requests').in('student_id', studentIds) : null)],
  ['match_results', () => (intakeIds.length ? base('match_results').in('intake_id', intakeIds) : null)],
  ['student_intakes', () =>
    studentIds.length || uid
      ? base('student_intakes').or(orParts([['student_id', 'in', studentIds], ['created_by_user_id', 'eq', uid]]))
      : null],
  ['notifications', () => (uid ? base('notifications').eq('user_id', uid) : null)],
  ['admin_actions', () => (uid ? base('admin_actions').eq('admin_user_id', uid) : null)],
  ['onboarding_drafts', () => (uid ? base('onboarding_drafts').eq('user_id', uid) : null)],
  ['students', () => (studentIds.length ? base('students').in('id', studentIds) : null)],
  ['teacher_profiles', () => (uid ? base('teacher_profiles').eq('user_id', uid) : null)],
  ['users', () => (uid ? base('users').eq('id', uid) : null)],
];

// Start each query from a filterable builder: .delete() when committing,
// .select('*') when previewing. Filter methods (.in/.eq/.or) chain off these.
function base(table) {
  return confirm ? supabase.from(table).delete() : supabase.from(table).select('*');
}

// Build a PostgREST .or() string from [column, op, value] tuples, skipping empties.
function orParts(tuples) {
  return tuples
    .filter(([, op, val]) => (op === 'in' ? Array.isArray(val) && val.length > 0 : val != null))
    .map(([col, op, val]) => (op === 'in' ? `${col}.in.(${val.join(',')})` : `${col}.${op}.${val}`))
    .join(',');
}

// ── Execute (count in dry-run, delete with --confirm) ───────────────────────
let totalAffected = 0;
for (const [table, build] of plan) {
  const q = build();
  if (!q) {
    console.log(`  ${table.padEnd(22)} -   (nothing linked)`);
    continue;
  }

  if (confirm) {
    // q is delete().<filters> — append .select('*') to return the deleted rows.
    const { data, error } = await q.select('*');
    if (error) throw new Error(`delete ${table} failed: ${error.message}`);
    const n = data?.length ?? 0;
    totalAffected += n;
    console.log(`  ${table.padEnd(22)} ✓ deleted ${n}`);
  } else {
    // q is already select('*').<filters> — await returns the matching rows.
    const { data, error } = await q;
    if (error) throw new Error(`count ${table} failed: ${error.message}`);
    const n = data?.length ?? 0;
    totalAffected += n;
    console.log(`  ${table.padEnd(22)} ~ would delete ${n}`);
  }
}

// ── Auth user ───────────────────────────────────────────────────────────────
const authUser = await findAuthUserByEmail(supabase, email);
if (authUser) {
  if (confirm) {
    const { error } = await supabase.auth.admin.deleteUser(authUser.id);
    if (error) throw new Error(`auth deleteUser failed: ${error.message}`);
    console.log(`  ${'auth.users'.padEnd(22)} ✓ deleted ${authUser.id}`);
  } else {
    console.log(`  ${'auth.users'.padEnd(22)} ~ would delete ${authUser.id}`);
  }
} else {
  console.log(`  ${'auth.users'.padEnd(22)} -   (no auth user)`);
}

console.log(
  `\n${confirm ? 'Deleted' : 'Would delete'} ${totalAffected} public-table row(s)` +
    `${authUser ? ' + 1 auth user' : ''}.`,
);
if (!confirm) console.log('Re-run with --confirm to perform the deletion.');
