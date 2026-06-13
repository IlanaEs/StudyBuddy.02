import {
  assertDemoSeedAllowed,
  classifyEnvironment,
  createSupabaseAdminClient,
  findAuthUserByEmail,
  hasColumn,
  must,
  parseSeedArgs,
  readBackendEnv,
} from './seed-utils.mjs';
import { seedTaxonomy } from './seed-taxonomy.mjs';
import { demoTeachers as teachers } from './demo-teachers-data.mjs';

const DEMO_SEED_TYPE = 'matching_mvp';

// Demo students + intakes (independent learners), one per QA scenario across the
// bands. Intakes are seeded status='open'; match_results are produced by the REAL
// matching engine on demand (POST /api/matching/:id/run, or via the app) — the
// seed never replicates the locked scorer. preferred_days/time_ranges are left
// null (= full availability overlap) so the documented outcome isn't reduced by
// soft gates. `expect` documents the intended outcome with the Phase 2 roster.
const students = [
  {
    email: 'demo.student.elementary@studybuddy.local',
    fullName: 'תלמיד דמו יסודי',
    gradeLevel: 'כיתה ה׳',
    intake: { subjectName: 'חשבון', level: 'elementary', expect: 'multi (3) — חשבון anchor' },
  },
  {
    email: 'demo.student.middle@studybuddy.local',
    fullName: 'תלמיד דמו חטיבה',
    gradeLevel: 'כיתה ח׳',
    intake: { subjectName: 'מתמטיקה', level: 'middle', expect: 'multi (3) — מתמטיקה anchor' },
  },
  {
    email: 'demo.student.high@studybuddy.local',
    fullName: 'תלמיד דמו תיכון',
    gradeLevel: 'כיתה י״א',
    intake: { subjectName: 'פיזיקה', level: 'high', expect: 'multi (3) — פיזיקה anchor' },
  },
  {
    email: 'demo.student.academic@studybuddy.local',
    fullName: 'סטודנט דמו',
    gradeLevel: 'שנה ב׳',
    intake: { subjectName: 'פיזיקה', level: 'academic', expect: 'multi (3) — פיזיקה anchor' },
  },
  {
    email: 'demo.student.single@studybuddy.local',
    fullName: 'תלמיד דמו התאמה יחידה',
    gradeLevel: 'כיתה י״ב',
    intake: { subjectName: 'כימיה', level: 'high', expect: 'single (1) — only the science teacher' },
  },
  {
    email: 'demo.student.nomatch@studybuddy.local',
    fullName: 'תלמיד דמו ללא התאמה',
    gradeLevel: 'כיתה ט׳',
    // Off-catalog subject → needs_manual_match; always zero matches + manual lead.
    intake: { customSubjectText: 'גיטרה קלאסית', level: 'middle', expect: 'zero — off-catalog manual-match lead' },
  },
  // ── Phase 3: soft-gate scenarios (covered subject, but a runtime filter bites) ──
  {
    email: 'demo.student.budget@studybuddy.local',
    fullName: 'תלמיד דמו תקציב נמוך',
    gradeLevel: 'כיתה י״א',
    // מתמטיקה is covered (rates 95/120/140) but budgetMax=70 fails strict budget.
    // Budget is relaxed in the budget_expansion phase, so this yields matches via
    // FALLBACK (fallback_phase_used='budget_expansion'), NOT zero.
    intake: {
      subjectName: 'מתמטיקה', level: 'high', budgetMax: 70,
      expect: 'matches via budget_expansion fallback (all teachers over budget)',
    },
  },
  {
    email: 'demo.student.availzero@studybuddy.local',
    fullName: 'תלמיד דמו ללא חפיפת זמינות',
    gradeLevel: 'כיתה י״ב',
    // כימיה has exactly one teacher (science), who teaches Sun/Mon eve + Fri morning.
    // Requesting Saturday (day 6) only → zero availability overlap. The 30-min
    // overlap floor is NEVER relaxed (incl. partial_results) → TRUE in-catalog zero.
    intake: {
      subjectName: 'כימיה', level: 'high', preferredDays: [6],
      expect: 'zero — covered subject but no availability overlap (Saturday)',
    },
  },
];

