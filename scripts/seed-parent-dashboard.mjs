/**
 * seed-parent-dashboard.mjs
 *
 * Creates deterministic QA seed data for /parent/dashboard end-to-end testing.
 *
 * Scenario A — עומר לוי (Omer):
 *   - Upcoming scheduled lesson
 *   - 3 recent completed lessons
 *   - lesson_notes with shared_summary + structured homework_tasks (1 in_progress)
 *   - 1 pending lesson_confirmation
 *
 * Scenario B — דניאל לוי (Daniel):
 *   - No upcoming lessons
 *   - 2 recent completed lessons
 *   - lesson_notes with no open homework_tasks
 *   - All confirmations approved
 *
 * Rerunnable: uses upsert/select-or-insert patterns throughout.
 * Never runs in production; requires --allow-remote-dev-seed for non-localhost.
 *
 * Usage:
 *   npm run db:seed:parent-dashboard
 *   npm run db:seed:parent-dashboard -- --allow-remote-dev-seed
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const allowRemoteDevSeed = process.argv.includes('--allow-remote-dev-seed');
const backendEnvPath = new URL('../apps/backend/.env', import.meta.url);

// ── Env helpers ───────────────────────────────────────────────────────────────

function readBackendEnv() {
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

function requireEnv(env, key) {
  const value = env[key] ?? process.env[key];
  if (!value) throw new Error(`${key} is required for db:seed:parent-dashboard`);
  return value;
}

function assertDevTarget(supabaseUrl) {
  const isLocal = /localhost|127\.0\.0\.1/.test(supabaseUrl);
  const explicitEnv = (
    process.env.STUDYBUDDY_ENV ??
    process.env.APP_ENV ??
    process.env.ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV ??
    ''
  ).toLowerCase();

  if (explicitEnv === 'production' || explicitEnv === 'prod') {
    throw new Error('Refusing to run demo seed against production environment.');
  }

  if (!isLocal && !['development', 'dev', 'staging', 'preview'].includes(explicitEnv)) {
    throw new Error(
      'Refusing to seed an ambiguous remote environment. ' +
        'Set STUDYBUDDY_ENV=development or STUDYBUDDY_ENV=staging.',
    );
  }

  if (!isLocal && !allowRemoteDevSeed) {
    throw new Error(
      'Refusing to seed a remote Supabase project without --allow-remote-dev-seed.\n' +
        'This script creates clearly marked QA/dev seed data.',
    );
  }

  if (!isLocal) {
    console.error('\n============================================================');
    console.error('WARNING: db:seed:parent-dashboard is targeting a remote Supabase project.');
    console.error(`Environment: ${explicitEnv}`);
    console.error(`Target: ${supabaseUrl}`);
    console.error('This seed creates demo dashboard data and is not production-safe.');
    console.error('============================================================\n');
  }
}

// ── Query helpers ─────────────────────────────────────────────────────────────

async function must(label, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${label} failed: ${error.message}`);
  return data;
}

async function hasColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`auth listUsers failed: ${error.message}`);
    const user = data.users.find((u) => u.email === email);
    if (user) return user;
    if (data.users.length < 100) return null;
    page += 1;
  }
  throw new Error(`Could not scan auth users for ${email}`);
}

// ── Init ──────────────────────────────────────────────────────────────────────

const env = readBackendEnv();
const supabaseUrl = requireEnv(env, 'SUPABASE_URL');
const serviceRoleKey = requireEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
assertDevTarget(supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const usersHasIsDemo = await hasColumn('users', 'is_demo');

// ── Constants ─────────────────────────────────────────────────────────────────

const PARENT_EMAIL = 'parent.qa+studybuddy@example.com';
const PARENT_NAME = 'דנה לוי';
const PARENT_PASSWORD = 'StudyBuddyDevSeed123!';

const CHILDREN = [
  { fullName: 'עומר לוי', gradeLevel: 'כיתה ח' },
  { fullName: 'דניאל לוי', gradeLevel: 'כיתה ו' },
];

// ── Step 1: Ensure matching-seed subjects and teacher exist ───────────────────

async function resolveTeacherAndSubjects() {
  // Find first available active verified teacher (prefer matching-seed teacher)
  const { data: profiles, error: pErr } = await supabase
    .from('teacher_profiles')
    .select('id,user_id,hourly_rate')
    .eq('is_active', true)
    .eq('is_verified', true)
    .limit(1);

  if (pErr) throw new Error(`teacher_profiles query failed: ${pErr.message}`);
  if (!profiles || profiles.length === 0) {
    throw new Error(
      'No active verified teacher found. Run `npm run db:seed:demo` (matching MVP demo seed) first.',
    );
  }

  const teacherProfile = profiles[0];

  // Find subjects: prefer מתמטיקה or אנגלית, fallback to any
  const { data: subjects, error: sErr } = await supabase
    .from('subjects')
    .select('id,name')
    .in('name', ['מתמטיקה', 'אנגלית']);

  if (sErr) throw new Error(`subjects query failed: ${sErr.message}`);

  let mathSubjectId = null;
  let engSubjectId = null;

  for (const s of subjects ?? []) {
    if (s.name === 'מתמטיקה') mathSubjectId = s.id;
    if (s.name === 'אנגלית') engSubjectId = s.id;
  }

  // If neither exists, upsert them (safe fallback for clean DBs)
  if (!mathSubjectId) {
    const [row] = await must(
      'upsert מתמטיקה',
      supabase
        .from('subjects')
        .upsert({ name: 'מתמטיקה', category: 'school_core', is_active: true }, { onConflict: 'name' })
        .select('id'),
    );
    mathSubjectId = row.id;
  }
  if (!engSubjectId) {
    const [row] = await must(
      'upsert אנגלית',
      supabase
        .from('subjects')
        .upsert({ name: 'אנגלית', category: 'languages', is_active: true }, { onConflict: 'name' })
        .select('id'),
    );
    engSubjectId = row.id;
  }

  console.error(`  teacher_profile_id: ${teacherProfile.id}`);
  console.error(`  math subject_id:    ${mathSubjectId}`);
  console.error(`  eng  subject_id:    ${engSubjectId}`);

  return {
    teacherProfileId: teacherProfile.id,
    hourlyRate: teacherProfile.hourly_rate ?? 120,
    mathSubjectId,
    engSubjectId,
  };
}

// ── Step 2: Ensure parent auth user + public.users row ───────────────────────

async function ensureParent() {
  // Auth user
  let authUser = await findAuthUserByEmail(supabase, PARENT_EMAIL);
  if (authUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(authUser.id, {
      app_metadata: { role: 'parent' },
      user_metadata: { full_name: PARENT_NAME, dev_seed: true, dev_seed_type: 'parent_dashboard' },
      email_confirm: true,
    });
    if (error) throw new Error(`auth update parent failed: ${error.message}`);
    authUser = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: PARENT_EMAIL,
      password: PARENT_PASSWORD,
      email_confirm: true,
      app_metadata: { role: 'parent' },
      user_metadata: { full_name: PARENT_NAME, dev_seed: true, dev_seed_type: 'parent_dashboard' },
    });
    if (error) throw new Error(`auth create parent failed: ${error.message}`);
    authUser = data.user;
  }

  // public.users row
  const [user] = await must(
    'upsert parent user',
    supabase
      .from('users')
      .upsert(
        {
          supabase_auth_user_id: authUser.id,
          email: PARENT_EMAIL,
          role: 'parent',
          full_name: PARENT_NAME,
          status: 'active',
          ...(usersHasIsDemo ? { is_demo: true } : {}),
        },
        { onConflict: 'email' },
      )
      .select('id,email')
      .limit(1),
  );

  console.error(`  parent user.id: ${user.id}`);
  return { userId: user.id };
}

// ── Step 3: Ensure child students ─────────────────────────────────────────────

async function ensureChild(parentUserId, childDef) {
  // Check if child already exists
  const { data: existing } = await supabase
    .from('students')
    .select('id,full_name')
    .eq('parent_user_id', parentUserId)
    .eq('full_name', childDef.fullName)
    .maybeSingle();

  if (existing) {
    console.error(`  child [reused] ${childDef.fullName}: ${existing.id}`);
    return existing.id;
  }

  const [child] = await must(
    `insert child ${childDef.fullName}`,
    supabase
      .from('students')
      .insert({
        parent_user_id: parentUserId,
        full_name: childDef.fullName,
        grade_level: childDef.gradeLevel,
      })
      .select('id'),
  );

  console.error(`  child [new] ${childDef.fullName}: ${child.id}`);
  return child.id;
}

// ── Step 4: Lesson helpers ────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

/**
 * Returns an ISO timestamp for this calendar week's specific day of week
 * (0 = Sunday … 6 = Saturday) at the given local hour.
 * Always stays within the current Sun–Sat week, regardless of today's date.
 */
