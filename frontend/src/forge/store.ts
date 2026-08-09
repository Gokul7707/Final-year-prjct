import { create } from 'zustand';
import type { DesignBrief, DesignJob } from './types';
import { createJob, getJob } from './api';

export const DEFAULT_BRIEF: DesignBrief = {
  application: 'freestyle',
  payloadG: 0,
  flightTimeMin: 5,
  budgetInr: 30000,
  material: 'carbon',
  manufacturing: '3d-print',
  notes: '',
};

interface ForgeStore {
  brief: DesignBrief;
  job: DesignJob | null;
  selectedAlternativeId: string | null;
  setBrief: (patch: Partial<DesignBrief>) => void;
  submitBrief: () => Promise<string>;
  loadJob: (id: string) => Promise<DesignJob | null>;
  selectAlternative: (id: string) => void;
}

export const useForgeStore = create<ForgeStore>((set, get) => ({
  brief: DEFAULT_BRIEF,
  job: null,
  selectedAlternativeId: null,

  setBrief: (patch) => set((s) => ({ brief: { ...s.brief, ...patch } })),

  submitBrief: async () => {
    const { id } = await createJob(get().brief);
    const job = await getJob(id);
    set({ job, selectedAlternativeId: null });
    return id;
  },

  loadJob: async (id) => {
    try {
      const job = await getJob(id);
      set({ job });
      return job;
    } catch {
      set({ job: null });
      return null;
    }
  },

  selectAlternative: (id) => set({ selectedAlternativeId: id }),
}));
