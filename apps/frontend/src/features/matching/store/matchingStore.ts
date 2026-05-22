import { create } from 'zustand';
import type { StudentIntakeState, UserContext, LearningGoal, EducationLevel, LocationPreference, Urgency, TimeSlot, MatchResult } from '../types/matching.types';

// Suppress unused import warnings — these types are part of the public API surface
export type { UserContext, LearningGoal, EducationLevel, LocationPreference, Urgency, TimeSlot };

const STORAGE_KEY = 'sb_student_onboarding';

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
  persistDraft: () => void;
  restoreFromStorage: () => boolean;
  clearStorage: () => void;
}

const defaultIntake: StudentIntakeState = {
  userContext: null,
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
    // Only persist anonymous steps (1–7), before auth gate at step 8
    if (step > 0 && step <= 7) {
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

  setStep: (step) => set({ step }),
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
  reset: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ step: 0, intake: defaultIntake, matchResults: [], selectedMatchId: null });
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
