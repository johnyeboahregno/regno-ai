import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    host: true
  },
  ssr: {
    // Bundle the @regno workspace packages (they export TS source) into the
    // server build so the deployed app doesn't need them resolved at runtime.
    noExternal: ['@regno/*']
  }
});
