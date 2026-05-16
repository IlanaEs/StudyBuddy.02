import type { MatchResult } from '../types/matching.types';

export function mapApiMatch(raw: Record<string, unknown>): MatchResult {
  const teacher = raw.teacher as Record<string, unknown>;
  return {
    id: raw.id as string,
    rank: raw.rank as number,
    matchScore: raw.match_score as number,
    reason: raw.reason as string | undefined,
    teacher: {
      id: teacher.id as string,
      fullName: teacher.full_name as string,
      bio: teacher.bio as string | undefined,
      hourlyRate: teacher.hourly_rate as number,
      ratingAvg: teacher.rating_avg as number,
      ratingCount: teacher.rating_count as number,
      isVerified: teacher.is_verified as boolean,
    },
  };
}