function thisWeekDay(dowIndex, hour) {
  const today = new Date();
  const currentDow = today.getDay(); // 0 = Sun
  const diff = dowIndex - currentDow; // may be negative for past days of this week
  const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff);
  target.setHours(hour, 0, 0, 0);
  return target.toISOString();
}

function endTime(isoStart, minutes = 60) {
  return new Date(new Date(isoStart).getTime() + minutes * 60_000).toISOString();
}

async function upsertLesson(lesson) {
  // Idempotency: look up by (student_id, teacher_id, scheduled_start_at)
  const { data: existing } = await supabase
    .from('lessons')
    .select('id')
    .eq('student_id', lesson.student_id)
    .eq('teacher_id', lesson.teacher_id)
    .eq('scheduled_start_at', lesson.scheduled_start_at)
    .maybeSingle();

  if (existing) return existing.id;

  const [row] = await must(
    `insert lesson ${lesson.scheduled_start_at}`,
    supabase.from('lessons').insert(lesson).select('id'),
  );
  return row.id;
}

async function upsertLessonNote(lessonId, teacherProfileId, studentId, noteData) {
  const { data: existing } = await supabase
    .from('lesson_notes')
    .select('id')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (existing) return existing.id;

  const [row] = await must(
    `insert lesson_note for lesson ${lessonId}`,
    supabase
      .from('lesson_notes')
      .insert({
        lesson_id: lessonId,
        teacher_id: teacherProfileId,
        student_id: studentId,
        ...noteData,
      })
      .select('id'),
  );
  return row.id;
}

