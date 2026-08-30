// Architect age & intelligence — shared state between the sidebar widget and the popup.
import { writable } from 'svelte/store';

export interface ArchitectFactor {
  key: string;
  label: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface ArchitectUsage {
  totals: { calls: number; inputTokens: number; outputTokens: number; totalTokens: number; cost: number };
  byDay: Array<{ day: string; calls: number; totalTokens: number; cost: number }>;
  byModel: Array<{ provider: string; model: string; calls: number; totalTokens: number; cost: number }>;
}

export interface ArchitectAge {
  ok: boolean;
  bornAt: string | null;
  humanDays: number;
  humanYears: number;
  aiYears: number;
  multiplier: number;
  intelligenceScore: number;
  factors: ArchitectFactor[];
  knowledge: Array<{ key: string; glyph: string; label: string; value: number }>;
  usage: ArchitectUsage | null;
}

/** Latest /api/architect payload (null until first successful load). */
export const architectAge = writable<ArchitectAge | null>(null);

/** Whether the age & intelligence popup is open. */
export const architectAgeOpen = writable(false);

/** Fetch /api/architect and refresh the store (best-effort; leaves existing value on failure). */
export async function refreshArchitectAge(): Promise<void> {
  try {
    const r = await fetch('/api/architect');
    const d = await r.json();
    if (d && d.ok) architectAge.set(d as ArchitectAge);
  } catch {
    /* keep the last known value */
  }
}
