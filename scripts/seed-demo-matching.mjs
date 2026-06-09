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

const DEMO_SEED_TYPE = 'matching_mvp';

// Phase 2 roster (10 teachers). All subjects are level=null (teach every band),
// so coverage is subject-driven. Engineered so every level band has a 3-result
// "cap" anchor + exactly-2 + exactly-1 paths; see docs/demo-seed-coverage-phase2.md.
// All teachers are online/both (online intakes only, post-017). Rates spread
// 80–180 so budget filtering is testable; availability spans all 7 days.
const teachers = [
  {
    email: 'devseed.teacher.math@studybuddy.local',
    fullName: 'מורה דמו מתמטיקה',
    bio: 'מורה דמו ל-QA מקומי: מתמטיקה ופיזיקה, שיעורים אונליין.',
    hourlyRate: 120,
    locationType: 'online',
    ratingAvg: 4.8,
    ratingCount: 34,
    subjects: [
      { name: 'מתמטיקה', level: null, yearsExperience: 5 },
      { name: 'פיזיקה', level: null, yearsExperience: 3 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '17:00', endTime: '22:00' },
      { dayOfWeek: 1, startTime: '16:00', endTime: '21:00' },
      { dayOfWeek: 3, startTime: '18:00', endTime: '22:00' },
    ],
  },
  {
    email: 'devseed.teacher.english@studybuddy.local',
    fullName: 'מורת דמו אנגלית',
    bio: 'מורת דמו ל-QA מקומי: אנגלית ולשון, זמינות גמישה.',
    hourlyRate: 95,
    locationType: 'both',
    city: 'תל אביב',
    ratingAvg: 4.7,
    ratingCount: 27,
    subjects: [
      { name: 'אנגלית', level: null, yearsExperience: 6 },
      { name: 'לשון', level: null, yearsExperience: 4 },
      { name: 'מתמטיקה', level: null, yearsExperience: 3 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '17:00', endTime: '21:00' },
      { dayOfWeek: 2, startTime: '15:00', endTime: '20:00' },
      { dayOfWeek: 4, startTime: '16:00', endTime: '21:00' },
    ],
  },
  {
    email: 'devseed.teacher.science@studybuddy.local',
    fullName: 'מורה דמו מדעים',
    bio: 'מורה דמו ל-QA מקומי: כימיה, ביולוגיה, מדעי המחשב ופיזיקה.',
    hourlyRate: 140,
    locationType: 'online',
    ratingAvg: 4.9,
    ratingCount: 41,
    subjects: [
      { name: 'כימיה', level: null, yearsExperience: 4 },
      { name: 'ביולוגיה', level: null, yearsExperience: 4 },
      { name: 'מדעי המחשב', level: null, yearsExperience: 7 },
      { name: 'מתמטיקה', level: null, yearsExperience: 4 },
      { name: 'פיזיקה', level: null, yearsExperience: 5 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '17:00', endTime: '22:00' },
      { dayOfWeek: 1, startTime: '17:00', endTime: '22:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '13:00' },
    ],
  },
  {
    email: 'devseed.teacher.elementary-core@studybuddy.local',
    fullName: 'מורה דמו יסודי',
    bio: 'מורה דמו ל-QA מקומי: חשבון, מדעים ועברית לבית הספר היסודי.',
    hourlyRate: 80,
    locationType: 'online',
    ratingAvg: 4.6,
    ratingCount: 18,
    subjects: [
      { name: 'חשבון', level: null, yearsExperience: 8 },
      { name: 'מדעים', level: null, yearsExperience: 6 },
      { name: 'עברית', level: null, yearsExperience: 8 },
      { name: 'קריאה וכתיבה', level: null, yearsExperience: 8 },
      { name: 'הבנת הנקרא', level: null, yearsExperience: 6 },
      { name: 'הכנה לכיתה א׳', level: null, yearsExperience: 5 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '16:00', endTime: '20:00' },
      { dayOfWeek: 2, startTime: '16:00', endTime: '20:00' },
      { dayOfWeek: 4, startTime: '16:00', endTime: '20:00' },
    ],
  },
  {
    email: 'devseed.teacher.elementary-lang@studybuddy.local',
    fullName: 'מורת דמו יסודי ושפות',
    bio: 'מורת דמו ל-QA מקומי: חשבון, מדעים ואנגלית ליסודי.',
    hourlyRate: 90,
    locationType: 'both',
    city: 'תל אביב',
    ratingAvg: 4.7,
    ratingCount: 22,
    subjects: [
      { name: 'חשבון', level: null, yearsExperience: 6 },
      { name: 'מדעים', level: null, yearsExperience: 5 },
      { name: 'אנגלית', level: null, yearsExperience: 7 },
    ],
    slots: [
      { dayOfWeek: 1, startTime: '15:00', endTime: '19:00' },
      { dayOfWeek: 3, startTime: '15:00', endTime: '19:00' },
      { dayOfWeek: 6, startTime: '09:00', endTime: '12:00' },
    ],
  },
  {
    email: 'devseed.teacher.elementary-plus@studybuddy.local',
    fullName: 'מורה דמו יסודי נוסף',
    bio: 'מורה דמו ל-QA מקומי: חשבון, מדעים ועברית.',
    hourlyRate: 85,
    locationType: 'online',
    ratingAvg: 4.5,
    ratingCount: 15,
    subjects: [
      { name: 'חשבון', level: null, yearsExperience: 4 },
      { name: 'מדעים', level: null, yearsExperience: 4 },
      { name: 'עברית', level: null, yearsExperience: 5 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '15:00', endTime: '19:00' },
      { dayOfWeek: 1, startTime: '16:00', endTime: '20:00' },
      { dayOfWeek: 3, startTime: '16:00', endTime: '20:00' },
    ],
  },
  {
    email: 'devseed.teacher.humanities@studybuddy.local',
    fullName: 'מורה דמו מדעי הרוח',
    bio: 'מורה דמו ל-QA מקומי: היסטוריה, ספרות, תנ״ך, אזרחות ולשון.',
    hourlyRate: 110,
    locationType: 'online',
    ratingAvg: 4.8,
    ratingCount: 29,
    subjects: [
      { name: 'היסטוריה', level: null, yearsExperience: 9 },
      { name: 'ספרות', level: null, yearsExperience: 7 },
      { name: 'תנ״ך', level: null, yearsExperience: 8 },
      { name: 'אזרחות', level: null, yearsExperience: 6 },
      { name: 'גיאוגרפיה', level: null, yearsExperience: 5 },
      { name: 'לשון', level: null, yearsExperience: 7 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '18:00', endTime: '22:00' },
      { dayOfWeek: 2, startTime: '18:00', endTime: '22:00' },
      { dayOfWeek: 4, startTime: '18:00', endTime: '22:00' },
    ],
  },
  {
    email: 'devseed.teacher.social@studybuddy.local',
    fullName: 'מורה דמו מדעי החברה',
    bio: 'מורה דמו ל-QA מקומי: פסיכולוגיה, כלכלה, תקשורת ואזרחות.',
    hourlyRate: 115,
    locationType: 'online',
    ratingAvg: 4.7,
    ratingCount: 24,
    subjects: [
      { name: 'היסטוריה', level: null, yearsExperience: 6 },
      { name: 'אזרחות', level: null, yearsExperience: 6 },
      { name: 'פסיכולוגיה', level: null, yearsExperience: 5 },
      { name: 'כלכלה', level: null, yearsExperience: 5 },
      { name: 'תקשורת', level: null, yearsExperience: 4 },
    ],
    slots: [
      { dayOfWeek: 1, startTime: '18:00', endTime: '22:00' },
      { dayOfWeek: 3, startTime: '18:00', endTime: '22:00' },
      { dayOfWeek: 4, startTime: '17:00', endTime: '21:00' },
    ],
  },
  {
    email: 'devseed.teacher.cs-school@studybuddy.local',
    fullName: 'מורה דמו מדעי המחשב',
    bio: 'מורה דמו ל-QA מקומי: תכנות, רובוטיקה, סייבר ומדעי המחשב.',
    hourlyRate: 160,
    locationType: 'online',
    ratingAvg: 4.9,
    ratingCount: 37,
    subjects: [
      { name: 'מדעי המחשב', level: null, yearsExperience: 8 },
      { name: 'תכנות בסיסי', level: null, yearsExperience: 8 },
      { name: 'רובוטיקה', level: null, yearsExperience: 5 },
      { name: 'סייבר', level: null, yearsExperience: 4 },
      { name: 'Python', level: null, yearsExperience: 7 },
      { name: 'Java', level: null, yearsExperience: 6 },
      { name: 'מבני נתונים', level: null, yearsExperience: 6 },
      { name: 'אלגוריתמים', level: null, yearsExperience: 6 },
      { name: 'OOP', level: null, yearsExperience: 6 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '18:00', endTime: '22:00' },
      { dayOfWeek: 1, startTime: '18:00', endTime: '22:00' },
      { dayOfWeek: 3, startTime: '18:00', endTime: '22:00' },
    ],
  },
  {
    email: 'devseed.teacher.academic-stem@studybuddy.local',
    fullName: 'מורה דמו אקדמי',
    bio: 'מורה דמו ל-QA מקומי: חדו״א, לינארית, הסתברות, סטטיסטיקה ופיתוח תוכנה.',
    hourlyRate: 180,
    locationType: 'both',
    city: 'חיפה',
    ratingAvg: 5.0,
    ratingCount: 52,
    subjects: [
      { name: 'חדו״א', level: null, yearsExperience: 10 },
      { name: 'לינארית', level: null, yearsExperience: 10 },
      { name: 'הסתברות', level: null, yearsExperience: 8 },
      { name: 'סטטיסטיקה', level: null, yearsExperience: 8 },
      { name: 'חקר ביצועים', level: null, yearsExperience: 6 },
      { name: 'מעגלים', level: null, yearsExperience: 6 },
      { name: 'פיזיקה', level: null, yearsExperience: 9 },
      { name: 'Python', level: null, yearsExperience: 8 },
      { name: 'React', level: null, yearsExperience: 6 },
      { name: 'Node.js', level: null, yearsExperience: 6 },
      { name: 'Full Stack', level: null, yearsExperience: 6 },
      { name: 'SQL', level: null, yearsExperience: 7 },
      { name: 'בסיסי נתונים', level: null, yearsExperience: 7 },
      { name: 'Data Analysis', level: null, yearsExperience: 5 },
      { name: 'מערכות הפעלה', level: null, yearsExperience: 6 },
      { name: 'רשתות', level: null, yearsExperience: 6 },
    ],
    slots: [
      { dayOfWeek: 2, startTime: '16:00', endTime: '21:00' },
      { dayOfWeek: 4, startTime: '16:00', endTime: '21:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '14:00' },
    ],
  },
];

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
];

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

async function ensureAuthStudent(supabase, student) {
  const existing = await findAuthUserByEmail(supabase, student.email);
  const metadata = {
    full_name: student.fullName,
    dev_seed: true,
    dev_seed_type: DEMO_SEED_TYPE,
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      app_metadata: { role: 'student', is_demo: true, seed_type: DEMO_SEED_TYPE },
      user_metadata: metadata,
      email_confirm: true,
    });
    if (error) throw new Error(`auth update ${student.email} failed: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: student.email,
    password: 'StudyBuddyDevSeed123!',
    email_confirm: true,
    app_metadata: { role: 'student', is_demo: true, seed_type: DEMO_SEED_TYPE },
    user_metadata: metadata,
  });
  if (error) throw new Error(`auth create ${student.email} failed: ${error.message}`);
  return data.user;
}

// Seeds independent demo students + one open intake each. Idempotent: users
// upsert by email, the student row is reused per user_id (unique post-021), and
// the student's intakes are cleared then re-inserted. Intakes stay status='open';
// the real matching engine produces match_results on demand.
async function seedStudentsAndIntakes({ supabase, subjectIds, usersHasIsDemo }) {
  let intakeCount = 0;

  for (const student of students) {
    const authUser = await ensureAuthStudent(supabase, student);
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

    const { subjectName, customSubjectText, level } = student.intake;
    const isManual = !!customSubjectText;
    if (!isManual && !subjectIds.get(subjectName)) {
      throw new Error(`intake ${student.email}: subject '${subjectName}' missing from taxonomy`);
    }

    await must(
      `intake insert ${student.email}`,
      supabase.from('student_intakes').insert({
        student_id: studentId,
        created_by_user_id: user.id,
        subject_id: isManual ? null : subjectIds.get(subjectName),
        custom_subject_text: isManual ? customSubjectText : null,
        needs_manual_match: isManual,
        level,
        location_preference: 'online',
        status: 'open',
      }),
    );
    intakeCount += 1;
  }

  return { students: students.length, intakes: intakeCount };
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
