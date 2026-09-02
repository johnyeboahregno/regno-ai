import { writable } from 'svelte/store';

// Architect wizard open/close state — mirrors the store pattern in lib/architectAge.ts.
export const wizardOpen = writable(false);

export function openWizard() {
  wizardOpen.set(true);
}

export function closeWizard() {
  wizardOpen.set(false);
}
