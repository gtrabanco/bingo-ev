import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://bingo.gruxon.com',
  compressHTML: true,

  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },

  vite: {
    plugins: [tailwindcss()],
    define: {
      // Astro's internal JSON logger uses process.stderr/stdout; workerd has no process.
      // These stubs let the logger write via console so render errors surface properly.
      'process.stderr': '({ write: function(s) { try { console.error(s); } catch(e) {} } })',
      'process.stdout': '({ write: function(s) { try { console.log(s); } catch(e) {} } })',
    },
  },

  adapter: cloudflare()
});