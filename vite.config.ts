import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'node:path'
import { cp, rm, access } from 'node:fs/promises'

// The site is now hand-written static HTML: index.html is the Agent Teardown
// homepage, plus two legal pages. No React entry point remains, so the React
// and Tailwind plugins are gone and `vite build` simply processes these five
// documents and copies public/ across. The previous React app is preserved on
// the backup/live-site-v1 branch.

// Publish the ScrollCraft demo at /demo/ without duplicating its ~58MB of assets
// in the repo. The demo's single source of truth stays in scrollcraft/builds/quvlo/
// (not a vite input); this copies it into the build output during `vite build`, so
// any build command (npm run build or bare vite build) picks it up. The demo is
// noindex and served only at /demo/ — it does not touch the homepage or any route.
function copyDemo(): Plugin {
  const SRC = resolve(__dirname, 'scrollcraft/builds/quvlo')
  return {
    name: 'copy-scrollcraft-demo',
    apply: 'build',
    async closeBundle() {
      try { await access(SRC) } catch { this.warn(`[copy-demo] source missing, skipped: ${SRC}`); return }
      const DEST = resolve(__dirname, 'dist/demo')
      await rm(DEST, { recursive: true, force: true })
      await cp(SRC, DEST, {
        recursive: true,
        // skip local render scratch and dev-only files — not needed to view the demo
        filter: (src) =>
          !/[\\/]out([\\/]|$)/.test(src) &&
          !/[\\/]tokens[\\/]/.test(src) &&
          !/[\\/](make-posters\.mjs|generate-leg2\.sh|BRIEF\.md)$/.test(src),
      })
      this.info?.('[copy-demo] published demo -> dist/demo')
    },
  }
}

export default defineConfig({
  plugins: [copyDemo()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        notfound: resolve(__dirname, '404.html'),
        thankyou: resolve(__dirname, 'thank-you.html'),
      },
    },
  },
})