// ── Phase 3: parent → child matching path ──────────────────────────────────────
// A parent user with two children (students.parent_user_id). Intakes are created
// BY THE PARENT (created_by_user_id = parent), exercising the parent matching flow
// for both a multi and a single outcome.
const parent = {
  email: 'demo.parent@studybuddy.local',
  fullName: 'הורה דמו',
  children: [
    {
      fullName: 'ילד דמו א׳',
      gradeLevel: 'כיתה ח׳',
      intake: { subjectName: 'מתמטיקה', level: 'middle', expect: 'multi (3) — parent flow' },
    },
    {
      fullName: 'ילד דמו ב׳',
      gradeLevel: 'כיתה י״א',
      intake: { subjectName: 'כימיה', level: 'high', expect: 'single (1) — parent flow' },
    },
  ],
};

async function ensureAuthTeacher(supabase, teacher) {
  const existing = await findAuthUserByEmail(supabase, teacher.email);
  const metadata = {
    full_name: teacher.fullName,
    dev_seed: true,
    dev_seed_type: DEMO_SEED_TYPE,
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      app_metadata: { role: 'teacher', is_demo: true, seed_type: DEMO_SEED_TYPE },
      user_metadata: metadata,
      email_confirm: true,
    });
    if (error) throw new Error(`auth update ${teacher.email} failed: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: teacher.email,
    password: 'StudyBuddyDevSeed123!',
    email_confirm: true,
    app_metadata: { role: 'teacher', is_demo: true, seed_type: DEMO_SEED_TYPE },
    user_metadata: metadata,
  });
  if (error) throw new Error(`auth create ${teacher.email} failed: ${error.message}`);
  return data.user;
}

// Generic auth provisioning for non-teacher demo accounts (student / parent).
async function ensureAuthAccount(supabase, account, role) {
  const existing = await findAuthUserByEmail(supabase, account.email);
  const metadata = { full_name: account.fullName, dev_seed: true, dev_seed_type: DEMO_SEED_TYPE };
  const appMetadata = { role, is_demo: true, seed_type: DEMO_SEED_TYPE };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      app_metadata: appMetadata,
      user_metadata: metadata,
      email_confirm: true,
    });
    if (error) throw new Error(`auth update ${account.email} failed: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: 'StudyBuddyDevSeed123!',
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: metadata,
  });
  if (error) throw new Error(`auth create ${account.email} failed: ${error.message}`);
  return data.user;
}

// Builds a student_intakes row from a scenario `intake` def. Catalog subjects
// resolve via subjectIds; off-catalog use needs_manual_match + custom_subject_text.
// Optional soft-gate fields (budget / preferred days+times) default to null.
function buildIntakeRow(intake, studentId, createdByUserId, subjectIds, label) {
  const {
    subjectName,
    customSubjectText,
    level = null,
    budgetMin = null,
    budgetMax = null,
    preferredDays = null,
    preferredTimeRanges = null,
  } = intake;
  const isManual = !!customSubjectText;
  if (!isManual && !subjectIds.get(subjectName)) {
    throw new Error(`intake ${label}: subject '${subjectName}' missing from taxonomy`);
  }
  return {
    student_id: studentId,
    created_by_user_id: createdByUserId,
    subject_id: isManual ? null : subjectIds.get(subjectName),
    custom_subject_text: isManual ? customSubjectText : null,
    needs_manual_match: isManual,
    level,
    location_preference: 'online',
    budget_min: budgetMin,
    budget_max: budgetMax,
    preferred_days: preferredDays,
    preferred_time_ranges: preferredTimeRanges,
    status: 'open',
  };
}