async function upsertHomeworkTask(lessonNoteId, studentId, taskDef) {
  // Idempotency by (lesson_note_id, title)
  const { data: existing } = await supabase
    .from('homework_tasks')
    .select('id')
    .eq('lesson_note_id', lessonNoteId)
    .eq('title', taskDef.title)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('homework_tasks')
      .update({ status: taskDef.status })
      .eq('id', existing.id);
    return existing.id;
  }

  const [row] = await must(
    `insert homework_task ${taskDef.title}`,
    supabase
      .from('homework_tasks')
      .insert({ lesson_note_id: lessonNoteId, student_id: studentId, ...taskDef })
      .select('id'),
  );
  return row.id;
}

async function upsertConfirmation(lessonId, studentId, parentUserId, confirmationDef) {
  const { data: existing } = await supabase
    .from('lesson_confirmations')
    .select('id,status')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (existing) {
    // Only update status if changing (avoid overwriting approved with pending)
    if (existing.status !== confirmationDef.status) {
      await supabase
        .from('lesson_confirmations')
        .update({
          status: confirmationDef.status,
          confirmed_at: confirmationDef.status !== 'pending' ? new Date().toISOString() : null,
        })
        .eq('id', existing.id);
    }
    return existing.id;
  }

  const [row] = await must(
    `insert lesson_confirmation for lesson ${lessonId}`,
    supabase
      .from('lesson_confirmations')
      .insert({
        lesson_id: lessonId,
        student_id: studentId,
        parent_user_id: parentUserId,
        amount: confirmationDef.amount,
        status: confirmationDef.status,
        confirmed_at: confirmationDef.status !== 'pending' ? new Date().toISOString() : null,
      })
      .select('id'),
  );
  return row.id;
}

// ── Step 5: Seed עומר (full scenario) ─────────────────────────────────────────

