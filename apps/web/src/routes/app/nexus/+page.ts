import { redirect } from '@sveltejs/kit';

// The knowledge-search dashboard was renamed from "Nexus" to "Oracle".
// Redirect old bookmarks/links to the new route.
export function load() {
  throw redirect(301, '/app/oracle');
}
