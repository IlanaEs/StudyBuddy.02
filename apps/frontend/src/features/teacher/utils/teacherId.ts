// Stable display Teacher ID derived deterministically from teacher_profiles.id
// (a UUID). No backend: the same profile always yields the same SB-TCH-##### code,
// and it never changes because the UUID never changes.
export function deriveTeacherDisplayId(profileId: string | null): string | null {
  if (!profileId) return null;
  const hex = profileId.replace(/-/g, '').slice(0, 8);
  const n = parseInt(hex, 16);
  if (Number.isNaN(n)) return null;
  return `SB-TCH-${String(n % 100000).padStart(5, '0')}`;
}