async function seedOmer(studentId, parentUserId, teacherProfileId, hourlyRate, mathSubjectId, engSubjectId) {
  console.error('\n  Seeding עומר...');

  // ── 3 recent completed lessons ─────────────────────────────────────────────
  const completedDates = [
    daysAgo(14),
    daysAgo(7),
    daysAgo(3),
  ];

  const completedIds = [];
  for (const start of completedDates) {
    const id = await upsertLesson({
      teacher_id: teacherProfileId,
      student_id: studentId,
      subject_id: mathSubjectId,
      status: 'completed',
      scheduled_start_at: start,
      scheduled_end_at: endTime(start),
      duration_minutes: 60,
      location_type: 'online',
      completed_at: endTime(start),
    });
    completedIds.push(id);
    console.error(`    completed lesson: ${id} (${start.slice(0, 10)})`);
  }

  // ── Latest lesson note with homework tasks on the most recent lesson ──────
  const latestLessonId = completedIds[completedIds.length - 1];
  const noteId = await upsertLessonNote(latestLessonId, teacherProfileId, studentId, {
    shared_summary:
      'השיעור התמקד בפתרון משוואות ממעלה שנייה. עומר מראה שיפור ניכר. שיעורי בית: לפתור 5 תרגילים מעמוד 47.',
    homework:
      'לפתור תרגילים 1–5 עמ׳ 47 בספר. להביא ביום ראשון.',
  });
  console.error(`    lesson_note: ${noteId}`);

  const taskInProgress = await upsertHomeworkTask(noteId, studentId, {
    title: 'תרגילים 1–5 עמ׳ 47 — פתרון משוואות',
    status: 'in_progress',
  });
  const taskOpen = await upsertHomeworkTask(noteId, studentId, {
    title: 'קריאה: מבוא לנוסחת הריבוע השלם',
    status: 'open',
  });
  console.error(`    homework_task (in_progress): ${taskInProgress}`);
  console.error(`    homework_task (open):        ${taskOpen}`);

  // ── Confirmations for all 3 completed lessons ─────────────────────────────
  // Two approved, one pending (the most recent)
  for (let i = 0; i < completedIds.length; i++) {
    const isPending = i === completedIds.length - 1;
    const confId = await upsertConfirmation(
      completedIds[i],
      studentId,
      parentUserId,
      {
        amount: hourlyRate,
        status: isPending ? 'pending' : 'approved',
      },
    );
    console.error(`    confirmation [${isPending ? 'pending' : 'approved'}]: ${confId}`);
  }

  // ── 1 upcoming scheduled lesson (next occurrence, ~3 days out) ──────────
  const upcomingStart = daysFromNow(3);
  const upcomingId = await upsertLesson({
    teacher_id: teacherProfileId,
    student_id: studentId,
    subject_id: engSubjectId,
    status: 'scheduled',
    scheduled_start_at: upcomingStart,
    scheduled_end_at: endTime(upcomingStart),
    duration_minutes: 60,
    location_type: 'online',
  });
  console.error(`    upcoming lesson: ${upcomingId} (${upcomingStart.slice(0, 10)})`);

  // ── This-week lesson (Tuesday 16:00) — always visible in weekly schedule ─
  const weeklyStart = thisWeekDay(2, 16); // 2 = Tuesday
  const weeklyId = await upsertLesson({
    teacher_id: teacherProfileId,
    student_id: studentId,
    subject_id: mathSubjectId,
    status: 'scheduled',
    scheduled_start_at: weeklyStart,
    scheduled_end_at: endTime(weeklyStart, 90),
    duration_minutes: 90,
    location_type: 'online',
  });
  console.error(`    this-week lesson (Tue): ${weeklyId} (${weeklyStart.slice(0, 10)})`);

  return { completedIds, noteId, upcomingId, weeklyId };
}

// ── Step 6: Seed דניאל (minimal / all-quiet scenario) ────────────────────────

