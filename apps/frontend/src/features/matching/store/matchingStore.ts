import { create } from 'zustand';
import type { StudentIntakeState, UserContext, LearningGoal, EducationLevel, LocationPreference, Urgency, TimeSlot, MatchResult } from '../types/matching.types';

// Suppress unused import warnings — these types are part of the public API surface
export type { UserContext, LearningGoal, EducationLevel, LocationPreference, Urgency, TimeSlot };

interface MatchingStore {
  step: number;
  intake: StudentIntakeState;
  matchResults: MatchResult[];
  selectedMatchId: string | null;
  isLoading: boolean;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateIntake: (patch: Partial<StudentIntakeState>) => void;
  setMatchResults: (results: MatchResult[]) => void;
  selectMatch: (id: string) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

const defaultIntake: StudentIntakeState = {
  userContext: null,
  fullName: '',
  learningGoal: null,
  gradeLevel: null,
  subLevel: '',
  subjectId: '',
  subjectName: '',
  level: '',
  goal: '',
  budgetMin: null,
  budgetMax: null,
  preferredDays: [],
  preferredTimeRanges: [],
  urgency: null,
  locationPreference: null,
  city: '',
  learningStyle: [],
  softPreferences: [],
};

export const useMatchingStore = create<MatchingStore>((set) => ({
  step: 0,
  intake: defaultIntake,
  matchResults: [],
  selectedMatchId: null,
  isLoading: false,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  updateIntake: (patch) => set((s) => ({ intake: { ...s.intake, ...patch } })),
  setMatchResults: (results) => set({ matchResults: results }),
  selectMatch: (id) => set({ selectedMatchId: id }),
  setLoading: (v) => set({ isLoading: v }),
  reset: () => set({ step: 0, intake: defaultIntake, matchResults: [], selectedMatchId: null }),
}));
