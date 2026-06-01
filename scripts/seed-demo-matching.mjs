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
    bio: 'מורה דמו ל-QA מקומי: כימיה, ביולוגיה ומדעי המחשב.',
    hourlyRate: 140,
    locationType: 'online',
    ratingAvg: 4.9,
    ratingCount: 41,
    subjects: [
      { name: 'כימיה', level: null, yearsExperience: 4 },
      { name: 'ביולוגיה', level: null, yearsExperience: 4 },
      { name: 'מדעי המחשב', level: null, yearsExperience: 7 },
      { name: 'מתמטיקה', level: null, yearsExperience: 4 },
    ],
    slots: [
      { dayOfWeek: 0, startTime: '17:00', endTime: '22:00' },
      { dayOfWeek: 1, startTime: '17:00', endTime: '22:00' },
      { dayOfWeek: 5, startTime: '09:00', endTime: '13:00' },
    ],
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

export async function seedDemoMatching({ supabase }) {
  const taxonomy = await seedTaxonomy({ supabase });
  const subjectIds = taxonomy.subjectIds;
  const usersHasIsDemo = await hasColumn(supabase, 'users', 'is_demo');
  const profilesHasIsDemo = await hasColumn(supabase, 'teacher_profiles', 'is_demo');
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
    usersIsDemoColumn: usersHasIsDemo,
    teacherProfilesIsDemoColumn: profilesHasIsDemo,
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
