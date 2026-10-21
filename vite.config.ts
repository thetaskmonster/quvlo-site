import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// The site is hand-written static HTML: the One Roof homepage plus the legal and utility
// pages. public/ is copied as-is (fonts, the model's image sequences under /model/, the
// Studio Work pieces under /work/, and the homepage's CSS and JS under /assets/).
// The previous site (the Agent Teardown homepage, its /demo and the package checkout) lives
// on the backup/agent-teardown-site branch and in archive/old-site/; none of it is built.
export default defineConfig({
  build: {
    sourcemap: false,
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
