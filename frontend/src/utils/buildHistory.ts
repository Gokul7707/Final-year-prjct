export interface BuildHistoryEntry {
  id: string;
  user: string;
  name: string;
  createdAt: string;
  cost: number;
  weight: number;
  /** Share token — the same payload the QR viewer uses, so history survives refresh. */
  token: string;
}

const KEY = 'genesis-build-history';
const MAX_ENTRIES = 12;

export function loadBuildHistory(): BuildHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBuildToHistory(entry: BuildHistoryEntry): BuildHistoryEntry[] {
  const history = loadBuildHistory().filter((e) => e.id !== entry.id);
  history.unshift(entry);
  const trimmed = history.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* quota — history is best-effort */
  }
  return trimmed;
}
