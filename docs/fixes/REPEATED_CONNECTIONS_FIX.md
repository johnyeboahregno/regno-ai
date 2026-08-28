# Repeated MongoDB Connections Fix

## The Problem

You're seeing repeated MongoDB connection logs:
```
🔌 Connecting to MongoDB at db3.regnocloud.com:57017...
✅ Connected to MongoDB, listing collections...
📋 Found 15 collections
```

This happens **3 times** on every page load because:

1. **Server-Side Rendering (SSR)** - Code runs on server during initial page render
2. **Page Reload/HMR** - Vite hot module replacement triggers another run
3. **Client-Side Hydration** - Code runs again in browser to "hydrate" the page

Plus you get this warning:
```
Avoid calling `fetch` eagerly during server-side rendering — put your `fetch` calls inside `onMount` or a `load` function instead
```

## The Solution

### Option 1: Use `browser` Check (Quick Fix)

Wrap any fetch calls or $effect blocks that make API calls with a browser check:

```typescript
import { browser } from '$app/environment';

$effect(() => {
  if (!browser) return; // Skip during SSR

  // Your fetch/API calls here
  if (editedConfig.credentialId) {
    loadCollections();
  }
});
```

### Option 2: Use `onMount` (Recommended)

Move fetch calls into `onMount` lifecycle hook, which only runs in the browser:

```typescript
import { onMount } from 'svelte';

onMount(() => {
  // Fetch calls here - guaranteed to only run in browser
  if (editedConfig.credentialId) {
    loadCollections();
  }
});
```

### Option 3: Use `+page.ts` Load Function (Best Practice)

For data that needs to be available on page load, use SvelteKit's load function:

```typescript
// src/routes/your-page/+page.ts
export const load = async ({ fetch }) => {
  const collections = await fetch('/api/credentials/mongodb/...');
  return {
    collections: await collections.json()
  };
};
```

## Where to Apply

Based on your logs, the repeated connections are from collection loading. Look for:

### In DataSourceConfigSection.svelte

Find `$effect` blocks that fetch collections and add browser checks:

```typescript
$effect(() => {
  if (!browser) return; // Add this line

  if (editedConfig.credentialId && editedConfig.sourceType === 'mongo') {
    // Fetch collections
  }
});
```

### In any component making API calls

Search for:
- `$effect(() => { ... fetch(...) ... })`
- Code at module level that calls `fetch`
- Functions called immediately when component loads

Add browser checks or move to `onMount`.

## Quick Test

After applying fixes, you should see the connection logs only **ONCE** when you open the page, not 3 times.

## Why This Matters

1. **Performance** - 3x unnecessary database connections slow down your app
2. **Server Load** - SSR connections add server-side overhead
3. **Best Practices** - SvelteKit warns against SSR fetches for good reason
4. **Resource Usage** - Each connection uses database resources

## Need Help?

The fix is straightforward but may require checking multiple $effect blocks in DataSourceConfigSection.svelte. Would you like me to make these changes for you?
