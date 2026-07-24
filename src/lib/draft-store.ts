/**
 * Utility for short-window state preservation (draft saving).
 * Prevents loss of progress when app is closed, refreshed, or minimized.
 */

const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds short window period

export interface SavedDraft<T> {
  data: T;
  timestamp: number;
  id: string;
}

export function saveDraftState<T>(key: string, data: T, id: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedDraft<T> = {
      data,
      timestamp: Date.now(),
      id,
    };
    localStorage.setItem(`studiodesk_draft_${key}`, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed to save draft state to localStorage:", e);
  }
}

export function getDraftState<T>(key: string, expectedId?: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`studiodesk_draft_${key}`);
    if (!raw) return null;

    const payload: SavedDraft<T> = JSON.parse(raw);
    const age = Date.now() - payload.timestamp;

    // Check expiration window (short window period)
    if (age > ttlMs) {
      clearDraftState(key);
      return null;
    }

    if (expectedId && payload.id !== expectedId) {
      return null;
    }

    return payload.data;
  } catch (e) {
    console.warn("Failed to read draft state from localStorage:", e);
    return null;
  }
}

export function clearDraftState(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`studiodesk_draft_${key}`);
  } catch (e) {
    console.warn("Failed to clear draft state:", e);
  }
}