// Seeds independent demo students + one open intake each. Idempotent: users
// upsert by email, the student row is reused per user_id (unique post-021), and
// the student's intakes are cleared then re-inserted. Intakes stay status='open';
// the real matching engine produces match_results on demand.
async function seedStudentsAndIntakes({ supabase, subjectIds, usersHasIsDemo }) {
  let intakeCount = 0;

  for (const student of students) {
    const authUser = await ensureAuthAccount(supabase, student, 'student');
    const [user] = await must(
      `user upsert ${student.email}`,
      supabase
        .from('users')
        .upsert(
          {
            supabase_auth_user_id: authUser.id,
            email: student.email,
            role: 'student',
            full_name: student.fullName,
            status: 'active',
            ...(usersHasIsDemo ? { is_demo: true } : {}),
          },
          { onConflict: 'email' },
        )
        .select('id,email')
        .limit(1),
    );

    // Reuse the existing student row for this user (user_id is unique post-021).
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let studentId = existingStudent?.id;
    if (!studentId) {
      const [created] = await must(
        `student insert ${student.email}`,
        supabase
          .from('students')
          .insert({ user_id: user.id, full_name: student.fullName, grade_level: student.gradeLevel })
          .select('id')
          .limit(1),
      );
      studentId = created.id;
    }

    // Idempotent: clear this student's intakes, then insert the scenario intake.
    await must(
      `clear intakes ${student.email}`,
      supabase.from('student_intakes').delete().eq('student_id', studentId),
    );

    await must(
      `intake insert ${student.email}`,
      supabase
        .from('student_intakes')
        .insert(buildIntakeRow(student.intake, studentId, user.id, subjectIds, student.email)),
    );
    intakeCount += 1;
  }

  return { students: students.length, intakes: intakeCount };
}

// Seeds the demo parent + children (students.parent_user_id) + one intake per
// child, created BY THE PARENT. Idempotent: parent user upsert by email, child
// reused by (parent_user_id, full_name), child intakes cleared then re-inserted.
async function seedParentAndChildren({ supabase, subjectIds, usersHasIsDemo }) {
  const authUser = await ensureAuthAccount(supabase, parent, 'parent');
  const [user] = await must(
    `user upsert ${parent.email}`,
    supabase
      .from('users')
      .upsert(
        {
          supabase_auth_user_id: authUser.id,
          email: parent.email,
          role: 'parent',
          full_name: parent.fullName,
          status: 'active',
          ...(usersHasIsDemo ? { is_demo: true } : {}),
        },
        { onConflict: 'email' },
      )
      .select('id,email')
      .limit(1),
  );

  let childCount = 0;
  let intakeCount = 0;

  for (const child of parent.children) {
    const { data: existingChild } = await supabase
      .from('students')
      .select('id')
      .eq('parent_user_id', user.id)
      .eq('full_name', child.fullName)
      .maybeSingle();

    let childId = existingChild?.id;
    if (!childId) {
      const [created] = await must(
        `child insert ${child.fullName}`,
        supabase
          .from('students')
          .insert({ parent_user_id: user.id, full_name: child.fullName, grade_level: child.gradeLevel })
          .select('id')
          .limit(1),
      );
      childId = created.id;
    }
    childCount += 1;

    await must(
      `clear child intakes ${child.fullName}`,
      supabase.from('student_intakes').delete().eq('student_id', childId),
    );
    await must(
      `child intake insert ${child.fullName}`,
      supabase
        .from('student_intakes')
        .insert(buildIntakeRow(child.intake, childId, user.id, subjectIds, child.fullName)),
    );
    intakeCount += 1;
  }

  return { parents: 1, children: childCount, parentIntakes: intakeCount };
}

