import { create } from 'zustand';
import type { StudentIntakeState, AccountType, UserContext, LearningGoal, EducationLevel, LocationPreference, Urgency, TimeSlot, MatchResult } from '../types/matching.types';

// Suppress unused import warnings — these types are part of the public API surface
export type { AccountType, UserContext, LearningGoal, EducationLevel, LocationPreference, Urgency, TimeSlot };

const STORAGE_KEY = 'sb_student_onboarding';

// Which entry flow the match results belong to. 'quick' = the condensed
// Find-Tutor wizard (dashboard), 'onboarding' = the full registration wizard.
// Shared result/booking/confirmation pages branch their back/return targets on
// this instead of duplicating routes.
export type MatchingFlow = 'onboarding' | 'quick' | null;

interface MatchingStore {
  step: number;
  intake: StudentIntakeState;
  matchResults: MatchResult[];
  selectedMatchId: string | null;
  isLoading: boolean;
  flow: MatchingFlow;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateIntake: (patch: Partial<StudentIntakeState>) => void;
  setMatchResults: (results: MatchResult[]) => void;
  selectMatch: (id: string) => void;
  setLoading: (v: boolean) => void;
  setFlow: (flow: MatchingFlow) => void;
  reset: () => void;
  persistDraft: () => void;
  restoreFromStorage: () => boolean;
  clearStorage: () => void;
}

const defaultIntake: StudentIntakeState = {
  accountType: null,
  studentId: null,
  fullName: '',
  childName: '',
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

function readStorage(): { step: number; intake: StudentIntakeState } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step: number; intake: StudentIntakeState };
    if (typeof parsed.step !== 'number' || !parsed.intake) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(step: number, intake: StudentIntakeState) {
  try {
    // Persist only the matching draft; session/auth remains owned by Supabase.
    if (step > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, intake }));
    }
  } catch {
    // Ignore storage errors (private browsing, quota)
  }
}

export const useMatchingStore = create<MatchingStore>((set, get) => ({
  step: 0,
  intake: defaultIntake,
  matchResults: [],
  selectedMatchId: null,
  isLoading: false,
  flow: null,

  setStep: (step) => {
    set({ step });
    const { intake } = get();
    writeStorage(step, intake);
  },
  nextStep: () => {
    set((s) => ({ step: s.step + 1 }));
    const { step, intake } = get();
    writeStorage(step, intake);
  },
  prevStep: () => {
    set((s) => ({ step: Math.max(0, s.step - 1) }));
    const { step, intake } = get();
    writeStorage(step, intake);
  },
  updateIntake: (patch) => {
    set((s) => ({ intake: { ...s.intake, ...patch } }));
    const { step, intake } = get();
    writeStorage(step, intake);
  },
  setMatchResults: (results) => set({ matchResults: results }),
  selectMatch: (id) => set({ selectedMatchId: id }),
  setLoading: (v) => set({ isLoading: v }),
  setFlow: (flow) => set({ flow }),
  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ step: 0, intake: defaultIntake, matchResults: [], selectedMatchId: null, flow: null });
  },

  persistDraft: () => {
    const { step, intake } = get();
    writeStorage(step, intake);
  },

  restoreFromStorage: () => {
    const saved = readStorage();
    if (!saved) return false;
    // Merge saved intake with defaultIntake to guard against missing keys
    const merged: StudentIntakeState = {
      ...defaultIntake,
      ...saved.intake,
      accountType: saved.intake.accountType ?? null,
      studentId: saved.intake.studentId ?? null,
      preferredDays: saved.intake.preferredDays ?? [],
      preferredTimeRanges: saved.intake.preferredTimeRanges ?? [],
      learningStyle: saved.intake.learningStyle ?? [],
      softPreferences: saved.intake.softPreferences ?? [],
    };
    set({ step: saved.step, intake: merged });
    return true;
  },

  clearStorage: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
}));
