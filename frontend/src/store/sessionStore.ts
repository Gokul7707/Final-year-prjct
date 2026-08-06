import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DroneClassId } from '@/data/droneTypes';
import type { AssemblyPartId } from '@/data/quizFlow';

export type AppPhase =
  | 'login'
  | 'greeting'
  | 'select'
  | 'quiz'
  | 'custom'
  | 'export';

export interface BuildSnapshot {
  id: string;
  username: string;
  droneClass: DroneClassId | null;
  droneName: string;
  answers: Record<string, string>;
  customPrompt: string;
  attachedParts: AssemblyPartId[];
  createdAt: string;
}

interface SessionState {
  phase: AppPhase;
  username: string;
  isAuthenticated: boolean;
  selectedClass: DroneClassId | null;
  selectedFrameId: string;
  answers: Record<string, string>;
  customPrompt: string;
  attachedParts: AssemblyPartId[];
  quizIndex: number;
  buildId: string | null;
  greetingDone: boolean;

  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  setPhase: (phase: AppPhase) => void;
  completeGreeting: () => void;
  selectDroneClass: (id: DroneClassId, frameId: string) => void;
  answerQuiz: (stepId: string, optionId: string, part: AssemblyPartId) => void;
  setCustomPrompt: (prompt: string) => void;
  attachPart: (part: AssemblyPartId) => void;
  setQuizIndex: (index: number) => void;
  finalizeBuild: () => BuildSnapshot;
  resetBuild: () => void;
}

const emptyBuild = {
  selectedClass: null as DroneClassId | null,
  selectedFrameId: '',
  answers: {} as Record<string, string>,
  customPrompt: '',
  attachedParts: [] as AssemblyPartId[],
  quizIndex: 0,
  buildId: null as string | null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      phase: 'login',
      username: '',
      isAuthenticated: false,
      greetingDone: false,
      ...emptyBuild,

      login: (username, password) => {
        const u = username.trim();
        if (u.length < 2) return { ok: false, error: 'Callsign must be at least 2 characters.' };
        if (password.trim().length < 4) return { ok: false, error: 'Access code must be at least 4 characters.' };
        set({
          username: u,
          isAuthenticated: true,
          phase: 'greeting',
          greetingDone: false,
          ...emptyBuild,
        });
        return { ok: true };
      },

      logout: () =>
        set({
          phase: 'login',
          username: '',
          isAuthenticated: false,
          greetingDone: false,
          ...emptyBuild,
        }),

      setPhase: (phase) => set({ phase }),

      completeGreeting: () => set({ greetingDone: true, phase: 'select' }),

      selectDroneClass: (id, frameId) => {
        if (id === 'custom') {
          set({
            selectedClass: 'custom',
            selectedFrameId: frameId || 'frame-quad-250',
            phase: 'custom',
            attachedParts: [],
            answers: {},
            quizIndex: 0,
          });
          return;
        }
        set({
          selectedClass: id,
          selectedFrameId: frameId,
          phase: 'quiz',
          attachedParts: [],
          answers: {},
          quizIndex: 0,
        });
      },

      answerQuiz: (stepId, optionId, part) => {
        const { answers, attachedParts } = get();
        const nextParts = attachedParts.includes(part) ? attachedParts : [...attachedParts, part];
        set({
          answers: { ...answers, [stepId]: optionId },
          attachedParts: nextParts,
        });
      },

      setCustomPrompt: (prompt) => set({ customPrompt: prompt }),

      attachPart: (part) => {
        const { attachedParts } = get();
        if (attachedParts.includes(part)) return;
        set({ attachedParts: [...attachedParts, part] });
      },

      setQuizIndex: (index) => set({ quizIndex: index }),

      finalizeBuild: () => {
        const state = get();
        const id =
          state.buildId ||
          `GF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const snapshot: BuildSnapshot = {
          id,
          username: state.username,
          droneClass: state.selectedClass,
          droneName: state.selectedClass === 'custom' ? 'Custom Forge' : state.selectedClass || 'build',
          answers: state.answers,
          customPrompt: state.customPrompt,
          attachedParts: state.attachedParts,
          createdAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(`genesis-build-${id}`, JSON.stringify(snapshot));
        } catch {
          /* ignore quota */
        }
        set({ buildId: id, phase: 'export' });
        return snapshot;
      },

      resetBuild: () =>
        set({
          ...emptyBuild,
          phase: 'select',
        }),
    }),
    {
      name: 'genesis-session',
      partialize: (s) => ({
        username: s.username,
        isAuthenticated: s.isAuthenticated,
        greetingDone: s.greetingDone,
        phase: s.isAuthenticated ? (s.phase === 'login' ? 'greeting' : s.phase) : 'login',
      }),
    }
  )
);
