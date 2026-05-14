import { create } from 'zustand';
import { getJSON, setJSON } from '../lib/storage';

interface ChecklistItemState {
  id: string;
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'pending';
  note?: string;
  photoUris?: string[];
}

interface ChecklistStore {
  journeyId: string | null;
  step: number;
  items: ChecklistItemState[];
  photos: { front?: string; left?: string; right?: string; rear?: string };
  init: (journeyId: string, items: ChecklistItemState[]) => void;
  setItemStatus: (id: string, status: 'pass' | 'fail', note?: string) => void;
  setPhoto: (position: 'front' | 'left' | 'right' | 'rear', uri: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  persist: () => void;
  restore: (journeyId: string) => boolean;
}

export const useChecklist = create<ChecklistStore>((set, get) => ({
  journeyId: null,
  step: 0,
  items: [],
  photos: {},

  init: (journeyId, items) => {
    set({ journeyId, step: 0, items, photos: {} });
  },

  setItemStatus: (id, status, note) => {
    set((s) => ({
      items: s.items.map((i) => i.id === id ? { ...i, status, note } : i),
    }));
    get().persist();
  },

  setPhoto: (position, uri) => {
    set((s) => ({ photos: { ...s.photos, [position]: uri } }));
    get().persist();
  },

  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 5) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),

  persist: () => {
    const { journeyId, step, items, photos } = get();
    if (journeyId) setJSON(`checklist:${journeyId}`, { step, items, photos });
  },

  restore: (journeyId) => {
    const saved = getJSON<{ step: number; items: ChecklistItemState[]; photos: Record<string, string> }>(`checklist:${journeyId}`);
    if (saved) {
      set({ journeyId, ...saved });
      return true;
    }
    return false;
  },
}));