export async function seedDemoMatching({ supabase }) {
  const taxonomy = await seedTaxonomy({ supabase });
  const subjectIds = taxonomy.subjectIds;
  const usersHasIsDemo = await hasColumn(supabase, 'users', 'is_demo');
  const profilesHasIsDemo = await hasColumn(supabase, 'teacher_profiles', 'is_demo');
  const profilesHasApprovalStatus = await hasColumn(supabase, 'teacher_profiles', 'approval_status');
  const seededTeacherIds = [];

  for (const teacher of teachers) {
    const authUser = await ensureAuthTeacher(supabase, teacher);
    const userPayload = {
      supabase_auth_user_id: authUser.id,
      email: teacher.email,
      role: 'teacher',
      full_name: teacher.fullName,
      status: 'active',
      ...(usersHasIsDemo ? { is_demo: true } : {}),
    };
    const [user] = await must(
      `user upsert ${teacher.email}`,
      supabase
        .from('users')
        .upsert(userPayload, { onConflict: 'email' })
        .select('id,email')
        .limit(1),
    );

    const profilePayload = {
      user_id: user.id,
      bio: teacher.bio,
      hourly_rate: teacher.hourlyRate,
      location_type: teacher.locationType,
      city: teacher.city ?? null,
      rating_avg: teacher.ratingAvg,
      rating_count: teacher.ratingCount,
      is_verified: true,
      // Migration 023 split the approval gate out of is_verified. Keep the
      // post-onboarding invariant a verified teacher must satisfy: verified ⇔
      // approved. Without this the seed leaves approval_status at its 'pending'
      // default — an is_verified=true / pending mismatch that 023's backfill
      // (set approval_status='approved' where is_verified=true) forbids, and
      // which would wrongly surface demo teachers in the admin approval queue.
      // Guarded so the seed still runs against a DB without 023 applied.
      ...(profilesHasApprovalStatus ? { approval_status: 'approved' } : {}),
      is_active: true,
      last_active_at: new Date().toISOString(),
      onboarding_completed: true,
      onboarding_step: 8,
      professional_status: 'dev_seed_teacher',
      legal_tax: true,
      legal_contractor: true,
      legal_minors: true,
      legal_community: true,
      legal_confirmed_at: new Date().toISOString(),
      ...(profilesHasIsDemo ? { is_demo: true } : {}),
    };
    const [profile] = await must(
      `teacher profile upsert ${teacher.email}`,
      supabase
        .from('teacher_profiles')
        .upsert(profilePayload, { onConflict: 'user_id' })
        .select('id,user_id')
        .limit(1),
    );

    seededTeacherIds.push(profile.id);

    await must(
      `clear teacher subjects ${teacher.email}`,
      supabase.from('teacher_subjects').delete().eq('teacher_id', profile.id),
    );
    await must(
      `teacher subjects insert ${teacher.email}`,
      supabase.from('teacher_subjects').insert(
        teacher.subjects.map((subject) => ({
          teacher_id: profile.id,
          subject_id: subjectIds.get(subject.name),
          level: subject.level,
          years_experience: subject.yearsExperience,
        })),
      ),
    );

    await must(
      `clear availability ${teacher.email}`,
      supabase.from('availability_slots').delete().eq('teacher_id', profile.id),
    );
    await must(
      `availability insert ${teacher.email}`,
      supabase.from('availability_slots').insert(
        teacher.slots.map((slot) => ({
          teacher_id: profile.id,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_active: true,
        })),
      ),
    );
  }

  const studentResult = await seedStudentsAndIntakes({ supabase, subjectIds, usersHasIsDemo });
  const parentResult = await seedParentAndChildren({ supabase, subjectIds, usersHasIsDemo });

  const [{ count: subjectCount }, { count: teacherSubjectCount }, { count: availabilityCount }] =
    await Promise.all([
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      supabase
        .from('teacher_subjects')
        .select('*', { count: 'exact', head: true })
        .in('teacher_id', seededTeacherIds),
      supabase
        .from('availability_slots')
        .select('*', { count: 'exact', head: true })
        .in('teacher_id', seededTeacherIds),
    ]);

  return {
    subjects: taxonomy.subjects,
    totalSubjects: subjectCount,
    teachers: seededTeacherIds.length,
    teacherSubjects: teacherSubjectCount,
    availabilitySlots: availabilityCount,
    students: studentResult.students,
    intakes: studentResult.intakes,
    parents: parentResult.parents,
    children: parentResult.children,
    parentIntakes: parentResult.parentIntakes,
    usersIsDemoColumn: usersHasIsDemo,
    teacherProfilesIsDemoColumn: profilesHasIsDemo,
    teacherProfilesApprovalStatusColumn: profilesHasApprovalStatus,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scriptName = 'db:seed:demo';
  const args = parseSeedArgs();
  const env = readBackendEnv();
  const { supabase, supabaseUrl } = createSupabaseAdminClient(env, scriptName);
  const envInfo = classifyEnvironment(env, supabaseUrl, args);

  assertDemoSeedAllowed({ scriptName, envInfo, supabaseUrl, args });

  const result = await seedDemoMatching({ supabase });
  console.log(JSON.stringify({ seeded: true, type: 'demo', environment: envInfo.kind, ...result }, null, 2));
}