async function seedDaniel(studentId, parentUserId, teacherProfileId, hourlyRate, mathSubjectId) {
  console.error('\n  Seeding דניאל...');

  // ── 2 recent completed lessons, all confirmations approved ────────────────
  const completedDates = [daysAgo(10), daysAgo(4)];
  const completedIds = [];

  for (const start of completedDates) {
    const id = await upsertLesson({
      teacher_id: teacherProfileId,
      student_id: studentId,
      subject_id: mathSubjectId,
      status: 'completed',
      scheduled_start_at: start,
      scheduled_end_at: endTime(start),
      duration_minutes: 60,
      location_type: 'online',
      completed_at: endTime(start),
    });
    completedIds.push(id);
    console.error(`    completed lesson: ${id} (${start.slice(0, 10)})`);

    const confId = await upsertConfirmation(id, studentId, parentUserId, {
      amount: hourlyRate,
      status: 'approved',
    });
    console.error(`    confirmation [approved]: ${confId}`);
  }

  // ── Latest lesson note with completed homework (no open tasks) ────────────
  const latestLessonId = completedIds[completedIds.length - 1];
  const noteId = await upsertLessonNote(latestLessonId, teacherProfileId, studentId, {
    shared_summary:
      'השיעור עסק בשברים וחישובים כלליים. דניאל השלים את כל שיעורי הבית בהצלחה.',
    homework: 'כל שיעורי הבית הושלמו.',
  });
  console.error(`    lesson_note: ${noteId}`);

  const taskDone = await upsertHomeworkTask(noteId, studentId, {
    title: 'חישוב שברים — דפי תרגול',
    status: 'completed',
  });
  console.error(`    homework_task (completed): ${taskDone}`);

  // ── This-week lesson (Thursday 15:00) — always visible in weekly schedule ─
  const weeklyStart = thisWeekDay(4, 15); // 4 = Thursday
  const weeklyId = await upsertLesson({
    teacher_id: teacherProfileId,
    student_id: studentId,
    subject_id: mathSubjectId,
    status: 'scheduled',
    scheduled_start_at: weeklyStart,
    scheduled_end_at: endTime(weeklyStart),
    duration_minutes: 60,
    location_type: 'online',
  });
  console.error(`    this-week lesson (Thu): ${weeklyId} (${weeklyStart.slice(0, 10)})`);

  return { completedIds, noteId, weeklyId };
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.error('\n── seed-parent-dashboard ─────────────────────────────────────');
console.error(`  target: ${supabaseUrl}`);

const { teacherProfileId, hourlyRate, mathSubjectId, engSubjectId } = await resolveTeacherAndSubjects();

console.error('\n  Step 2: parent user');
const { userId: parentUserId } = await ensureParent();

console.error('\n  Step 3: children');
const [omerStudentId, danielStudentId] = await Promise.all([
  ensureChild(parentUserId, CHILDREN[0]),
  ensureChild(parentUserId, CHILDREN[1]),
]);

const omerResult = await seedOmer(
  omerStudentId, parentUserId, teacherProfileId, hourlyRate, mathSubjectId, engSubjectId,
);
const danielResult = await seedDaniel(
  danielStudentId, parentUserId, teacherProfileId, hourlyRate, mathSubjectId,
);

// ── Verification counts ───────────────────────────────────────────────────────

const [
  { count: studentsCount },
  { count: lessonsCount },
  { count: notesCount },
  { count: confirmationsCount },
  { count: tasksCount },
] = await Promise.all([
  supabase.from('students').select('*', { count: 'exact', head: true }).eq('parent_user_id', parentUserId),
  supabase.from('lessons').select('*', { count: 'exact', head: true }).in('student_id', [omerStudentId, danielStudentId]),
  supabase.from('lesson_notes').select('*', { count: 'exact', head: true }).in('student_id', [omerStudentId, danielStudentId]),
  supabase.from('lesson_confirmations').select('*', { count: 'exact', head: true }).in('student_id', [omerStudentId, danielStudentId]),
  supabase.from('homework_tasks').select('*', { count: 'exact', head: true }).in('student_id', [omerStudentId, danielStudentId]),
]);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(
  JSON.stringify(
    {
      seeded: true,
      target: supabaseUrl,
      parent: {
        email: PARENT_EMAIL,
        userId: parentUserId,
        password: PARENT_PASSWORD,
      },
      children: {
        omer: { id: omerStudentId, upcomingLesson: omerResult.upcomingId },
        daniel: { id: danielStudentId },
      },
      counts: {
        children: studentsCount,
        lessons: lessonsCount,
        lessonNotes: notesCount,
        confirmations: confirmationsCount,
        homeworkTasks: tasksCount,
      },
      verificationQueries: {
        parentUser: `SELECT id, email, role FROM users WHERE email = '${PARENT_EMAIL}';`,
        children: `SELECT id, full_name, grade_level FROM students WHERE parent_user_id = '${parentUserId}';`,
        recentLessons: `SELECT id, status, scheduled_start_at FROM lessons WHERE student_id IN ('${omerStudentId}', '${danielStudentId}') ORDER BY scheduled_start_at DESC;`,
        pendingConfirmation: `SELECT id, status, amount FROM lesson_confirmations WHERE student_id = '${omerStudentId}' AND status = 'pending';`,
        homeworkTasks: `SELECT id, title, status FROM homework_tasks WHERE student_id = '${omerStudentId}';`,
      },
      manualQA: 'Login as parent.qa+studybuddy@example.com at /parent/dashboard',
      remoteDevSeed: !/localhost|127\.0\.0\.1/.test(supabaseUrl),
    },
    null,
    2,
  ),
);
